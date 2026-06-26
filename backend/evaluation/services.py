import json
import logging
from generation.services import get_generation_provider

logger = logging.getLogger(__name__)

EVALUATION_PROMPT = """
You are an expert evaluator assessing the quality of an AI-generated answer for a code repository QA system.

## Task
Evaluate the generated answer based on Groundedness and Usefulness.

## Inputs
Question: {question}
Expected Traits/Assertions: {expected_traits}
Generated Answer: {generated_answer}
Retrieved Context Snippets:
{context}

## Criteria
1. Groundedness: How well is the answer supported by the retrieved context snippets? 
   - "ungrounded": Completely hallucinated or contradicts context
   - "partially_grounded": Partially supported, some claims unverified
   - "grounded": Fully supported by the provided context

2. Usefulness: How well does the answer address the user's question and meet the expected traits?
   - "not_useful": Misses the point entirely or fails expected traits
   - "partially_useful": Somewhat useful, but misses key aspects or some expected traits
   - "useful": Highly useful, directly answers the question and meets all expected traits

## Output Format
Respond ONLY with a valid JSON object matching this schema exactly:
{{
  "groundedness": "grounded" | "partially_grounded" | "ungrounded",
  "usefulness": "useful" | "partially_useful" | "not_useful",
  "justification": "<string explaining the scores>"
}}
"""

def evaluate_run_answer(question: str, expected_traits: str, generated_answer: str, retrieved_chunks: list[dict]) -> dict:
    """Uses the LLM to score groundedness and usefulness."""
    provider = get_generation_provider()
    if provider is None:
        return {'groundedness': 'unrated', 'usefulness': 'unrated', 'notes': 'No generation provider available.'}

    # Extract text from chunks, limit to 5 to avoid blowing up the context window for evaluation
    context_texts = [chunk.get('content', '') for chunk in retrieved_chunks[:5]]
    context_str = "\n---\n".join(context_texts)
    
    prompt = EVALUATION_PROMPT.format(
        question=question,
        expected_traits=expected_traits or "None specified.",
        generated_answer=generated_answer,
        context=context_str
    )

    try:
        result = provider.generate(prompt=prompt, system_prompt="You are an expert JSON evaluator. Output valid JSON only.")
        
        text = result.text.strip()
        if text.startswith("```json"):
            text = text[7:]
        if text.startswith("```"):
            text = text[3:]
        if text.endswith("```"):
            text = text[:-3]
        
        data = json.loads(text.strip())
        
        # Validate choices
        groundedness = data.get('groundedness', 'unrated')
        usefulness = data.get('usefulness', 'unrated')
        if groundedness not in ['grounded', 'partially_grounded', 'ungrounded']:
            groundedness = 'unrated'
        if usefulness not in ['useful', 'partially_useful', 'not_useful']:
            usefulness = 'unrated'
            
        return {
            'groundedness': groundedness,
            'usefulness': usefulness,
            'notes': data.get('justification', '')
        }
    except Exception as e:
        logger.error(f"Failed to evaluate answer: {e}")
        return {
            'groundedness': 'unrated',
            'usefulness': 'unrated',
            'notes': f'Evaluation failed to parse output: {str(e)}'
        }
