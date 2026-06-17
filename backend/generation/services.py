"""Generation service — orchestrates retrieval → context assembly → LLM generation.

Upgraded with:
- TraceContext for per-stage timing and observability
- Retrieval strategy abstraction (vector/hybrid/lexical per project)
- Generation metadata capture (model, tokens, config)
- Retrieval quality metrics (avg/max/min/std similarity)
"""

import re
import math
import logging
from django.conf import settings

from generation.providers.base import GenerationProvider, GenerationResult
from generation.providers.ollama import OllamaGenerationProvider
from generation.prompts.system import SYSTEM_PROMPT
from generation.prompts.grounded_qa import GROUNDED_QA_TEMPLATE
from retrieval.services.strategy import get_strategy
from retrieval.services.context_assembler import assemble_context
from retrieval.services.reranker import rerank
from common.tracing import TraceContext

logger = logging.getLogger(__name__)

# Singleton provider
_provider_instance: GenerationProvider | None = None


def get_generation_provider() -> GenerationProvider:
    """Get the configured generation provider (singleton)."""
    global _provider_instance
    if _provider_instance is not None:
        return _provider_instance

    provider_type = getattr(settings, 'GENERATION_PROVIDER', 'ollama')
    model_name = getattr(settings, 'GENERATION_MODEL', 'mistral')
    base_url = getattr(settings, 'OLLAMA_BASE_URL', 'http://localhost:11434')

    if provider_type == 'ollama':
        _provider_instance = OllamaGenerationProvider(model_name=model_name, base_url=base_url)
    elif provider_type == 'none':
        _provider_instance = None
    else:
        raise ValueError(f"Unknown generation provider: {provider_type}")

    return _provider_instance


def _estimate_tokens(text: str) -> int:
    """Rough token estimate: word count * 1.3."""
    return int(len(text.split()) * 1.3)


def _compute_retrieval_metrics(chunks: list[dict]) -> dict:
    """Compute retrieval quality metrics from similarity scores."""
    if not chunks:
        return {
            'avg_similarity_score': None,
            'max_similarity_score': None,
            'min_similarity_score': None,
            'score_std_dev': None,
        }

    scores = [c['similarity_score'] for c in chunks if 'similarity_score' in c]
    if not scores:
        return {
            'avg_similarity_score': None,
            'max_similarity_score': None,
            'min_similarity_score': None,
            'score_std_dev': None,
        }

    avg = sum(scores) / len(scores)
    variance = sum((s - avg) ** 2 for s in scores) / len(scores) if len(scores) > 1 else 0.0

    return {
        'avg_similarity_score': round(avg, 4),
        'max_similarity_score': round(max(scores), 4),
        'min_similarity_score': round(min(scores), 4),
        'score_std_dev': round(math.sqrt(variance), 4),
    }


def generate_answer(project_id: str, question: str, top_k: int = 10) -> dict:
    """Full query pipeline: retrieve → rerank → assemble → generate → format.

    Uses the project's configured retrieval mode and context budget.
    Returns a dict with answer, citations, retrieved chunks, timing,
    trace info, and retrieval quality metrics.
    """
    trace = TraceContext(operation='query')

    # Resolve project retrieval settings
    from projects.models import Project
    try:
        project = Project.objects.get(id=project_id)
        retrieval_mode = project.retrieval_mode or 'vector'
        max_context_tokens = project.max_context_tokens or 3000
    except Project.DoesNotExist:
        retrieval_mode = getattr(settings, 'RETRIEVAL_MODE', 'vector')
        max_context_tokens = 3000

    # Step 1: Retrieve similar chunks via strategy
    with trace.stage('retrieval'):
        strategy = get_strategy(retrieval_mode)
        retrieved_chunks, retrieval_time_ms = strategy.search(
            project_id=project_id,
            query=question,
            top_k=top_k,
        )

    # Step 2: Rerank (currently passthrough unless cross_encoder configured)
    with trace.stage('rerank'):
        reranked_chunks = rerank(question, retrieved_chunks, top_k=top_k)

    # Step 3: Assemble context (using project's max_context_tokens)
    with trace.stage('assemble'):
        context = assemble_context(reranked_chunks, max_context_tokens=max_context_tokens)

    # Step 4: Generate answer
    provider = get_generation_provider()
    generation_time_ms = 0.0
    answer_text = ''
    generation_model = ''
    prompt_text = ''

    with trace.stage('generation'):
        if provider is not None and context:
            prompt_text = GROUNDED_QA_TEMPLATE.format(
                context=context,
                question=question,
            )
            result = provider.generate(prompt=prompt_text, system_prompt=SYSTEM_PROMPT)
            answer_text = result.text
            generation_time_ms = result.generation_time_ms
            generation_model = provider.model_name
        elif not context:
            answer_text = (
                "No relevant sources were found in the indexed repository for this question. "
                "Try rephrasing or ensuring the relevant files have been ingested."
            )

    # Step 5: Extract citation references from the answer
    citation_indices = set(int(m) for m in re.findall(r'\[(\d+)\]', answer_text))

    # Mark which chunks were cited
    for i, chunk in enumerate(reranked_chunks):
        chunk['used_in_answer'] = (i + 1) in citation_indices
        chunk['rank'] = i + 1

    # Build citations list (only cited chunks)
    citations = [
        {
            'index': i + 1,
            'chunk_id': chunk['chunk_id'],
            'file_path': chunk['file_path'],
            'content_preview': chunk['content'][:200],
            'similarity_score': chunk['similarity_score'],
            'chunk_type': chunk['chunk_type'],
            'heading_context': chunk.get('heading_context', ''),
            'symbol_context': chunk.get('symbol_context', ''),
        }
        for i, chunk in enumerate(reranked_chunks)
        if chunk['used_in_answer']
    ]

    # Determine confidence level
    confidence = _assess_confidence(reranked_chunks, citation_indices)

    # Compute retrieval quality metrics
    retrieval_metrics = _compute_retrieval_metrics(reranked_chunks)

    # Compute token estimates
    embedding_model = getattr(settings, 'EMBEDDING_MODEL', 'all-MiniLM-L6-v2')
    prompt_token_estimate = _estimate_tokens(prompt_text) if prompt_text else 0
    context_token_estimate = _estimate_tokens(context) if context else 0

    return {
        # Original fields
        'answer': answer_text,
        'confidence_level': confidence,
        'retrieval_time_ms': round(retrieval_time_ms, 1),
        'generation_time_ms': round(generation_time_ms, 1),
        'chunks_retrieved': len(reranked_chunks),
        'chunks_used': len(citations),
        'citations': citations,
        'retrieved_chunks': reranked_chunks,
        'raw_context': context,
        # Trace + observability
        'trace_id': trace.trace_id,
        # Retrieval config
        'retrieval_mode': retrieval_mode,
        # Generation metadata
        'generation_model': generation_model,
        'embedding_model': embedding_model,
        'prompt_token_estimate': prompt_token_estimate,
        'context_token_estimate': context_token_estimate,
        # Retrieval quality metrics
        **retrieval_metrics,
    }


def _assess_confidence(chunks: list[dict], citation_indices: set[int]) -> str:
    """Assess answer confidence based on retrieval scores and citation coverage."""
    if not chunks:
        return 'insufficient'

    top_scores = [c['similarity_score'] for c in chunks[:3]]
    avg_top_score = sum(top_scores) / len(top_scores) if top_scores else 0

    if len(citation_indices) >= 2 and avg_top_score > 0.75:
        return 'high'
    elif len(citation_indices) >= 1 and avg_top_score > 0.6:
        return 'medium'
    elif avg_top_score > 0.5:
        return 'low'
    else:
        return 'insufficient'
