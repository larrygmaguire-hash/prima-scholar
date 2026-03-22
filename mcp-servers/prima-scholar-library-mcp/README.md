# Prima Scholar Library MCP Server

A Model Context Protocol server that provides a local SQLite document library with FTS5 full-text search. Import PDFs, Word documents, Markdown, and plain text files, then search across their content instantly.

## Installation

```bash
cd prima-scholar-library-mcp
npm install
npm run build
```

## Configuration

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "prima-scholar-library": {
      "command": "node",
      "args": ["/path/to/prima-scholar-library-mcp/build/index.js"],
      "env": {
        "RESEARCH_LIBRARY_PATH": "~/.research-library/library.db"
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
    "prima-scholar-library": {
      "command": "node",
      "args": ["/path/to/prima-scholar-library-mcp/build/index.js"],
      "env": {
        "RESEARCH_LIBRARY_PATH": "~/.research-library/library.db"
      }
    }
  }
}
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `RESEARCH_LIBRARY_PATH` | `~/.research-library/library.db` | Path to the SQLite database file. Created automatically if it does not exist. |

## Available Tools

| Tool | Description |
|------|-------------|
| `library_import` | Import a local file (PDF, DOCX, Markdown, plain text) into the library |
| `library_import_from_search` | Add a document from bibliographic metadata (no local file needed) |
| `library_search` | Full-text search across all documents with ranked results and snippets |
| `library_get_document` | Get full details of a document by ID, including tags |
| `library_list` | List documents with optional filtering by collection, tag, year, or file type |
| `library_update` | Update metadata fields on an existing document |
| `library_delete` | Permanently delete a document from the library |
| `library_create_collection` | Create a named collection for organising documents |
| `library_list_collections` | List all collections with document counts |
| `library_add_to_collection` | Add a document to a collection |
| `library_tag` | Add or remove a tag on a document |
| `library_stats` | Get aggregate library statistics |

## Database

The server uses SQLite with FTS5 for full-text search. The database is created automatically on first run and contains:

- **documents** — Core document table with title, authors, abstract, content, year, DOI, file path, and notes
- **documents_fts** — FTS5 virtual table indexing title, authors, abstract, content, and notes
- **collections** — Named groups for organising documents
- **tags** — Labels that can be applied to any document
- **document_collections** / **document_tags** — Many-to-many join tables

FTS triggers keep the search index synchronised automatically on insert, update, and delete.

## Supported File Types

| Extension | Importer | Notes |
|-----------|----------|-------|
| `.pdf` | pdf-parse | Extracts text and metadata (title, author, subject, keywords) |
| `.docx` | mammoth | Extracts raw text content |
| `.md` | Built-in | Extracts title from first heading |
| `.txt` | Built-in | Uses filename as title |
