# PRIMA Scholar Search MCP Server

An MCP (Model Context Protocol) server for academic literature search across **10 databases**. Designed to give researchers, students, and professionals broad access to scholarly work across every discipline.

PRIMA Scholar Search provides a **search wizard** that analyses your query, detects your discipline, and recommends the best databases to search. It prioritises **open access** papers, clearly labels gated content, and can retrieve full text where available.

## What It Does

- **Searches 10 academic databases** simultaneously with automatic deduplication
- **Detects your discipline** from your query and routes to the strongest databases for that field
- **Prioritises open access** papers in results, with clear OA/gated labelling on every result
- **Guides users through search refinement** via a structured wizard before searching
- **Retrieves full text** for open access papers where available
- **Tracks citations** forward (who cited this paper?) and backward (what does this paper cite?)
- **Formats citations** in 6 styles: APA7, Harvard, Chicago, Vancouver, IEEE, MLA

## Databases

| Database | Coverage | Auth Required | Open Access |
|----------|----------|---------------|-------------|
| **OpenAlex** | 250M+ works, all disciplines | No (polite pool with email) | OA status per paper |
| **PubMed** | Biomedical, life sciences | Optional API key | Varies |
| **arXiv** | Physics, maths, CS, biology, finance, stats | No | All OA (preprints) |
| **Semantic Scholar** | All disciplines + citation graph | Optional API key | OA status per paper |
| **CrossRef** | DOI metadata, all disciplines | No (polite pool with email) | OA via licence metadata |
| **CORE** | 300M+ open access papers | Free API key required | All OA |
| **Europe PMC** | Biomedical + European research council | No | OA status per paper |
| **ERIC** | Education research | No | Full text for many |
| **bioRxiv/medRxiv** | Biology and medicine preprints | No | All OA (preprints) |
| **DBLP** | Computer science bibliography | No | Metadata only |

## Installation

```bash
cd prima-scholar-search-mcp
npm install
npm run build
```

## Configuration

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "prima-scholar-search": {
      "command": "node",
      "args": ["/path/to/prima-scholar-search-mcp/build/index.js"],
      "env": {
        "OPENALEX_MAILTO": "your-email@example.com",
        "SEMANTIC_SCHOLAR_KEY": "your-key-here",
        "PUBMED_API_KEY": "your-key-here",
        "CROSSREF_MAILTO": "your-email@example.com",
        "CORE_API_KEY": "your-key-here"
      }
    }
  }
}
```

### Claude Code

Add to `~/.claude.json` or project `.mcp.json`:

```json
{
  "mcpServers": {
    "prima-scholar-search": {
      "command": "node",
      "args": ["/path/to/prima-scholar-search-mcp/build/index.js"],
      "env": {
        "OPENALEX_MAILTO": "your-email@example.com",
        "SEMANTIC_SCHOLAR_KEY": "your-key-here",
        "PUBMED_API_KEY": "your-key-here",
        "CROSSREF_MAILTO": "your-email@example.com",
        "CORE_API_KEY": "your-key-here"
      }
    }
  }
}
```

## Environment Variables

| Variable | Required | Purpose | How to Get |
|----------|----------|---------|------------|
| `OPENALEX_MAILTO` | No | Polite pool for OpenAlex (higher rate limits) | Use your email address |
| `CROSSREF_MAILTO` | No | Polite pool for CrossRef (higher rate limits) | Use your email address |
| `PUBMED_API_KEY` | No | Higher rate limits (10 req/sec vs 3) | https://www.ncbi.nlm.nih.gov/account/ |
| `SEMANTIC_SCHOLAR_KEY` | No | Higher rate limits | https://www.semanticscholar.org/product/api |
| `CORE_API_KEY` | Yes (for CORE) | Required to use CORE database | https://core.ac.uk/services/api (free) |

**The server works without any keys.** 9 of the 10 databases require no authentication. Only CORE requires a free API key. Without keys, rate limits are lower but all other databases function normally.

## Tools

### scholar_wizard

Analyse a research query before searching. Returns:
- **Detected disciplines** from your query (e.g. psychology, neuroscience)
- **Suggested databases** optimised for those disciplines
- **Structured questions** to refine the search (discipline focus, OA preference, date range, preprint inclusion)
- **A suggested search configuration** with sensible defaults

Call this before `scholar_search` to guide users through search refinement.

### scholar_search

Search across all 10 databases simultaneously. Features:
- Automatic deduplication by DOI (keeps the result with the richest metadata)
- Results sorted: open access first, then by citation count (default), or by citations, date, or per-source relevance
- Configurable source selection, date range, date window, venue filter, DOI exclusion, and OA filtering
- Each result includes `openAccess` (boolean), `openAccessUrl`, `fullTextAvailable`, and `publishedDate` fields

Parameters:
- `query` (required) -- search terms
- `sources` -- array of database names to search (default: all available)
- `open_access_only` -- filter to OA papers only (default: false)
- `year_from` / `year_to` -- publication year range
- `published_after` / `published_before` -- inclusive ISO date window (`YYYY-MM-DD`, `YYYY-MM`, or `YYYY`); finer than the year range and preferred over it
- `sort_by` -- `open_access` (default), `citations`, `date` (newest first), or `relevance` (per-source rank, interleaved)
- `venues` -- case-insensitive substring match on journal or publisher name, applied after retrieval
- `exclude_dois` -- DOIs to drop, e.g. papers already in your library
- `max_results` -- per source (default: 10)
- `citation_style` -- return citations in one format only (default: all 6)

The response carries `sortBy` and a `filtersApplied` object so the caller can see exactly which constraints were in force.

### scholar_get_paper

Get full metadata for a single paper. Accepts multiple ID formats and routes automatically:
- DOI: `10.1037/0003-066X.55.1.68`
- PubMed: `PMID:38123456`
- arXiv: `ARXIV:2301.12345`
- OpenAlex: `W1234567890`
- ERIC: `EJ1234567` or `ED123456`
- Europe PMC: `PMC1234567`
- Semantic Scholar ID
- DBLP key

### scholar_citations

Forward and backward citation tracking.
- `direction: "citations"` -- papers that cite this one (forward)
- `direction: "references"` -- papers this one cites (backward)

Uses the Semantic Scholar citation graph.

### scholar_full_text

Retrieve full text for open access papers. Tries:
1. CORE (full-text API)
2. Europe PMC (PMC articles)
3. arXiv (PDF link)
4. bioRxiv/medRxiv (preprint PDF)

Returns the text content or a direct download URL.

## Discipline Detection

The wizard automatically detects disciplines from query keywords and maps to the strongest databases:

| Discipline | Primary Databases |
|------------|-------------------|
| Psychology | OpenAlex, Semantic Scholar, PubMed |
| Education | ERIC, OpenAlex, Semantic Scholar |
| Neuroscience | PubMed, Europe PMC, bioRxiv |
| Business and Management | OpenAlex, Semantic Scholar, CrossRef |
| Computer Science and AI | Semantic Scholar, arXiv, DBLP |
| Philosophy and Humanities | OpenAlex, CrossRef |
| Biomedical and Life Sciences | PubMed, Europe PMC, bioRxiv/medRxiv |
| Engineering | OpenAlex, Semantic Scholar, arXiv |
| Social Sciences | OpenAlex, Semantic Scholar, CrossRef |
| Mathematics and Physics | arXiv, Semantic Scholar, OpenAlex |
| Economics | OpenAlex, CrossRef, Semantic Scholar |

## Open Access Handling

Every paper in search results includes three fields:

| Field | Type | Meaning |
|-------|------|---------|
| `openAccess` | boolean | Whether this paper is openly accessible |
| `openAccessUrl` | string or null | Direct URL to the OA version |
| `fullTextAvailable` | boolean | Whether `scholar_full_text` can retrieve the content |

When `open_access_only` is false (default), results are partitioned:
- **OA papers first**, sorted by citation count
- **Gated papers second**, sorted by citation count

The response includes `openAccessCount` and `gatedCount` for transparency.

## Example Usage

### Guided search (recommended)

```
1. Call scholar_wizard with query "self-determination theory in workplace motivation"
2. Present the wizard's questions to the user
3. User answers: psychology + education, open access only, last 10 years, include preprints
4. Call scholar_search with the refined parameters
```

### Direct search

```
scholar_search with:
  query: "transformer architecture attention mechanism"
  sources: ["arxiv", "semantic_scholar", "dblp"]
  open_access_only: true
  year_from: 2020
```

### Citation tracking

```
scholar_citations with:
  paper_id: "DOI:10.1037/0003-066X.55.1.68"
  direction: "citations"
  max_results: 20
```

### Get full text

```
scholar_full_text with id: "PMC1234567"
```

## Recency Scanning

Use `published_after` with `sort_by: "date"` to answer "what has been published since DATE on X". New papers have few citations, so the default open-access-then-citations ordering would bury them; `date` puts them first. The date window is pushed to each source API where it supports one (OpenAlex, CrossRef, Semantic Scholar, arXiv, PubMed, Europe PMC, bioRxiv/medRxiv) and re-checked client-side for every source, so year-only databases (ERIC, DBLP) are filtered on year.

Newest since a date, newest first:

```json
{
  "query": "psychological safety hybrid teams",
  "published_after": "2026-06-01",
  "sort_by": "date",
  "max_results": 25
}
```

Venue-filtered, skipping papers already in the library:

```json
{
  "query": "generative AI workplace productivity",
  "published_after": "2026-01",
  "venues": ["Journal of Applied Psychology", "NBER", "SSRN"],
  "exclude_dois": ["10.1037/apl0001234", "https://doi.org/10.3386/w33456"],
  "sort_by": "date",
  "max_results": 50
}
```

The venue filter runs after retrieval, so raise `max_results` to give it enough candidates. Publisher metadata is not always tidy: some sources return forthcoming works with placeholder or clearly wrong future dates, so set `published_before` to today when a strict "already out" list is needed.

## Output Format

Every paper result includes:

- **title** -- paper title
- **authors** -- list of author names with optional affiliations
- **abstract** -- full abstract text
- **year** -- publication year
- **publishedDate** -- ISO publication date where the source supplies one (`YYYY-MM-DD`, or `YYYY-MM` / `YYYY` when only a partial date is known)
- **journal** -- journal or venue name
- **doi** -- DOI if available
- **url** -- direct link to the paper
- **source** -- which database returned this result
- **sourceId** -- source-specific identifier
- **citationCount** -- citation count (where available)
- **keywords** -- subject keywords
- **openAccess** -- whether this is an OA paper
- **openAccessUrl** -- direct OA link
- **fullTextAvailable** -- whether full text can be retrieved
- **citations** -- pre-formatted citation strings in up to 6 styles

## Rate Limits

The server implements per-source rate limiting to respect API terms:

| Source | Limit (no key) | Limit (with key) |
|--------|---------------|-------------------|
| PubMed | 3 req/sec | 10 req/sec |
| arXiv | 1 req/3 sec | N/A |
| Semantic Scholar | 100 req/5 min | Higher |
| CrossRef | 50 req/sec | N/A (polite pool) |
| OpenAlex | 10 req/sec | N/A (polite pool) |
| CORE | 10 req/sec | N/A |
| Europe PMC | 10 req/sec | N/A |
| ERIC | 10 req/sec | N/A |
| bioRxiv/medRxiv | 5 req/sec | N/A |
| DBLP | 5 req/sec | N/A |

## Migration from v1

v2.0.0 replaces the 11-tool surface with 5 tools. If you were calling per-source tools directly:

| v1 Tool | v2 Equivalent |
|---------|---------------|
| `pubmed_search` | `scholar_search` with `sources: ["pubmed"]` |
| `arxiv_search` | `scholar_search` with `sources: ["arxiv"]` |
| `semantic_search` | `scholar_search` with `sources: ["semantic_scholar"]` |
| `crossref_search` | `scholar_search` with `sources: ["crossref"]` |
| `pubmed_get_paper` | `scholar_get_paper` with `id: "PMID:xxx"` |
| `arxiv_get_paper` | `scholar_get_paper` with `id: "ARXIV:xxx"` |
| `semantic_get_paper` | `scholar_get_paper` with `id: "xxx"` |
| `crossref_resolve_doi` | `scholar_get_paper` with `id: "10.xxx/xxx"` |
| `semantic_citations` | `scholar_citations` with `direction: "citations"` |
| `semantic_references` | `scholar_citations` with `direction: "references"` |

## Licence

MIT
