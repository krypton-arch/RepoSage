import unittest
from .services.parser import parse_markdown, parse_plain_text, parse_code_generic, ParsedSection
from .services.chunker import chunk_sections

class TestParser(unittest.TestCase):
    def test_parse_plain_text(self):
        text = "This is line 1.\nThis is line 2."
        sections = parse_plain_text(text)
        self.assertEqual(len(sections), 1)
        self.assertEqual(sections[0].content, text)
        self.assertEqual(sections[0].section_type, 'paragraph')
        self.assertEqual(sections[0].start_line, 1)
        self.assertEqual(sections[0].end_line, 2)

    def test_parse_markdown(self):
        md = "# Heading 1\nContent 1\n## Heading 2\nContent 2"
        sections = parse_markdown(md)
        self.assertEqual(len(sections), 2)
        
        self.assertEqual(sections[0].heading_context, "Heading 1")
        self.assertTrue("Content 1" in sections[0].content)
        
        self.assertEqual(sections[1].heading_context, "Heading 1 > Heading 2")
        self.assertTrue("Content 2" in sections[1].content)

    def test_parse_code_generic(self):
        code = "def foo():\n    pass\n\ndef bar():\n    pass"
        sections = parse_code_generic(code, "test.py", "python")
        # parse_code_generic splits by blank lines for non-python, but we force language python here and it still splits by blank lines
        self.assertEqual(len(sections), 2)
        self.assertTrue("def foo():" in sections[0].content)
        self.assertTrue("def bar():" in sections[1].content)

class TestChunker(unittest.TestCase):
    def test_chunk_sections(self):
        text = "word \n" * 100
        section = ParsedSection(content=text, section_type="text")
        chunks = chunk_sections([section], "text", "test.txt", "text", max_tokens=50, overlap_tokens=10)
        self.assertGreater(len(chunks), 1)
        self.assertTrue(len(chunks[0].content.split()) <= 60)

    def test_chunk_sections_small(self):
        text = "Hello world"
        section = ParsedSection(content=text, section_type="text")
        chunks = chunk_sections([section], "text", "test.txt", "text", max_tokens=50, overlap_tokens=10)
        self.assertEqual(len(chunks), 1)
        self.assertEqual(chunks[0].content, "Hello world")

if __name__ == '__main__':
    unittest.main()
