# Literature Watch Config

Copy this file to `.claude/literature-watch/config.md` in your workspace and edit every section. Create `.claude/literature-watch/state.json` alongside it with the content `{"lastRun": null, "seenDois": [], "runs": []}`.

## Interest

One paragraph stating what you are watching for and why. The agent uses this to judge relevance, so write it as a brief to a research assistant.

> Example: I follow how artificial intelligence is changing work. I want empirical and theoretical papers on employment effects, job quality, skills, management practice, leadership, culture, performance and governance, from economics, sociology, psychology, management and law.

## Settings

- digest_dir: `Research/Literature Watch` (relative to the workspace root)
- default_lookback_days: 14
- max_results_per_source: 20
- include_preprints: true
- library_tags: `literature-watch`
- library_collection: `Literature Watch`

## Topic Groups

One group per heading. `query` is passed to `scholar_search`. `sources` is the list for that call. `theme` is the digest heading the group feeds. Several groups may share a theme.

### Group A

- theme: Employment and Labour Markets
- query: `("artificial intelligence" OR "generative AI") AND (employment OR "labour market" OR "labor market" OR wages OR automation)`
- sources: openalex, crossref, semantic_scholar

### Group B

- theme: Work Design and Wellbeing
- query: `("artificial intelligence" OR "generative AI") AND (employees OR "job satisfaction" OR wellbeing OR autonomy OR "human-AI collaboration")`
- sources: openalex, semantic_scholar

## Venue Sweep

A short list of journals and working-paper series to sweep with a broad query and the `venues` filter, catching items the topic queries miss. Use distinctive substrings.

- sweep_query: `artificial intelligence`
- venues: Journal of Applied Psychology, Human Relations, Work, Employment and Society, NBER, SSRN, IZA

## Screening Rules

Additions to the skill defaults. State inclusions and exclusions plainly.

- include: ...
- exclude: ...
