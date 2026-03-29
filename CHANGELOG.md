# Changelog

All notable changes to PRIMA Scholar are documented in this file.

## [2.0.1] - 2026-03-29

### Fixed

- Library MCP server crash on fresh databases — migration v2 failed with "duplicate column name: citations" because v1 CREATE TABLE already included the column. Added `safeDdl` flag to migration runner to handle this gracefully.

### Added

- `install.sh` script — copies commands, skills, and agents into a target workspace's `.claude/` directory and registers MCP servers in `~/.claude.json`. Replaces manual setup.

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
