![PRIMA Scholar](assets/prima-scholar-brand-image.png)

# PRIMA Scholar

A research workspace plugin for [Claude Code](https://docs.anthropic.com/en/docs/claude-code) and [Claude Desktop](https://claude.ai/download). Search academic databases, manage a local document library, and write with properly formatted citations.

## What It Does

- **Academic Search** — Search PubMed, arXiv, Semantic Scholar, and CrossRef from a single interface
- **Document Library** — Import PDFs, Word documents, and text files into a local SQLite database with full-text search, collections, and tagging
- **Multi-Style Citations** — Generate citations in APA7, Harvard, Chicago, Vancouver, IEEE, and MLA formats
- **Citation-Aware Writing** — Draft prose with inline citations drawn from your library and search results
- **Research Agent** — Autonomous multi-step research: decomposes questions, searches databases, follows citation chains, produces cited synthesis

## Installation

### Claude Code (Full Plugin)

```bash
git clone https://github.com/larrygmaguire-hash/prima-scholar.git
cd prima-scholar

# Build both MCP servers
cd mcp-servers/prima-scholar-search-mcp && npm install && npm run build && cd ../..
cd mcp-servers/prima-scholar-library-mcp && npm install && npm run build && cd ../..

# Load the plugin (use the path where you cloned it)
claude --plugin-dir ./prima-scholar
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

You can install either server independently. The search server has no dependency on the library server.

## Configuration

All optional. The plugin works with zero configuration.

| Variable | Purpose | Default |
|----------|---------|---------|
| `PUBMED_API_KEY` | Increases PubMed rate limit (3/sec to 10/sec) | None |
| `SEMANTIC_SCHOLAR_KEY` | Increases Semantic Scholar rate limit | None |
| `CROSSREF_MAILTO` | Enters CrossRef polite pool for better rate limits | None |
| `RESEARCH_LIBRARY_PATH` | Custom database file location | `~/.research-library/library.db` |

## Citation Styles

PRIMA Scholar supports multiple academic citation formats. Specify your preferred style when searching or writing.

| Style | Example |
|-------|---------|
| **APA7** | Dweck, C. S. (2006). *Mindset: The new psychology of success*. Random House. |
| **Harvard** | Dweck, C.S. (2006) *Mindset: The new psychology of success*. Random House. |
| **Chicago** | Dweck, Carol S. *Mindset: The New Psychology of Success*. Random House, 2006. |
| **Vancouver** | Dweck CS. Mindset: the new psychology of success. Random House; 2006. |
| **IEEE** | C. S. Dweck, *Mindset: The New Psychology of Success*. Random House, 2006. |
| **MLA** | Dweck, Carol S. *Mindset: The New Psychology of Success*. Random House, 2006. |

Default style is APA7. Set your preference with the `citation_style` parameter on any search or citation tool.

## Commands (Claude Code)

| Command | Description |
|---------|-------------|
| `/scholar [topic]` | Start a research session |
| `/cite [DOI or title]` | Quick citation lookup |
| `/library [action]` | Library management: import, search, collections, stats |

## Skills (Claude Code)

| Skill | Triggers |
|-------|----------|
| `researching-topics` | "research [topic]", "find papers on", "literature review" |
| `managing-research-library` | "import this paper", "search my library", "organise research" |
| `writing-with-citations` | "write with citations", "draft with references", "write in Harvard style" |

## MCP Tools

### Search Server (11 tools)

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
| `crossref_resolve_doi` | Resolve DOI to full metadata and citation |

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

| API | Coverage | Rate Limit (Free) |
|-----|----------|-------------------|
| [PubMed](https://pubmed.ncbi.nlm.nih.gov/) | Biomedical, life sciences | 3 req/sec |
| [arXiv](https://arxiv.org/) | Physics, maths, CS, biology, finance | 1 req/3sec |
| [Semantic Scholar](https://www.semanticscholar.org/) | All disciplines, citation graphs | 100 req/5min |
| [CrossRef](https://www.crossref.org/) | DOI metadata, all disciplines | 50 req/sec |

## Requirements

- Node.js 18+
- npm

## Part of the PRIMA Ecosystem

PRIMA Scholar is one of several PRIMA tools for Claude Code:

- **[PRIMA](https://github.com/larrygmaguire-hash/prima-plugin)** — Project recording, indexing, and management
- **[PRIMA Memory](https://github.com/larrygmaguire-hash/prima-memory)** — Session history and context recovery
- **PRIMA Scholar** — Academic search and citation management (this plugin)

## Licence

MIT
