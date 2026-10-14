---
name: managing-research-library
description: Import documents, organise collections, search and manage the local research library. Use when asked to "import this paper", "add to library", "search my library", "organise research", "create a collection", "tag documents", or "library stats".
---

# Managing Research Library

## When to Use

- User wants to import a paper, PDF, or document into the library
- User asks to search, browse, or list documents in the library
- User wants to create or manage collections
- User asks to tag, update, or delete documents
- User wants library statistics or an overview of stored research
- User asks to organise research materials after a search session

## When NOT to Use

- User wants to search academic databases for new papers — use `researching-topics`
- User wants to write prose with citations — use `writing-with-citations`
- User is asking about files that are not research documents (e.g., project files, client documents)

## Workflow

1. **Determine operation type** from the user's request:

### Import

- Accept file path or DOI from user
- Detect file type (PDF, DOCX, TXT, MD)
- Call `library_import` with the file path
- If a DOI is available, enrich metadata via `scholar_get_paper`, then write the fields back with `library_update` (see `references/import-formats.md`)
- Confirm import with the returned ID, title, file type and extracted text length (the importers do not extract authors or year; pass them to `library_import` when known)
- Suggest tagging or collection assignment

### Import from Search

- After a `researching-topics` session, offer to import selected papers
- Call `library_import_from_search` with search result identifiers
- Confirm each import with metadata summary

### Search

- Take query from user
- Call `library_search` with the query
- Present results with: title, authors, year, tags, collections, document ID
- Offer follow-up actions: view full details, add to collection, tag

### Browse

- Call `library_list` with optional filters: collection, tag, year, file type
- Present results in a table
- `library_list` returns documents newest added first; re-order the presented table by year or title if the user asks (there is no citation count field)

### Organise

- **Create collection:** Ask for name and description, call `library_create_collection`
- **Add to collection:** Take document ID(s) and collection name, call `library_add_to_collection`
- **Tag documents:** Take document ID(s) and tag(s), call `library_tag`
- **Bulk organise:** For 3+ documents, process sequentially with confirmation

### View Details

- Call `library_get_document` with document ID
- Present full metadata, abstract, tags, collections, and notes

### Update

- Take document ID and fields to change
- Call `library_update` with new metadata
- Confirm changes

### Delete

- **Action Checkpoint:** Confirm document title and ID before deletion
- Call `library_delete` only after explicit user confirmation
- Deletion is permanent

### Stats

- Call `library_stats`
- Present summary: total documents, documents by type, documents by year, top tags, number of collections (call `library_list_collections` for the number of documents in each)

2. **Auto-enrich metadata** when a DOI is available. Call `scholar_get_paper`, then `library_update` to fill in title, authors, year, DOI and abstract. `library_update` cannot set the journal or formatted citations (see `references/import-formats.md`).

3. **Present results clearly** with document IDs visible for follow-up actions.

## Output Format

### Import Confirmation

```
Imported: [Title]
Authors: [Author list]
Year: [Year]
Type: [PDF/DOCX/etc.]
DOI: [DOI if available]
Document ID: [ID]

Suggested tags: [auto-suggested based on content]
```

### Library Search Results

```
| # | Title | Authors | Year | Tags | Collection | ID |
|---|-------|---------|------|------|------------|----|
```

### Library Stats

```
## Library Statistics

- **Total documents:** [count]
- **By type:** PDF: [n], DOCX: [n], Other: [n]
- **Collections:** [count]
- **Most used tags:** [top 5]
- **Date range:** [earliest year] - [latest year]
```

## Examples

**User:** "Import this paper" [provides file path]
- Call `library_import` with the path
- Confirm the detected title; pass authors, year and DOI if the user has them
- Confirm import, suggest tags

**User:** "Search my library for attachment theory"
- Call `library_search` with "attachment theory"
- Present matching documents with IDs
- Offer to view details or organise

**User:** "Create a collection for my thesis literature review"
- Call `library_create_collection` with name "Thesis Literature Review"
- Confirm creation
- Ask if user wants to add existing documents

**User:** "How many papers do I have?"
- Call `library_stats`
- Present summary

**User:** "Tag documents 12, 15, and 23 as 'motivation'"
- Call `library_tag` for each document with tag "motivation"
- Confirm all three tagged

## Troubleshooting

| Problem | Cause | Fix |
|---------|-------|-----|
| Import fails | Unsupported file type or corrupted file | Check file type against supported formats in `references/import-formats.md` |
| No metadata extracted | PDF has no embedded metadata | Manually provide title/author or use DOI for enrichment via `scholar_get_paper` |
| Search returns nothing | Query too specific or library is empty | Broaden search terms, check `library_stats` to confirm documents exist |
| Duplicate import | Same paper imported twice | Search library by title before importing; use DOI matching when available |
| Cannot find document ID | ID not displayed in previous output | Run `library_search` or `library_list` to retrieve current IDs |
| Collection not found | Name mismatch or not yet created | Run `library_list_collections` to see existing collections |
