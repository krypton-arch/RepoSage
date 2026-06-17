# Retrieval and Reranking

RepoSage supports advanced, customizable search strategies to retrieve the most relevant code chunks for a given query. Retrieval settings can be configured per-project.

## Supported Retrieval Modes

1. **Vector Search (`vector`)**: Pure semantic search using pgvector cosine similarity.
2. **Lexical Search (`lexical`)**: Keyword-based search using PostgreSQL's native full-text search (`SearchVector`).
3. **Hybrid Search (`hybrid`)**: Executes both Vector and Lexical searches, combining their results.
4. **Reciprocal Rank Fusion (`rrf`)**: An advanced hybrid approach that combines the *ranks* of chunks from both vector and lexical searches to yield a superior combined ordering.

## Cross-Encoder Reranking

After initial retrieval (fetching the top `K` candidates), the results are passed through a Cross-Encoder Reranker.
*   Unlike standard embedding models (Bi-encoders) that embed the query and document separately, a Cross-Encoder evaluates the query and the document *together*, outputting a highly accurate relevance score.
*   The `retrieval.services.reranker` module resorts the candidates based on these cross-encoder scores before they are sent to the LLM.

## Access Control (ACL)

All retrieval operations are strictly scoped by `common.acl`. The `get_visible_chunks_queryset()` ensures that a user or session can only retrieve vectors belonging to projects they are authorized to access.
