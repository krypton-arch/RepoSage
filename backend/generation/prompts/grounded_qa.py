"""Grounded QA prompt template — structures the query with retrieved context."""

GROUNDED_QA_TEMPLATE = """## Source Context

{context}

## Question

{question}

## Instructions

Answer the question using ONLY the source context above. Cite sources as [1], [2], etc. corresponding to the Source numbers in the context. If evidence is insufficient, say so clearly. Be concise, technical, and direct."""
