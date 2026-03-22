# Import Formats Reference

## Supported File Types

| Type | Extension | What Gets Extracted |
|------|-----------|-------------------|
| PDF | `.pdf` | Full text (if not scanned), embedded metadata (title, author, DOI, year), abstract |
| Word | `.docx` | Full text, document properties (title, author, subject) |
| Plain text | `.txt` | Full text only — no structured metadata |
| Markdown | `.md` | Full text, YAML frontmatter if present (title, author, date) |

## Metadata Fields

Each library document stores the following metadata:

| Field | Source | Notes |
|-------|--------|-------|
| `title` | Extracted or manual | Required — prompted if not detected |
| `authors` | Extracted or manual | List of author names |
| `year` | Extracted or manual | Publication year |
| `doi` | Extracted or manual | Digital Object Identifier |
| `journal` | CrossRef enrichment | Journal or conference name |
| `abstract` | Extracted | First 500 words if available |
| `type` | Auto-detected | journal-article, book, chapter, preprint, report, thesis, other |
| `tags` | User-assigned | Freeform labels for organisation |
| `collections` | User-assigned | Named groups of related documents |
| `notes` | User-added | Personal annotations |
| `date_added` | Auto-generated | Timestamp of import |
| `citation_apa7` | Auto-generated | APA7 formatted citation string |

## Metadata Enrichment via DOI

When a DOI is available (extracted from PDF or provided by user), call `crossref_resolve_doi` to populate:

- Complete author list with institutional affiliations
- Full journal name and volume/issue/pages
- Publication date
- ISSN/ISBN
- APA7 citation string

This is the most reliable way to get accurate metadata. Always attempt DOI enrichment before falling back to extracted or manual metadata.

## Tips for Good Library Organisation

1. **Tag consistently.** Use lowercase, hyphenated tags (e.g., `self-determination-theory`, `qualitative-methods`). Avoid synonyms — pick one term and stick with it.

2. **Use collections for projects.** Create one collection per writing project, thesis chapter, or research question. A document can belong to multiple collections.

3. **Import early.** Import papers as you find them during research sessions. Metadata is easier to verify while the context is fresh.

4. **Add notes on import.** A one-line note on why a paper is relevant saves time when revisiting months later.

5. **Review periodically.** Run `library_stats` to check for untagged or uncollected documents. Orphaned documents are harder to find later.

## Limitations

- Scanned PDFs (image-only) will not yield extractable text — OCR is not currently supported
- Password-protected files cannot be imported
- Very large files (over 100MB) may time out during import
- Metadata extraction quality depends on how well the source file is structured
