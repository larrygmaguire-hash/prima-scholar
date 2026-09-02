# Changelog

All notable changes to PRIMA Scholar are documented in this file.

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
