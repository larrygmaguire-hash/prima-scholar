# PRIMA Scholar Search MCP Server

An MCP (Model Context Protocol) server that aggregates academic search across four free APIs: **PubMed**, **arXiv**, **Semantic Scholar**, and **CrossRef**.

Returns structured paper metadata with automatic APA7 citation formatting, DOI-based deduplication, and citation count sorting.

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
        "SEMANTIC_SCHOLAR_KEY": "your-key-here",
        "PUBMED_API_KEY": "your-key-here",
        "CROSSREF_MAILTO": "your-email@example.com"
      }
    }
  }
}
```

### Claude Code

Add to `.claude.json` or project settings:

```json
{
  "mcpServers": {
    "prima-scholar-search": {
      "command": "node",
      "args": ["/path/to/prima-scholar-search-mcp/build/index.js"],
      "env": {
        "SEMANTIC_SCHOLAR_KEY": "your-key-here",
        "PUBMED_API_KEY": "your-key-here",
        "CROSSREF_MAILTO": "your-email@example.com"
      }
    }
  }
}
```

## Environment Variables

All environment variables are **optional**. The server works without any keys, but rate limits are lower.

| Variable | Purpose | Effect |
|----------|---------|--------|
| `SEMANTIC_SCHOLAR_KEY` | Semantic Scholar API key | Higher rate limits |
| `PUBMED_API_KEY` | NCBI E-utilities API key | 10 req/sec instead of 3 |
| `CROSSREF_MAILTO` | Email for CrossRef polite pool | Higher rate limits, priority access |

## Available Tools

### Aggregated Search

| Tool | Description |
|------|-------------|
| `scholar_search` | Search all four databases simultaneously with deduplication and citation-count sorting |

### PubMed

| Tool | Description |
|------|-------------|
| `pubmed_search` | Search PubMed with full query syntax (MeSH terms, field tags, boolean operators) |
| `pubmed_get_paper` | Get full metadata for a single article by PMID |

### arXiv

| Tool | Description |
|------|-------------|
| `arxiv_search` | Search arXiv preprints across all categories |
| `arxiv_get_paper` | Get metadata for a single paper by arXiv ID |

### Semantic Scholar

| Tool | Description |
|------|-------------|
| `semantic_search` | Search the Semantic Scholar academic graph |
| `semantic_get_paper` | Get paper by ID (supports S2 ID, DOI:xxx, ARXIV:xxx, PMID:xxx) |
| `semantic_citations` | Get papers that cite a given paper (forward citation tracking) |
| `semantic_references` | Get papers referenced by a given paper (backward citation tracking) |

### CrossRef

| Tool | Description |
|------|-------------|
| `crossref_search` | Search CrossRef for scholarly works by metadata |
| `crossref_resolve_doi` | Resolve a DOI to its full metadata |

## Example Usage

### Broad literature search

```
Use scholar_search with query "self-determination theory workplace motivation"
```

### Find citing papers

```
Use semantic_citations with paper_id "DOI:10.1037/0003-066X.55.1.68"
```

### Resolve a DOI

```
Use crossref_resolve_doi with doi "10.1038/nature12373"
```

## Output Format

Every paper result includes:

- **title** — paper title
- **authors** — list of author names with optional affiliations
- **abstract** — full abstract text
- **year** — publication year
- **journal** — journal or venue name (null for preprints)
- **doi** — DOI if available
- **url** — direct link to the paper
- **source** — which database returned this result
- **sourceId** — the source-specific identifier (PMID, arXiv ID, S2 ID, DOI)
- **citationCount** — citation count (Semantic Scholar only)
- **keywords** — subject keywords (arXiv categories)
- **apa7Citation** — pre-formatted APA7 citation string

## Rate Limits

The server implements per-source rate limiting:

| Source | Limit (no key) | Limit (with key) |
|--------|---------------|-------------------|
| PubMed | 3 req/sec | 10 req/sec |
| arXiv | 1 req/3 sec | N/A |
| Semantic Scholar | 100 req/5 min | Higher |
| CrossRef | 50 req/sec | N/A (polite pool) |

## Licence

MIT
