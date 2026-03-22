# Search Strategies Reference

## Query Formulation

### Start Broad, Then Narrow

1. Identify core concepts in the research question (2-3 key terms)
2. Generate synonyms and related terms for each concept
3. Combine into 2-3 query variants

### Example

Research question: "How does sleep quality affect cognitive performance in older adults?"

- Concept 1: sleep quality → sleep disturbance, insomnia, sleep duration, sleep efficiency
- Concept 2: cognitive performance → cognition, executive function, memory, attention
- Concept 3: older adults → elderly, ageing, aged, geriatric

Query variants:
- "sleep quality cognitive performance older adults"
- "insomnia executive function ageing"
- "sleep disturbance memory elderly"

## Database Selection

| Database | Strengths | Best For |
|----------|-----------|----------|
| PubMed | Biomedical, clinical trials, health | Medicine, psychology, neuroscience, public health |
| arXiv | Preprints, cutting-edge research | CS, ML/AI, physics, mathematics, quantitative biology |
| Semantic Scholar | Citation graphs, broad coverage | Cross-disciplinary, citation analysis, finding seminal works |
| CrossRef | DOI resolution, complete metadata | Verifying references, filling metadata gaps |

## Refining Results

### Too Many Results

- Add discipline-specific terms (e.g., "organisational" for workplace studies)
- Restrict date range (last 5 years for current evidence)
- Add methodology terms (e.g., "meta-analysis", "randomised controlled trial")

### Too Few Results

- Remove date restrictions
- Use broader synonyms
- Drop one concept and search with remaining terms
- Search a different database

## Boolean-Style Queries

Most academic APIs support natural language queries rather than strict Boolean. However, structuring queries with key concept groupings improves results:

- Use specific phrases: "self-determination theory" rather than self determination theory
- Combine concepts: "attachment theory workplace" narrows better than either term alone
- Add methodology filters when supported: "systematic review", "meta-analysis"

## Citation Chaining

After finding a highly relevant paper:

1. Use `semantic_citations` to find papers that cite it (forward chaining)
2. Use `semantic_references` to find papers it cites (backward chaining)
3. This reveals the conversation around a key finding

## Date Filtering Guidelines

| Need | Date Range |
|------|-----------|
| Current state of evidence | Last 5 years |
| Established findings with recent updates | Last 10 years |
| Historical/foundational research | No date filter |
| Rapidly evolving fields (AI, genomics) | Last 2-3 years |
