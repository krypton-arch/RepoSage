from unittest.mock import patch

from django.test import TestCase

from common.acl import get_visible_chunks_queryset
from ingestion.models import SourceDocument, DocumentChunk
from projects.models import Project
from retrieval.services.strategy import HybridStrategy, reciprocal_rank_fusion


class StrategyMathTests(TestCase):
    def test_reciprocal_rank_fusion(self):
        """Test the RRF scoring math combines ranks correctly."""
        # Setup mock results. 
        # k=60 by default. 
        # Score = 1 / (k + rank)
        
        vector_results = [
            {'chunk_id': 'c1', 'content': 'foo'},  # rank 1
            {'chunk_id': 'c2', 'content': 'bar'},  # rank 2
        ]
        lexical_results = [
            {'chunk_id': 'c2', 'content': 'bar'},  # rank 1
            {'chunk_id': 'c3', 'content': 'baz'},  # rank 2
        ]
        
        # k=60
        # c1 score: 1/61
        # c2 score: 1/62 + 1/61
        # c3 score: 1/62
        
        merged = reciprocal_rank_fusion(vector_results, lexical_results, k=60)
        
        # Should return all 3, ranked by rrf_score descending.
        # c2 has the highest score
        self.assertEqual(len(merged), 3)
        self.assertEqual(merged[0]['chunk_id'], 'c2')
        self.assertEqual(merged[1]['chunk_id'], 'c1')
        self.assertEqual(merged[2]['chunk_id'], 'c3')
        
        # Verify method augmentation
        for res in merged:
            self.assertEqual(res['retrieval_method'], 'hybrid')
            self.assertIn('rrf_score', res)


class HybridStrategyTests(TestCase):
    @patch('retrieval.services.strategy.LexicalStrategy.search')
    @patch('retrieval.services.strategy.VectorStrategy.search')
    def test_hybrid_search_delegation(self, mock_vector, mock_lexical):
        """Test that HybridStrategy delegates to both and fuses results."""
        mock_vector.return_value = ([{'chunk_id': 'c1'}], 10.0)
        mock_lexical.return_value = ([{'chunk_id': 'c2'}], 5.0)
        
        strategy = HybridStrategy()
        results, time_ms = strategy.search(project_id="proj_1", query="test", top_k=5)
        
        # Time should be sum
        self.assertEqual(time_ms, 15.0)
        
        # Both c1 and c2 should be in results
        self.assertEqual(len(results), 2)
        chunk_ids = [r['chunk_id'] for r in results]
        self.assertIn('c1', chunk_ids)
        self.assertIn('c2', chunk_ids)


class ACLTests(TestCase):
    def setUp(self):
        self.project1 = Project.objects.create(name="Project 1")
        self.project2 = Project.objects.create(name="Project 2")
        
        self.doc1 = SourceDocument.objects.create(project=self.project1, file_path="test1.py")
        self.doc2 = SourceDocument.objects.create(project=self.project2, file_path="test2.py")
        
        # Create chunks
        self.chunk1 = DocumentChunk.objects.create(
            project=self.project1, document=self.doc1, content="foo", is_stale=False,
            embedding=[0.1] * 384, chunk_index=0
        )
        self.chunk2 = DocumentChunk.objects.create(
            project=self.project2, document=self.doc2, content="bar", is_stale=False,
            embedding=[0.2] * 384, chunk_index=1
        )
        self.chunk1_stale = DocumentChunk.objects.create(
            project=self.project1, document=self.doc1, content="stale", is_stale=True,
            embedding=[0.3] * 384, chunk_index=2
        )

    def test_get_visible_chunks_queryset(self):
        """Test that only non-stale chunks for the requested project are visible."""
        qs1 = get_visible_chunks_queryset(str(self.project1.id))
        
        # Should only get chunk1 (project1, not stale)
        self.assertEqual(qs1.count(), 1)
        self.assertEqual(qs1.first().id, self.chunk1.id)
        
        qs2 = get_visible_chunks_queryset(str(self.project2.id))
        self.assertEqual(qs2.count(), 1)
        self.assertEqual(qs2.first().id, self.chunk2.id)
