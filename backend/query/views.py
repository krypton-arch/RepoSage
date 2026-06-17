"""Query API views — ask questions and retrieve past queries."""

from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.shortcuts import get_object_or_404

from projects.models import Project
from query.models import QuerySession, RetrievedChunkLog
from query.serializers import QuerySessionSerializer, QuerySessionListSerializer, QueryInputSerializer
from generation.services import generate_answer
from ingestion.models import DocumentChunk


@api_view(['POST'])
def ask_question(request, project_id):
    """Ask a question about a project's codebase. Returns grounded answer with citations."""
    project = get_object_or_404(Project, pk=project_id)

    serializer = QueryInputSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    question = serializer.validated_data['question']
    top_k = serializer.validated_data.get('top_k', 10)

    # Run the full pipeline
    result = generate_answer(
        project_id=str(project.id),
        question=question,
        top_k=top_k,
    )

    # Store query session (including trace + observability fields)
    session = QuerySession.objects.create(
        project=project,
        question=question,
        answer=result['answer'],
        raw_context=result['raw_context'],
        retrieval_time_ms=result['retrieval_time_ms'],
        generation_time_ms=result['generation_time_ms'],
        chunks_retrieved=result['chunks_retrieved'],
        chunks_used=result['chunks_used'],
        confidence_level=result['confidence_level'],
        # Trace
        trace_id=result.get('trace_id'),
        # Retrieval config
        retrieval_mode=result.get('retrieval_mode', 'vector'),
        top_k_requested=top_k,
        # Generation metadata
        generation_model=result.get('generation_model', ''),
        embedding_model=result.get('embedding_model', ''),
        prompt_token_estimate=result.get('prompt_token_estimate', 0),
        context_token_estimate=result.get('context_token_estimate', 0),
        # Retrieval quality metrics
        avg_similarity_score=result.get('avg_similarity_score'),
        max_similarity_score=result.get('max_similarity_score'),
        min_similarity_score=result.get('min_similarity_score'),
        score_std_dev=result.get('score_std_dev'),
    )

    # Store retrieved chunk logs
    for chunk_data in result['retrieved_chunks']:
        try:
            chunk_obj = DocumentChunk.objects.get(pk=chunk_data['chunk_id'])
            RetrievedChunkLog.objects.create(
                query_session=session,
                chunk=chunk_obj,
                rank=chunk_data.get('rank', 0),
                similarity_score=chunk_data['similarity_score'],
                used_in_answer=chunk_data.get('used_in_answer', False),
            )
        except DocumentChunk.DoesNotExist:
            pass

    # Build response (includes observability fields)
    response_data = {
        'id': str(session.id),
        'question': question,
        'answer': result['answer'],
        'confidence_level': result['confidence_level'],
        'retrieval_time_ms': result['retrieval_time_ms'],
        'generation_time_ms': result['generation_time_ms'],
        'chunks_retrieved': result['chunks_retrieved'],
        'chunks_used': result['chunks_used'],
        'citations': result['citations'],
        'retrieved_chunks': result['retrieved_chunks'],
        # Trace
        'trace_id': str(session.trace_id),
        # Retrieval config
        'retrieval_mode': session.retrieval_mode,
        'top_k_requested': session.top_k_requested,
        # Generation metadata
        'generation_model': session.generation_model,
        'embedding_model': session.embedding_model,
        'prompt_token_estimate': session.prompt_token_estimate,
        'context_token_estimate': session.context_token_estimate,
        # Retrieval quality metrics
        'avg_similarity_score': session.avg_similarity_score,
        'max_similarity_score': session.max_similarity_score,
        'min_similarity_score': session.min_similarity_score,
        'score_std_dev': session.score_std_dev,
    }

    return Response(response_data, status=status.HTTP_200_OK)


@api_view(['GET'])
def list_queries(request, project_id):
    """List past queries for a project."""
    project = get_object_or_404(Project, pk=project_id)
    sessions = QuerySession.objects.filter(project=project)
    serializer = QuerySessionListSerializer(sessions, many=True)
    return Response(serializer.data)


@api_view(['GET'])
def get_query(request, project_id, query_id):
    """Get a specific query with full retrieval log."""
    session = get_object_or_404(QuerySession, pk=query_id, project_id=project_id)
    serializer = QuerySessionSerializer(session)
    return Response(serializer.data)
