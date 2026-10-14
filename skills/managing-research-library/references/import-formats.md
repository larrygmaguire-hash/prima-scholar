# Import Formats Reference

## Supported File Types

`library_import` accepts four file extensions. Any other extension is rejected with "Unsupported file type".

| Type | Extension | Stored `file_type` | Title Taken From | Other Data Extracted |
|------|-----------|--------------------|------------------|----------------------|
| PDF | `.pdf` | `pdf` | The PDF's embedded Title property; if empty, the first non-empty line of text (up to 200 characters); if none, the file name | Full text (if the PDF has a text layer). The embedded Author, Subject, Keywords and Creator properties and the page count, when present, are saved in the `metadata` JSON field. They are not copied into `authors` or any other field |
| Word | `.docx` | `docx` | The first non-empty line of text (up to 200 characters); if none, the file name | Full text only. Document properties are not read |
| Markdown | `.md` | `markdown` | The first `# ` heading; if none, the file name | Full text only. YAML front matter is not parsed; it is stored as part of the text |
| Plain text | `.txt` | `text` | The file name without its extension | Full text only |

The importers do not extract a DOI, publication year, abstract, author list or journal from any file. Those fields stay empty unless they are supplied in the `library_import` call (`authors`, `year`, `doi`, `notes`, and `title` to override the detected title) or added later with `library_update`.

## Fields Stored for Each Document

| Field | How It Is Set |
|-------|---------------|
| `title` | Detected by the importer (see above), or the `title` argument; `library_import_from_search` requires it. Changeable with `library_update` |
| `authors` | Only from the `authors` argument (a JSON array string, e.g. `["Smith, J."]`) on `library_import` or `library_import_from_search`, or from `library_update` |
| `year` | Only from the `year` argument on either import tool, or from `library_update` |
| `doi` | Only from the `doi` argument on either import tool, or from `library_update` |
| `abstract` | Only from the `abstract` argument on `library_import_from_search`, or from `library_update`. `library_import` has no abstract argument |
| `content` | The extracted full text, set by `library_import`. Records added with `library_import_from_search` have no content |
| `source_url` | Only from the `source_url` argument on `library_import_from_search` |
| `file_path` | The path given to `library_import` |
| `file_type` | `pdf`, `docx`, `markdown` or `text` from `library_import`; `reference` for records added with `library_import_from_search` |
| `notes` | The `notes` argument on `library_import`, or `library_update` |
| `metadata` | JSON. PDF properties (see above) from `library_import`; the `source` argument from `library_import_from_search` |
| `citations` | JSON keyed by citation style. Only from the `citations` argument on `library_import_from_search` |
| `date_added` | Set automatically when the record is created |

Tags and collections are stored separately and attached with `library_tag` and `library_add_to_collection`. There is no `journal`, `type` or ISSN field, and the library does not generate citation strings itself.

The search index covers `title`, `authors`, `abstract`, `content` and `notes`.

## Metadata Enrichment via DOI

When the user supplies a DOI, call `scholar_get_paper` with it, then call `library_update` to write back the fields the library can hold: `title`, `authors`, `year`, `doi` and `abstract`.

`scholar_get_paper` also returns the journal, volume, issue, pages, publisher, author affiliations and formatted citations. `library_update` has no field for any of these. To keep them, add the details to `notes`, or add the paper as a reference record with `library_import_from_search`, which stores the formatted citations in `citations`.

## Tips for Good Library Organisation

1. **Tag consistently.** Use lowercase, hyphenated tags (e.g., `self-determination-theory`, `qualitative-methods`). Avoid synonyms: pick one term and stick with it.

2. **Use collections for projects.** Create one collection per writing project, thesis chapter, or research question. A document can belong to multiple collections.

3. **Supply metadata on import.** Pass `authors`, `year` and `doi` to `library_import` when you know them, because the importers do not extract them from the file.

4. **Add notes on import.** A one-line note on why a paper is relevant saves time when revisiting months later.

5. **Review periodically.** `library_stats` gives counts by file type and year and the 20 most used tags; `library_list_collections` gives the number of documents in each collection.

6. **Check for duplicates before importing.** The import tools do not check for an existing record with the same DOI or file path, so importing a file twice creates two records. Search the library by title first.

## Limitations

- Scanned PDFs (image only) yield no extractable text, because OCR is not supported
- Password-protected files cannot be imported
- A PDF the parser cannot read fails with "Failed to parse PDF"
- Very large files (over 100MB) may time out during import
- Title detection depends on how the source file is structured; override it with the `title` argument when the detected title is wrong
