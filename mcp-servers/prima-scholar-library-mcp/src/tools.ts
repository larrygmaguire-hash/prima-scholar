/**
 * MCP Tool Definitions for Prima Scholar Library
 *
 * Each tool defines its name, description, and input schema.
 */

export const TOOLS = [
  {
    name: "library_import",
    description:
      "Import a local file (PDF, DOCX, Markdown, or plain text) into the research library. Extracts text content and indexes it for full-text search.",
    inputSchema: {
      type: "object",
      properties: {
        file_path: {
          type: "string",
          description: "Absolute path to the file to import.",
        },
        title: {
          type: "string",
          description:
            "Override the auto-detected title. If omitted, the title is extracted from the document.",
        },
        authors: {
          type: "string",
          description:
            'JSON array of author names, e.g. \'["Smith, J.", "Doe, A."]\'.',
        },
        year: {
          type: "number",
          description: "Publication year.",
        },
        doi: {
          type: "string",
          description: "Digital Object Identifier.",
        },
        notes: {
          type: "string",
          description: "Free-text notes about this document.",
        },
      },
      required: ["file_path"],
    },
  },
  {
    name: "library_import_from_search",
    description:
      "Add a document to the library from search/research metadata (no local file). Use this when you have bibliographic details from a database search, web lookup, or citation.",
    inputSchema: {
      type: "object",
      properties: {
        title: {
          type: "string",
          description: "Document title.",
        },
        authors: {
          type: "string",
          description:
            'JSON array of author names, e.g. \'["Smith, J.", "Doe, A."]\'.',
        },
        abstract: {
          type: "string",
          description: "Document abstract.",
        },
        year: {
          type: "number",
          description: "Publication year.",
        },
        doi: {
          type: "string",
          description: "Digital Object Identifier.",
        },
        source_url: {
          type: "string",
          description: "URL where the document can be accessed.",
        },
        source: {
          type: "string",
          description:
            "Source database or platform (e.g. PubMed, Semantic Scholar, Google Scholar).",
        },
      },
      required: ["title", "authors"],
    },
  },
  {
    name: "library_search",
    description:
      "Full-text search across all documents in the library. Returns ranked results with highlighted snippets from matching content.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description:
            "Search query. Supports FTS5 syntax: AND, OR, NOT, phrase matching with quotes, prefix matching with *.",
        },
        max_results: {
          type: "number",
          description: "Maximum number of results to return. Default is 10.",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "library_get_document",
    description:
      "Get full details of a single document by its ID, including content, metadata, and tags.",
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "number",
          description: "Document ID.",
        },
      },
      required: ["id"],
    },
  },
  {
    name: "library_list",
    description:
      "List documents in the library with optional filtering by collection, tag, year, or file type. Returns documents sorted by date added (newest first).",
    inputSchema: {
      type: "object",
      properties: {
        collection: {
          type: "string",
          description: "Filter by collection name.",
        },
        tag: {
          type: "string",
          description: "Filter by tag name.",
        },
        year: {
          type: "number",
          description: "Filter by publication year.",
        },
        file_type: {
          type: "string",
          description:
            "Filter by file type (e.g. pdf, docx, markdown, text).",
        },
        max_results: {
          type: "number",
          description: "Maximum number of results. Default is 20.",
        },
        offset: {
          type: "number",
          description: "Number of results to skip for pagination. Default is 0.",
        },
      },
      required: [],
    },
  },
  {
    name: "library_update",
    description:
      "Update metadata fields on an existing document. Only the fields provided will be changed.",
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "number",
          description: "Document ID to update.",
        },
        title: {
          type: "string",
          description: "New title.",
        },
        authors: {
          type: "string",
          description: 'Updated authors as JSON array string.',
        },
        notes: {
          type: "string",
          description: "Updated notes.",
        },
        year: {
          type: "number",
          description: "Updated publication year.",
        },
        doi: {
          type: "string",
          description: "Updated DOI.",
        },
        abstract: {
          type: "string",
          description: "Updated abstract.",
        },
      },
      required: ["id"],
    },
  },
  {
    name: "library_delete",
    description:
      "Permanently delete a document from the library. This removes the database record and search index entry. The original file on disk is not affected.",
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "number",
          description: "Document ID to delete.",
        },
      },
      required: ["id"],
    },
  },
  {
    name: "library_create_collection",
    description:
      "Create a new collection for organising documents. Collections are named groups (e.g. 'Attachment Theory', 'Q1 Literature Review').",
    inputSchema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Collection name. Must be unique.",
        },
        description: {
          type: "string",
          description: "Optional description of the collection's purpose.",
        },
      },
      required: ["name"],
    },
  },
  {
    name: "library_list_collections",
    description:
      "List all collections with their document counts.",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "library_add_to_collection",
    description:
      "Add a document to a collection by document ID and collection name.",
    inputSchema: {
      type: "object",
      properties: {
        document_id: {
          type: "number",
          description: "Document ID.",
        },
        collection_name: {
          type: "string",
          description: "Name of the collection to add the document to.",
        },
      },
      required: ["document_id", "collection_name"],
    },
  },
  {
    name: "library_tag",
    description:
      "Add or remove a tag on a document. Tags are created automatically if they do not exist.",
    inputSchema: {
      type: "object",
      properties: {
        document_id: {
          type: "number",
          description: "Document ID.",
        },
        tag_name: {
          type: "string",
          description: "Tag name.",
        },
        action: {
          type: "string",
          enum: ["add", "remove"],
          description: "Whether to add or remove the tag.",
        },
      },
      required: ["document_id", "tag_name", "action"],
    },
  },
  {
    name: "library_stats",
    description:
      "Get aggregate statistics about the library: total documents, breakdown by type and year, top tags, and collection count.",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
];
