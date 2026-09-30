# Literature Watch Config

Copy this file to `.claude/literature-watch/config.md` in your workspace and edit every section. Create `.claude/literature-watch/state.json` alongside it with the content `{"lastRun": null, "seenDois": [], "runs": []}`.

## Interest

One paragraph stating what you are watching for and why. The agent uses this to judge relevance, so write it as a brief to a research assistant.

> Example: I follow how artificial intelligence is changing work. I want empirical and theoretical papers on employment effects, job quality, skills, management practice, leadership, culture, performance and governance, from economics, sociology, psychology, management and law.

## Settings

- digest_dir: `Documentation/Reports/Literature Watch` (relative to the workspace root; exists in every AI Business OS layout. In a 3.0.0 workspace `Domains/14 Research & Development/14.4 Research Archive/Literature Watch` is the natural alternative)
- default_lookback_days: 14
- max_results_per_source: 20
- include_preprints: true
- library_tags: `literature-watch`
- library_collection: `Literature Watch`
- missing_abstract: `relegate` (a paper with no abstract, after one title search on OpenAlex and Europe PMC, is never selected or imported. `relegate` lists it under "Abstract Unavailable" when its title would pass the screen. `exclude` screens it out. `include` screens it on title alone, the behaviour before 2.2.0)

## Topic Groups

One group per heading. `query` is passed to `scholar_search`. `sources` is the list for that call. `theme` is the digest heading the group feeds. Several groups may share a theme.

Optional per-group fields override the settings for that group only:

- `sort_by`: `date` (the default) or `relevance`. Use `relevance` for a group that searches CrossRef. With `date`, CrossRef returns the newest records matching any query word, and on a broad query those cover less than a day of the window. With `relevance`, it ranks the whole window.
- `max_results`: results per source for this group, in place of `max_results_per_source`.
- `venues`: journal or publisher substrings, applied after retrieval. Pair with `sort_by: relevance`, a higher `max_results` and the publisher's name in the query, so the retrieved set holds enough of that publisher's records to filter.

### Group A

- theme: Employment and Labour Markets
- query: `("artificial intelligence" OR "generative AI") AND (employment OR "labour market" OR "labor market" OR wages OR automation)`
- sources: openalex, crossref, semantic_scholar

### Group B

- theme: Work Design and Wellbeing
- query: `("artificial intelligence" OR "generative AI") AND (employees OR "job satisfaction" OR wellbeing OR autonomy OR "human-AI collaboration")`
- sources: openalex, semantic_scholar

### Group C (Publisher Sweep Example)

- theme: Work Design and Wellbeing
- query: `Frontiers artificial intelligence employees workplace`
- sources: crossref
- sort_by: relevance
- max_results: 100
- venues: Frontiers in

## Venue Sweep

A short list of journals and working-paper series to sweep with a broad query and the `venues` filter, catching items the topic queries miss. Use distinctive substrings. `sources`, `sort_by` and `max_results` are optional here too. Without them the sweep uses OpenAlex and CrossRef, the groups' sort order and twice `max_results_per_source`.

- sweep_query: `artificial intelligence`
- venues: Journal of Applied Psychology, Human Relations, Work, Employment and Society, NBER, SSRN, IZA

## Screening Rules

Additions to the skill defaults. State inclusions and exclusions plainly.

- include: ...
- exclude: ...
