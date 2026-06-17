"""Parsers for different file types — markdown, Python (AST), and generic code/text."""

import ast
import re
from dataclasses import dataclass, field
from pathlib import Path


@dataclass
class ParsedSection:
    """A section of content extracted from a file."""
    content: str
    section_type: str  # 'heading', 'function', 'class', 'module', 'paragraph', 'block'
    heading_context: str = ''
    symbol_context: str = ''
    start_line: int = 0
    end_line: int = 0
    metadata: dict = field(default_factory=dict)


def parse_file(file_path: str, content: str, language: str) -> list[ParsedSection]:
    """Route parsing based on file type/language."""
    if language == 'markdown':
        return parse_markdown(content)
    elif language == 'python':
        return parse_python(content, file_path)
    elif language in ('javascript', 'typescript', 'java', 'kotlin', 'rust', 'go', 'cpp', 'c', 'csharp'):
        return parse_code_generic(content, file_path, language)
    else:
        return parse_plain_text(content)


def parse_markdown(content: str) -> list[ParsedSection]:
    """Parse markdown by heading boundaries, preserving heading hierarchy."""
    sections = []
    lines = content.split('\n')
    current_section_lines = []
    current_heading = ''
    heading_stack = []  # [(level, heading_text)]
    section_start = 1

    for i, line in enumerate(lines, 1):
        heading_match = re.match(r'^(#{1,6})\s+(.+)$', line)

        if heading_match:
            # Flush previous section
            if current_section_lines:
                section_content = '\n'.join(current_section_lines).strip()
                if section_content:
                    sections.append(ParsedSection(
                        content=section_content,
                        section_type='heading',
                        heading_context=current_heading,
                        start_line=section_start,
                        end_line=i - 1,
                    ))

            # Update heading stack
            level = len(heading_match.group(1))
            heading_text = heading_match.group(2).strip()

            # Pop headings at same or deeper level
            while heading_stack and heading_stack[-1][0] >= level:
                heading_stack.pop()
            heading_stack.append((level, heading_text))

            # Build full heading context
            current_heading = ' > '.join(h[1] for h in heading_stack)
            current_section_lines = [line]
            section_start = i
        else:
            current_section_lines.append(line)

    # Flush last section
    if current_section_lines:
        section_content = '\n'.join(current_section_lines).strip()
        if section_content:
            sections.append(ParsedSection(
                content=section_content,
                section_type='heading',
                heading_context=current_heading,
                start_line=section_start,
                end_line=len(lines),
            ))

    # If no headings found, treat as plain text
    if not sections and content.strip():
        sections.append(ParsedSection(
            content=content.strip(),
            section_type='paragraph',
            start_line=1,
            end_line=len(lines),
        ))

    return sections


def parse_python(content: str, file_path: str) -> list[ParsedSection]:
    """Parse Python using AST to extract classes, functions, and module-level code."""
    sections = []
    lines = content.split('\n')

    try:
        tree = ast.parse(content)
    except SyntaxError:
        # Fallback to generic code parsing
        return parse_code_generic(content, file_path, 'python')

    # Collect all top-level nodes with their line ranges
    nodes = []
    for node in ast.iter_child_nodes(tree):
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            end_line = _get_end_line(node, lines)
            docstring = ast.get_docstring(node) or ''
            decorators = [_get_decorator_name(d) for d in node.decorator_list]
            nodes.append({
                'type': 'function',
                'name': node.name,
                'start': node.lineno,
                'end': end_line,
                'docstring': docstring,
                'decorators': decorators,
            })
        elif isinstance(node, ast.ClassDef):
            end_line = _get_end_line(node, lines)
            docstring = ast.get_docstring(node) or ''
            methods = [n.name for n in ast.iter_child_nodes(node)
                      if isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef))]
            nodes.append({
                'type': 'class',
                'name': node.name,
                'start': node.lineno,
                'end': end_line,
                'docstring': docstring,
                'methods': methods,
            })

    # Extract module-level code (imports, constants, etc.)
    if nodes:
        first_node_start = min(n['start'] for n in nodes)
        if first_node_start > 1:
            module_code = '\n'.join(lines[:first_node_start - 1]).strip()
            if module_code:
                sections.append(ParsedSection(
                    content=module_code,
                    section_type='module',
                    symbol_context='module-level',
                    start_line=1,
                    end_line=first_node_start - 1,
                    metadata={'type': 'module_header'},
                ))

    # Extract each function/class
    for node_info in nodes:
        node_content = '\n'.join(lines[node_info['start'] - 1:node_info['end']])
        metadata = {'type': node_info['type']}

        if node_info['type'] == 'function':
            symbol = node_info['name']
            metadata['decorators'] = node_info.get('decorators', [])
        elif node_info['type'] == 'class':
            symbol = node_info['name']
            metadata['methods'] = node_info.get('methods', [])

        sections.append(ParsedSection(
            content=node_content,
            section_type=node_info['type'],
            symbol_context=symbol,
            start_line=node_info['start'],
            end_line=node_info['end'],
            metadata=metadata,
        ))

    # If nothing was extracted, return whole file
    if not sections and content.strip():
        sections.append(ParsedSection(
            content=content.strip(),
            section_type='block',
            start_line=1,
            end_line=len(lines),
        ))

    return sections


def _get_end_line(node, lines):
    """Get the end line of an AST node."""
    if hasattr(node, 'end_lineno') and node.end_lineno:
        return node.end_lineno
    # Fallback: find the last non-empty line
    return len(lines)


def _get_decorator_name(decorator):
    """Extract decorator name from AST node."""
    if isinstance(decorator, ast.Name):
        return decorator.id
    elif isinstance(decorator, ast.Attribute):
        return f"{_get_decorator_name(decorator.value)}.{decorator.attr}"
    elif isinstance(decorator, ast.Call):
        return _get_decorator_name(decorator.func)
    return str(decorator)


def parse_code_generic(content: str, file_path: str, language: str) -> list[ParsedSection]:
    """Generic code parser using regex patterns for function/class boundaries."""
    sections = []
    lines = content.split('\n')

    # Language-specific patterns for function/class boundaries
    patterns = {
        'javascript': r'^(?:export\s+)?(?:async\s+)?(?:function|class|const\s+\w+\s*=\s*(?:async\s+)?\(|(?:export\s+)?default\s+)',
        'typescript': r'^(?:export\s+)?(?:async\s+)?(?:function|class|interface|type|const\s+\w+\s*(?::\s*\w+)?\s*=|enum)',
        'java': r'^(?:\s*(?:public|private|protected|static|final|abstract)\s+)*(?:class|interface|enum|void|int|String|boolean|float|double|long|(?:\w+)\s+\w+\s*\()',
        'kotlin': r'^(?:\s*(?:fun|class|interface|object|data\s+class|sealed\s+class|enum\s+class))',
        'rust': r'^(?:\s*(?:pub\s+)?(?:fn|struct|enum|impl|trait|mod|type|const|static))',
        'go': r'^(?:\s*(?:func|type|var|const))',
        'cpp': r'^(?:\s*(?:class|struct|namespace|template|void|int|bool|auto|(?:\w+)\s+\w+\s*\())',
        'c': r'^(?:\s*(?:struct|typedef|void|int|char|float|double|(?:\w+)\s+\w+\s*\())',
        'csharp': r'^(?:\s*(?:public|private|protected|internal|static|abstract|sealed|partial)\s+)*(?:class|interface|struct|enum|void|int|string|bool|Task)',
    }

    boundary_pattern = patterns.get(language, r'^(?:function|class|def|struct|impl)')
    current_block_lines = []
    current_start = 1

    for i, line in enumerate(lines, 1):
        if re.match(boundary_pattern, line) and current_block_lines:
            # Flush previous block
            block_content = '\n'.join(current_block_lines).strip()
            if block_content:
                sections.append(ParsedSection(
                    content=block_content,
                    section_type='block',
                    start_line=current_start,
                    end_line=i - 1,
                    metadata={'language': language},
                ))
            current_block_lines = [line]
            current_start = i
        else:
            current_block_lines.append(line)

    # Flush last block
    if current_block_lines:
        block_content = '\n'.join(current_block_lines).strip()
        if block_content:
            sections.append(ParsedSection(
                content=block_content,
                section_type='block',
                start_line=current_start,
                end_line=len(lines),
                metadata={'language': language},
            ))

    return sections


def parse_plain_text(content: str) -> list[ParsedSection]:
    """Parse plain text by paragraph boundaries."""
    sections = []
    paragraphs = re.split(r'\n\s*\n', content)
    current_line = 1

    for para in paragraphs:
        para = para.strip()
        if not para:
            current_line += 2
            continue

        line_count = para.count('\n') + 1
        sections.append(ParsedSection(
            content=para,
            section_type='paragraph',
            start_line=current_line,
            end_line=current_line + line_count - 1,
        ))
        current_line += line_count + 1  # +1 for blank separator line

    return sections
