"""Context assembler — formats retrieved chunks into structured context for the LLM."""


def assemble_context(retrieved_chunks: list[dict], max_context_tokens: int = 3000) -> str:
    """Assemble retrieved chunks into a structured context string.

    Each chunk is formatted with its source metadata for citation tracking.
    """
    context_parts = []
    total_tokens = 0

    for i, chunk in enumerate(retrieved_chunks, 1):
        # Build source header
        source_header = f"[Source {i}: {chunk['file_path']}"
        if chunk.get('start_line') and chunk.get('end_line'):
            source_header += f" (lines {chunk['start_line']}-{chunk['end_line']}"
        if chunk.get('similarity_score'):
            source_header += f", similarity: {chunk['similarity_score']:.2f}"
        source_header += ")]"

        if chunk.get('symbol_context'):
            source_header += f"\n// Symbol: {chunk['symbol_context']}"
        if chunk.get('heading_context'):
            source_header += f"\n// Section: {chunk['heading_context']}"

        chunk_text = f"{source_header}\n{chunk['content']}"

        # Rough token estimate
        chunk_tokens = len(chunk_text.split()) * 1.3
        if total_tokens + chunk_tokens > max_context_tokens:
            break

        context_parts.append(chunk_text)
        total_tokens += chunk_tokens

    return '\n\n---\n\n'.join(context_parts)
