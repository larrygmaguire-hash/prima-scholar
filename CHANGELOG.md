# Changelog

All notable changes to PRIMA Scholar are documented in this file.

## [Unreleased]

## [2.2.1] - 2026-10-14

Bug fixes and documentation corrections. Search and Library MCP servers change in tool descriptions, version strings and two start-up fallbacks (empty `RESEARCH_LIBRARY_PATH` and empty `OPENALEX_MAILTO`); no tool behaviour changes.

### Fixed

- `install.sh` no longer drops API keys when it re-registers a server. Re-registration rebuilt the `prima-scholar-search` `env` block from `CROSSREF_MAILTO` and `OPENALEX_MAILTO` only, deleting `PUBMED_API_KEY`, `SEMANTIC_SCHOLAR_KEY`, `CORE_API_KEY` and any other variable, and the library entry kept only `RESEARCH_LIBRARY_PATH`. Both now keep every existing variable and add only missing defaults.
- `install.sh` "already registered" check looked for an `args` entry that the installer itself never writes, so every re-run re-registered both servers. It now also matches on `command`, and leaves a correct entry untouched.
- `install.sh` passes paths to Python as arguments instead of interpolating them into the Python source, so a quote in a workspace path cannot break the Python code.
- `scholar_citations` tool description no longer claims OpenAlex citation data; the tool uses Semantic Scholar only.
- `scholar_full_text` tool description now states the four routes in the order the code tries them, that only CORE returns the text itself, and that the other routes return a download URL.
- `scholar_get_paper` tool description no longer lists CORE IDs and DBLP keys, which have no route, and states the DOI fallback from Semantic Scholar to CrossRef.
- `scholar_search` `sources` description now gives the real default (all ten, CORE skipped without a key) instead of "determined by wizard".
- Library MCP server reported version 1.0.0 at runtime; the CrossRef User-Agent carried 1.0.0. Both now carry the release version.
- `/library collections` browse step called `library_search` with a collection filter that does not exist; it now calls `library_list` with `collection`. The `tags` action filters with `library_list` `tag`, and `stats` no longer offers recent imports, which `library_stats` does not return.
- `managing-research-library` `import-formats.md` described DOI, year, abstract, journal, YAML front matter and DOCX property extraction that the importers do not do. It now lists what each importer extracts and how each stored field is set.
- `managing-research-library` skill: import confirmation, browse sorting, stats and DOI enrichment steps now match the tools (no citation count sort, no journal field, enrichment written back with `library_update`).
- `/cite` example showed a string document ID; library IDs are integers.
- `/scholar` and the `researching-topics` description listed four databases; both now list all ten.
- Plugin route (`.mcp.json`): a variable not exported before `claude --plugin-dir` reached the servers as the literal text `${VAR}`, so the library server created a database file named `${RESEARCH_LIBRARY_PATH}` in the directory Claude Code was started in, and the search server held literal placeholder text as its keys and contact emails. Every variable now uses the `${VAR:-default}` form (empty for keys and emails, `~/.research-library/library.db` for the library path), and `OPENALEX_MAILTO` and `CORE_API_KEY`, which `.mcp.json` did not pass, are added.
- Library MCP server: an empty `RESEARCH_LIBRARY_PATH` opened a temporary database that was discarded when the server stopped. Empty or whitespace now falls back to the default path.
- OpenAlex client: `OPENALEX_MAILTO` falls back to `CROSSREF_MAILTO` when it is empty as well as when it is unset. `install.sh` writes an empty `OPENALEX_MAILTO` by default, so the fallback never applied on the installer route.
- `literature-watch-agent` step 5 said `scholar_get_paper` routes a DOI to CrossRef; it resolves a DOI through Semantic Scholar and falls back to CrossRef.

### Added

- `.claude-plugin/marketplace.json`: a single-plugin marketplace named `prima-scholar`, so the plugin can be added with `/plugin marketplace add larrygmaguire-hash/prima-scholar` and installed with `/plugin install prima-scholar@prima-scholar`, and stays installed between sessions. `--plugin-dir` remains the development route.

### Changed

- README: clone command added to the install steps; the Claude Code plugin route (`.claude-plugin/plugin.json`, `.mcp.json`, `claude --plugin-dir`) documented; all three agents listed; uninstall steps added that reverse `install.sh`; `python3`, `bash` and `git` added to the requirements, with the installer's OS support.
- README install section reordered: the marketplace route first, then `--plugin-dir` for development, then `install.sh`, then Claude Desktop.
- README and search server README: rate limit and key descriptions match the built-in limiters (only the PubMed key raises a limit); citation style default stated as all six styles unless `citation_style` is set; full-text and paper lookup descriptions match the code.
- `install.sh` header lists the `.gitignore` step and the `python3` requirement.
- Version 2.2.1 across `plugin.json`, both MCP `package.json` and `package-lock.json` files, and both servers' runtime version strings.

## [2.2.0] - 2026-09-30

Plugin components only. Search and Library MCP servers unchanged.

### Added

- `literature-watch` per-group overrides: optional `sort_by`, `max_results` and `venues` on any topic group, and optional `sources`, `sort_by` and `max_results` on the venue sweep. Unset fields fall back to the settings, so existing configs behave as before.
- `literature-watch` missing-abstract handling: the agent tries one title search on OpenAlex and Europe PMC for any paper with an empty abstract (not `scholar_get_paper`, which routes a DOI to CrossRef, the source most often missing it), then applies the new `missing_abstract` setting (`relegate`, the default, `exclude` or `include`). Relegated papers are never selected or imported and are listed in a new "Abstract Unavailable" digest section. The sidecar gains `relegatedDois` and the run record gains `relegated`.
- Config template example of a publisher sweep group (Frontiers via CrossRef with relevance sort and a venue filter).
- Troubleshooting rows for CrossRef date-sorted results bunching on the last day of the window, and for post-retrieval venue filters that find almost nothing.

### Changed

- `literature-watch` default for papers without an abstract moves from screening on title alone to `relegate`. Set `missing_abstract: include` to keep the earlier behaviour.
- State update appends DOIs without re-sorting `seenDois`, so the oldest-dropped cap keeps working.
- `literature-watch` config template: the default `digest_dir` is now `Documentation/Reports/Literature Watch`, a folder present in every AI Business OS layout. The previous default, `Research/Literature Watch`, existed in no layout. The 3.0.0 domain alternative is noted alongside it.

## [2.1.0] - 2026-09-02

Search MCP server 2.1.0. Library MCP server unchanged.

### Added

- **`literature-watch` skill, `/literature-watch` command and `literature-watch-agent`**: a recurring recency scan over a configured set of topic groups, screened for relevance, written as a dated digest with APA7 references and a JSON sidecar of DOIs, with selected papers imported to the library. Config template in `skills/literature-watch/references/config-template.md`.
- `scholar_search` caps `published_before` at today when `sort_by` is `date`, so placeholder future dates from CrossRef and OpenAlex do not lead the results.
- `publishedDate` on every `Paper` (ISO `YYYY-MM-DD`, or `YYYY-MM` / `YYYY` when only a partial date is known), populated by all 10 clients.
- `scholar_search` parameters `published_after` and `published_before`: inclusive ISO date window, finer than `year_from` / `year_to` and preferred over them. Validated as `YYYY`, `YYYY-MM` or `YYYY-MM-DD`.
- `scholar_search` parameter `sort_by` with modes `open_access` (default, earlier behaviour), `citations`, `date` (newest first, for recency scans) and `relevance` (per-source rank, interleaved round-robin across sources).
- `scholar_search` parameter `venues`: case-insensitive substring match on journal or publisher name, applied after retrieval.
- `scholar_search` parameter `exclude_dois`: drop papers by normalised DOI, for de-duplicating against a library.
- Server-side date pushdown per source: OpenAlex (`from_publication_date` / `to_publication_date`, `sort=publication_date:desc`), CrossRef (`from-pub-date` / `until-pub-date`, `sort=published`), Semantic Scholar (`publicationDateOrYear`, `year`), arXiv (`submittedDate` range, `sortBy=submittedDate`), PubMed (`datetype=pdat`, `mindate` / `maxdate`, `sort=pub_date`), Europe PMC (`FIRST_PDATE` range, `sort=P_PDATE_D desc`), bioRxiv/medRxiv (ISO from/to dates). CORE keeps its year parameters; ERIC and DBLP are year-only. All sources are re-filtered client-side on the date window.
- Date helpers in `utils.ts`: `toIsoDate`, `monthToNumber`, `todayIso`, `normaliseIsoForCompare`, `compareDateDesc`.
- README "Recency Scanning" section with worked example calls.

### Changed

- CrossRef client now honours `year_from` / `year_to` (previously ignored) and returns `citationCount` from `is-referenced-by-count`.
- `scholar_search` result payload carries `sortBy` and `filtersApplied` (date window, venues, count of excluded DOIs, year range, OA flag).
- `aggregatedSearch` returns the shared `SearchResult` type rather than an inline type.
- Semantic Scholar `FIELDS` now requests `publicationDate`.

## [2.0.3] - 2026-04-10

### Changed

- README ecosystem section expanded to list all 6 PRIMA components (was missing AI Business OS, CRM, and Dashboard)
- `plugin.json` version bumped to match CHANGELOG (was stuck at 1.0.0)

## [2.0.2] - 2026-04-02

### Fixed

- `install.sh` now detects and aborts when cloned inside the target workspace (nested git repo). Prints clear instructions to relocate before running.
- `install.sh` now overwrites existing skills and agents on re-install instead of skipping them, ensuring updates are always applied.

### Added

- `install.sh` automatically adds MCP server directories to the workspace's `.gitignore`.
- README rewritten with step-by-step install and update instructions addressed directly to Claude Code instances.
- `fix-nested-repo.md` — standalone fix guide for users who already have a nested repo.

## [2.0.1] - 2026-03-29

### Fixed

- Library MCP server crash on fresh databases — migration v2 failed with "duplicate column name: citations" because v1 CREATE TABLE already included the column. Added `safeDdl` flag to migration runner to handle this gracefully.
- `install.sh` now copies MCP server code (build + node_modules) into the workspace's `.claude/mcp-servers/` directory with `start.sh` wrappers, instead of registering paths back to the cloned repo. MCP servers now run from the workspace like all other operational files.

### Added

- `install.sh` script — copies commands, skills, agents, and MCP servers into a target workspace's `.claude/` directory and registers MCP servers in `~/.claude.json`. Replaces manual setup.

## [2.0.0] - 2026-03-27

### Added

- **6 new academic databases**: OpenAlex, CORE, Europe PMC, ERIC, bioRxiv/medRxiv, DBLP (total: 10 databases)
- **Search wizard** (`scholar_wizard`) -- analyses queries, detects disciplines, suggests optimal databases, generates refinement questions before searching
- **Open access prioritisation** -- every result includes `openAccess`, `openAccessUrl`, and `fullTextAvailable` fields. OA papers sorted first in results
- **Open access filtering** -- `open_access_only` parameter on `scholar_search` to exclude gated papers
- **Full-text retrieval** (`scholar_full_text`) -- fetch OA full text from CORE, Europe PMC, arXiv, and bioRxiv
- **Date range filtering** -- `year_from` and `year_to` parameters on `scholar_search`
- **Discipline detection** -- automatic routing to the strongest databases for 11 disciplines (psychology, education, neuroscience, business, CS/AI, philosophy, biomedical, engineering, social sciences, maths/physics, economics)
- **Unified paper lookup** (`scholar_get_paper`) -- accepts DOIs, PMIDs, arXiv IDs, OpenAlex IDs, ERIC IDs, CORE IDs, Semantic Scholar IDs, DBLP keys. Routes automatically to the correct backend
- **Unified citation tracking** (`scholar_citations`) -- forward and backward citation tracking in a single tool with `direction` parameter
- **Graceful API key handling** -- sources requiring missing keys are skipped with a helpful message (not an error)
- **`ScholarClient` interface** -- all 10 backend clients implement a common interface for consistent behaviour
- **Migration guide** in README for v1 users

### Changed

- **Breaking: Tool surface reduced from 11 to 5 tools** -- per-source tools (`pubmed_search`, `arxiv_search`, `semantic_search`, `crossref_search`, `pubmed_get_paper`, `arxiv_get_paper`, `semantic_get_paper`, `crossref_resolve_doi`, `semantic_citations`, `semantic_references`) replaced by `scholar_search`, `scholar_get_paper`, `scholar_citations`, `scholar_full_text`, and `scholar_wizard`
- **Results sorting** -- now sorts OA papers first, then by citation count (previously: citation count only)
- **Semantic Scholar fields** -- now requests `isOpenAccess` and `openAccessPdf` for OA detection
- **CrossRef client** -- now detects OA papers via Creative Commons licence metadata

### New Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `OPENALEX_MAILTO` | No | Polite pool for OpenAlex |
| `CORE_API_KEY` | Yes (for CORE only) | Free API key from https://core.ac.uk/services/api |

Existing variables (`PUBMED_API_KEY`, `SEMANTIC_SCHOLAR_KEY`, `CROSSREF_MAILTO`) remain unchanged.

## [1.2.0] - 2026-03-23

### Added

- Database schema versioning with migrations table (Library MCP)

## [1.1.0] - 2026-03-22

### Added

- Multi-style citation support: APA7, Harvard, Chicago, Vancouver, IEEE, MLA
- `citation_style` parameter on all search tools

## [1.0.0] - 2026-03-22

### Added

- Initial release
- Search across PubMed, arXiv, Semantic Scholar, CrossRef
- 11 search tools (aggregated + per-source)
- Document library with SQLite FTS5 full-text search
- PDF, DOCX, TXT, MD import
- Collections and tagging
- APA7 citation formatting
- Research agent for autonomous multi-step research
- `/scholar`, `/cite`, `/library` commands
- Rate limiting per source
