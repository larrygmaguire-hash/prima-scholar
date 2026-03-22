---
name: researching-topics
description: Search academic databases (PubMed, arXiv, Semantic Scholar, CrossRef), synthesise findings with APA7 citations and confidence tags. Use when asked to "research [topic]", "find papers on", "literature review", "what does the research say about", "search for studies on", or "academic search".
---

# Researching Topics

## When to Use

- User asks to research a topic, find papers, or review literature
- User wants to know "what does the research say about X"
- User needs academic sources on a specific subject
- User requests a literature scan, systematic search, or evidence summary
- User asks to search for studies, find evidence, or locate academic references

## When NOT to Use

- User already has papers and wants to write with them — use `writing-with-citations`
- User wants to import a specific file or organise existing library — use `managing-research-library`
- User wants a quick factual answer that does not require source retrieval
- User is asking about a non-academic topic where peer-reviewed sources are unlikely to exist

## Workflow

1. **Clarify research question.** Ask the user for:
   - Topic or research question
   - Scope: date range, discipline, geographic focus
   - Depth: quick scan (top 5-10 results) vs comprehensive review (multi-query, 15+ results)

2. **Formulate search queries.** Create 2-3 query variants targeting different aspects of the question. Use synonyms, related concepts, and field-specific terminology. See `references/search-strategies.md`.

3. **Execute searches.** Run `scholar_search` with each query variant. Target specific APIs when the discipline suggests it:
   - PubMed: biomedical, clinical, health sciences
   - arXiv: computer science, physics, mathematics, quantitative fields
   - Semantic Scholar: broad coverage, citation graph data
   - CrossRef: DOI resolution, complete metadata

4. **Check local library.** Run `library_search` for existing relevant documents. Cross-reference against new search results to avoid redundancy.

5. **Deduplicate and rank.** Remove duplicates across result sets. Rank by relevance using: citation count (descending), recency, journal quality.

6. **Present results.** Show top 10-15 results in a summary table.

7. **Decision Checkpoint.** Ask the user which papers to explore further or import to library.

8. **Fetch full details.** For selected papers:
   - `semantic_get_paper` for citation graphs and abstract
   - `crossref_resolve_doi` for complete metadata
   - `semantic_citations` / `semantic_references` for citation network exploration

9. **Offer library import.** Import selected papers via `library_import_from_search` so they are available for future sessions.

10. **Synthesise findings.** Write a thematic summary following the output format below. Apply confidence tags per `references/synthesis-patterns.md`. Use APA7 inline citations throughout.

11. **Write to disk.** Save synthesis at user-specified location or `~/Documents/Agent Outputs/[project-id]/`.

## Output Format

```markdown
# Research Summary: [Topic]

**Date:** YYYY-MM-DD
**Query:** [search terms used]
**Sources searched:** [list of APIs queried]
**Results found:** [total count across all queries]

## Key Findings

### Theme 1: [Name]
[Synthesised prose with inline citations (Author, Year)]
**Confidence:** HIGH/MEDIUM/LOW

### Theme 2: [Name]
[Synthesised prose with inline citations (Author, Year)]
**Confidence:** HIGH/MEDIUM/LOW

## Papers Reviewed

| # | Title | Authors | Year | Citations | Source | DOI |
|---|-------|---------|------|-----------|--------|-----|

## References

[APA7 formatted reference list]
```

## Examples

**User:** "Research self-determination theory and workplace motivation"
- Clarify scope: organisational psychology, last 10 years, comprehensive
- Query variants: "self-determination theory workplace motivation", "SDT employee autonomy", "intrinsic motivation organisational behaviour"
- Search PubMed and Semantic Scholar
- Present top 15, ask which to explore
- Synthesise into themes: autonomy, competence, relatedness in work contexts

**User:** "Find papers on transformer architectures for time series"
- Clarify scope: CS/ML, last 3 years, quick scan
- Query variants: "transformer time series forecasting", "attention mechanism temporal data"
- Search arXiv and Semantic Scholar
- Present top 10, offer import

**User:** "What does the research say about cold water immersion and recovery?"
- Clarify scope: sports science, exercise physiology, last 5 years
- Query variants: "cold water immersion recovery", "cryotherapy exercise performance", "cold exposure muscle soreness"
- Search PubMed primarily
- Synthesise with confidence tags for conflicting evidence

## Troubleshooting

| Problem | Cause | Fix |
|---------|-------|-----|
| Too few results | Query too specific or niche | Broaden terms, remove date filters, try synonyms |
| Too many irrelevant results | Query too broad | Add discipline-specific terms, narrow date range, use Boolean operators |
| No results from specific API | Topic outside that database's scope | Switch to a more appropriate API (e.g., arXiv for CS, PubMed for biomedical) |
| Duplicate papers across searches | Same paper indexed in multiple databases | `scholar_search` deduplicates internally; cross-check DOIs manually if using individual APIs |
| Cannot fetch full paper details | DOI missing or invalid | Try `semantic_search` with title, or `crossref_search` to locate the correct DOI |
| User wants a paper not in search results | Paper may be too old, not indexed, or behind paywall | Try `crossref_resolve_doi` with a known DOI, or `library_import` if user has the file |
