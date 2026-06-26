# Evaluation Engine

RepoSage includes a built-in evaluation module to systematically test the RAG pipeline's quality, measure performance over time, and compare different configurations.

## `EvaluationCase`

Administrators define test cases (`EvaluationCase`) consisting of:
*   `question`: The prompt to test.
*   `expected_answer_traits`: What the answer must cover.
*   `expected_source_files`: The specific files the retriever *must* find to answer correctly.
*   `benchmark_suite` & `tags`: For categorizing runs.

## `EvaluationRun`

When an evaluation batch is executed, the system runs the query pipeline for every case and generates an `EvaluationRun`.
Each run captures:
*   **Snapshot Configuration**: The exact retrieval mode, top K, and embedding model versions used during the run (`run_config`).
*   **Precision & Recall**: Calculates retrieval precision (how many retrieved files were relevant) and recall (how many of the expected files were successfully retrieved).
*   **Split Latencies**: Logs isolated retrieval vs. generation latencies.
*   **LLM-as-a-Judge Ratings**: Automatically uses the configured LLM to evaluate the generated response across two qualitative axes:
    *   **Groundedness** (`POOR`, `FAIR`, `GOOD`, `EXCELLENT`): Measures if the answer was strictly derived from the retrieved context without hallucination.
    *   **Usefulness** (`POOR`, `FAIR`, `GOOD`, `EXCELLENT`): Measures if the answer directly and helpfully addressed the original question.

## Deletion and Management

Administrators can maintain the evaluation suite by deleting stale or irrelevant runs and cases.
*   Deleting an `EvaluationCase` cascades to delete all its associated historical `EvaluationRun` data.
*   Deleting a specific `EvaluationRun` removes just that test execution, leaving the `EvaluationCase` intact for future benchmarking.

## Run Comparison
The `compare_runs()` API allows developers to select two different `EvaluationRun` IDs and view a side-by-side comparison. It computes delta metrics for precision, recall, and latency, and generates a `config_diff` to clearly show which settings were altered between the runs (e.g., comparing `vector` search vs `rrf`).
