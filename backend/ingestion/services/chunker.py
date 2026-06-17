"""Chunker — splits parsed sections into appropriately sized chunks with metadata."""

from dataclasses import dataclass, field
from ingestion.services.parser import ParsedSection


@dataclass
class Chunk:
    """A chunk ready for embedding and storage."""
    content: str
    chunk_index: int
    chunk_type: str  # 'code', 'markdown', 'text', 'config', 'docstring'
    heading_context: str = ''
    symbol_context: str = ''
    start_line: int = 0
    end_line: int = 0
    token_count: int = 0
    char_count: int = 0
    metadata: dict = field(default_factory=dict)


def estimate_tokens(text: str) -> int:
    """Rough token count estimation (~4 chars per token for code, ~3.5 for English)."""
    # Simple heuristic: split on whitespace and punctuation
    words = text.split()
    return max(1, int(len(words) * 1.3))


def chunk_sections(
    sections: list[ParsedSection],
    file_type: str,
    file_path: str,
    language: str,
    max_tokens: int = 500,
    overlap_tokens: int = 50,
) -> list[Chunk]:
    """Split parsed sections into chunks of appropriate size.

    Strategy:
    - If a section fits within max_tokens, keep it as one chunk.
    - If a section is too large, split it with overlap.
    - Attach rich metadata to every chunk.
    """
    chunks = []
    chunk_index = 0

    # Determine chunk type from file type
    chunk_type_map = {
        'code': 'code',
        'markdown': 'markdown',
        'text': 'text',
        'config': 'config',
    }
    base_chunk_type = chunk_type_map.get(file_type, 'text')

    for section in sections:
        token_count = estimate_tokens(section.content)

        if token_count <= max_tokens:
            # Section fits in one chunk
            chunk = _create_chunk(
                content=section.content,
                chunk_index=chunk_index,
                chunk_type=base_chunk_type,
                section=section,
                file_path=file_path,
                language=language,
            )
            chunks.append(chunk)
            chunk_index += 1
        else:
            # Section needs splitting
            sub_chunks = _split_large_section(
                section=section,
                chunk_type=base_chunk_type,
                file_path=file_path,
                language=language,
                max_tokens=max_tokens,
                overlap_tokens=overlap_tokens,
                start_index=chunk_index,
            )
            chunks.extend(sub_chunks)
            chunk_index += len(sub_chunks)

    return chunks


def _create_chunk(
    content: str,
    chunk_index: int,
    chunk_type: str,
    section: ParsedSection,
    file_path: str,
    language: str,
) -> Chunk:
    """Create a Chunk from a ParsedSection."""
    return Chunk(
        content=content,
        chunk_index=chunk_index,
        chunk_type=chunk_type,
        heading_context=section.heading_context,
        symbol_context=section.symbol_context,
        start_line=section.start_line,
        end_line=section.end_line,
        token_count=estimate_tokens(content),
        char_count=len(content),
        metadata={
            **section.metadata,
            'file_path': file_path,
            'language': language,
            'section_type': section.section_type,
        },
    )


def _split_large_section(
    section: ParsedSection,
    chunk_type: str,
    file_path: str,
    language: str,
    max_tokens: int,
    overlap_tokens: int,
    start_index: int,
) -> list[Chunk]:
    """Split a large section into overlapping chunks."""
    chunks = []
    lines = section.content.split('\n')
    total_lines = len(lines)

    # Estimate tokens per line (for proportional splitting)
    total_tokens = estimate_tokens(section.content)
    tokens_per_line = max(1, total_tokens / max(1, total_lines))
    lines_per_chunk = max(5, int(max_tokens / tokens_per_line))
    overlap_lines = max(2, int(overlap_tokens / tokens_per_line))

    current_start = 0
    chunk_index = start_index

    while current_start < total_lines:
        chunk_end = min(current_start + lines_per_chunk, total_lines)
        chunk_lines = lines[current_start:chunk_end]
        chunk_content = '\n'.join(chunk_lines).strip()

        if chunk_content:
            # Calculate actual line numbers in original file
            actual_start_line = section.start_line + current_start
            actual_end_line = section.start_line + chunk_end - 1

            chunks.append(Chunk(
                content=chunk_content,
                chunk_index=chunk_index,
                chunk_type=chunk_type,
                heading_context=section.heading_context,
                symbol_context=section.symbol_context,
                start_line=actual_start_line,
                end_line=actual_end_line,
                token_count=estimate_tokens(chunk_content),
                char_count=len(chunk_content),
                metadata={
                    **section.metadata,
                    'file_path': file_path,
                    'language': language,
                    'section_type': section.section_type,
                    'is_split': True,
                    'split_part': chunk_index - start_index,
                },
            ))
            chunk_index += 1

        # Move forward with overlap
        current_start = chunk_end - overlap_lines
        if current_start >= total_lines or chunk_end >= total_lines:
            break

    return chunks
