# PRIMA Scholar

A research workspace plugin for Claude Code and Claude Desktop. Search academic databases, manage a local document library, and write with automatic APA7 citations.

## What It Does

- **Academic Search** — Search PubMed, arXiv, Semantic Scholar, and CrossRef from a single interface. Results include pre-formatted APA7 citations.
- **Document Library** — Import PDFs, Word documents, and text files into a local SQLite database with full-text search, collections, and tagging.
- **Citation-Aware Writing** — Draft prose with inline APA7 citations drawn from your library and academic databases.
- **Research Agent** — Autonomous multi-step research: decomposes questions, searches databases, follows citation chains, produces cited synthesis.

## Installation

### Claude Code (Full Plugin)

```bash
# Clone or download the repository
git clone https://github.com/larrygmaguire/prima-scholar.git
cd prima-scholar

# Build both MCP servers
cd mcp-servers/prima-scholar-search-mcp && npm install && npm run build && cd ../..
cd mcp-servers/prima-scholar-library-mcp && npm install && npm run build && cd ../..

# Load the plugin
claude --plugin-dir /path/to/prima-scholar
```

### Claude Desktop (MCP Servers Only)

Add to your Claude Desktop configuration (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "prima-scholar-search": {
      "command": "node",
      "args": ["/path/to/prima-scholar/mcp-servers/prima-scholar-search-mcp/build/index.js"],
      "env": {
        "CROSSREF_MAILTO": "your@email.com"
      }
    },
    "prima-scholar-library": {
      "command": "node",
      "args": ["/path/to/prima-scholar/mcp-servers/prima-scholar-library-mcp/build/index.js"],
      "env": {
        "RESEARCH_LIBRARY_PATH": "~/.research-library/library.db"
      }
    }
  }
}
```

You can install either server independently — the search server has no dependency on the library server.

## Environment Variables

All optional. The plugin works with zero configuration.

| Variable | Purpose | Default |
|----------|---------|---------|
| `PUBMED_API_KEY` | Increases PubMed rate limit from 3/sec to 10/sec | None (3 req/sec) |
| `SEMANTIC_SCHOLAR_KEY` | Increases Semantic Scholar rate limit | None (100 req/5min) |
| `CROSSREF_MAILTO` | Enters CrossRef polite pool for higher rate limits | None |
| `RESEARCH_LIBRARY_PATH` | Custom database file location | `~/.research-library/library.db` |

## Commands (Claude Code)

| Command | Description |
|---------|-------------|
| `/scholar [topic]` | Start a research session — search, review, synthesise |
| `/cite [DOI or title]` | Quick citation lookup → formatted APA7 |
| `/library [action]` | Library management: import, search, collections, stats |

## Skills (Claude Code)

| Skill | Triggers |
|-------|----------|
| `researching-topics` | "research [topic]", "find papers on", "literature review" |
| `managing-research-library` | "import this paper", "search my library", "organise research" |
| `writing-with-citations` | "write with citations", "draft with references" |

## Agents (Claude Code)

| Agent | Purpose |
|-------|---------|
| `research-agent` | Autonomous multi-step research with citation chain analysis |
| `form-completion-agent` | Fill structured templates from academic sources |

## MCP Tools

### Search Server (23 tools total — 11 search)

| Tool | Description |
|------|-------------|
| `scholar_search` | Unified search across all APIs with deduplication |
| `pubmed_search` | Search PubMed biomedical literature |
| `pubmed_get_paper` | Get paper details by PMID |
| `arxiv_search` | Search arXiv preprints |
| `arxiv_get_paper` | Get paper by arXiv ID |
| `semantic_search` | Search Semantic Scholar |
| `semantic_get_paper` | Get paper by ID, DOI, or arXiv ID |
| `semantic_citations` | Papers that cite a given paper |
| `semantic_references` | Papers referenced by a given paper |
| `crossref_search` | Search CrossRef metadata |
| `crossref_resolve_doi` | Resolve DOI to full metadata + APA7 citation |

### Library Server (12 tools)

| Tool | Description |
|------|-------------|
| `library_import` | Import a PDF, DOCX, TXT, or MD file |
| `library_import_from_search` | Import a paper from search results |
| `library_search` | Full-text search with snippets |
| `library_get_document` | Get full document by ID |
| `library_list` | List documents with filters |
| `library_update` | Update document metadata |
| `library_delete` | Remove a document |
| `library_create_collection` | Create a named collection |
| `library_list_collections` | List collections with counts |
| `library_add_to_collection` | Add document to collection |
| `library_tag` | Add or remove tags |
| `library_stats` | Library statistics |

## Academic APIs

All APIs are free to use. No accounts or API keys required for basic operation.

| API | Coverage | Rate Limit (free) |
|-----|----------|-------------------|
| [PubMed](https://pubmed.ncbi.nlm.nih.gov/) | Biomedical, life sciences | 3 req/sec |
| [arXiv](https://arxiv.org/) | Physics, maths, CS, biology, finance | 1 req/3sec |
| [Semantic Scholar](https://www.semanticscholar.org/) | All disciplines, citation graphs | 100 req/5min |
| [CrossRef](https://www.crossref.org/) | DOI metadata, all disciplines | 50 req/sec |

## Requirements

- Node.js 18+
- npm

## Licence

MIT
