#!/usr/bin/env node
/**
 * Prima Scholar Library MCP Server
 *
 * A Model Context Protocol server providing a local SQLite document
 * library with FTS5 full-text search for research papers, articles,
 * and reference materials.
 *
 * @author PRIMA Contributors
 * @version 1.0.0
 */

import path from "path";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import { LibraryDatabase } from "./database.js";
import { TOOLS } from "./tools.js";
import { importTextFile } from "./importers/text-importer.js";
import { importPdf } from "./importers/pdf-importer.js";
import { importDocx } from "./importers/docx-importer.js";
import type { ImportResult } from "./types.js";

// Resolve database path
const home = process.env.HOME ?? process.env.USERPROFILE ?? "";
const rawDbPath =
  process.env.RESEARCH_LIBRARY_PATH ?? "~/.research-library/library.db";
const dbPath = rawDbPath.startsWith("~")
  ? path.join(home, rawDbPath.slice(1))
  : rawDbPath;

// Initialise database
const db = new LibraryDatabase(dbPath);

// Create MCP server
const server = new Server(
  {
    name: "prima-scholar-library-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Handle tool listing
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: TOOLS };
});

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "library_import": {
        const filePath = args?.file_path as string;
        if (!filePath) {
          throw new McpError(ErrorCode.InvalidParams, "file_path is required");
        }

        const ext = path.extname(filePath).toLowerCase();
        let extracted: {
          title: string;
          content: string;
          fileType: string;
          metadata?: Record<string, string>;
        };

        switch (ext) {
          case ".pdf":
            extracted = await importPdf(filePath);
            break;
          case ".docx":
            extracted = await importDocx(filePath);
            break;
          case ".md":
          case ".txt":
            extracted = importTextFile(filePath);
            break;
          default:
            throw new McpError(
              ErrorCode.InvalidParams,
              `Unsupported file type: ${ext}. Supported: .pdf, .docx, .md, .txt`
            );
        }

        const id = db.insertDocument({
          title: (args?.title as string) ?? extracted.title,
          authors: (args?.authors as string) ?? null,
          content: extracted.content,
          year: (args?.year as number) ?? null,
          doi: (args?.doi as string) ?? null,
          filePath: filePath,
          fileType: extracted.fileType,
          notes: (args?.notes as string) ?? null,
          metadata: extracted.metadata
            ? JSON.stringify(extracted.metadata)
            : null,
        });

        const result: ImportResult = {
          id,
          title: (args?.title as string) ?? extracted.title,
          extractedLength: extracted.content.length,
          fileType: extracted.fileType,
        };

        return {
          content: [
            { type: "text", text: JSON.stringify(result, null, 2) },
          ],
        };
      }

      case "library_import_from_search": {
        const title = args?.title as string;
        const authors = args?.authors as string;
        if (!title || !authors) {
          throw new McpError(
            ErrorCode.InvalidParams,
            "title and authors are required"
          );
        }

        // Accept citations as Record<string, string> from search Paper format
        const rawCitations = args?.citations;
        let citationsStr: string | null = null;
        if (rawCitations && typeof rawCitations === "object") {
          citationsStr = JSON.stringify(rawCitations);
        }

        const metadata: Record<string, unknown> = {};
        if (args?.source) metadata.source = args.source as string;

        const id = db.insertDocument({
          title,
          authors,
          abstract: (args?.abstract as string) ?? null,
          year: (args?.year as number) ?? null,
          doi: (args?.doi as string) ?? null,
          sourceUrl: (args?.source_url as string) ?? null,
          fileType: "reference",
          citations: citationsStr,
          metadata: Object.keys(metadata).length > 0
            ? JSON.stringify(metadata)
            : null,
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ id, title, status: "added" }, null, 2),
            },
          ],
        };
      }

      case "library_search": {
        const query = args?.query as string;
        if (!query) {
          throw new McpError(ErrorCode.InvalidParams, "query is required");
        }
        const maxResults = (args?.max_results as number) ?? 10;
        const results = db.searchDocuments(query, maxResults);
        return {
          content: [
            { type: "text", text: JSON.stringify(results, null, 2) },
          ],
        };
      }

      case "library_get_document": {
        const id = args?.id as number;
        if (id === undefined || id === null) {
          throw new McpError(ErrorCode.InvalidParams, "id is required");
        }
        const doc = db.getDocument(id);
        if (!doc) {
          throw new McpError(
            ErrorCode.InvalidParams,
            `Document ${id} not found`
          );
        }
        const tags = db.getDocumentTags(id);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ ...doc, tags }, null, 2),
            },
          ],
        };
      }

      case "library_list": {
        const results = db.listDocuments({
          collection: args?.collection as string | undefined,
          tag: args?.tag as string | undefined,
          year: args?.year as number | undefined,
          fileType: args?.file_type as string | undefined,
          limit: (args?.max_results as number) ?? 20,
          offset: (args?.offset as number) ?? 0,
        });
        return {
          content: [
            { type: "text", text: JSON.stringify(results, null, 2) },
          ],
        };
      }

      case "library_update": {
        const id = args?.id as number;
        if (id === undefined || id === null) {
          throw new McpError(ErrorCode.InvalidParams, "id is required");
        }
        const updated = db.updateDocument(id, {
          title: args?.title as string | undefined,
          authors: args?.authors as string | undefined,
          notes: args?.notes as string | undefined,
          year: args?.year as number | undefined,
          doi: args?.doi as string | undefined,
          abstract: args?.abstract as string | undefined,
        });
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                { id, updated, status: updated ? "updated" : "no changes" },
                null,
                2
              ),
            },
          ],
        };
      }

      case "library_delete": {
        const id = args?.id as number;
        if (id === undefined || id === null) {
          throw new McpError(ErrorCode.InvalidParams, "id is required");
        }
        const deleted = db.deleteDocument(id);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                { id, deleted, status: deleted ? "deleted" : "not found" },
                null,
                2
              ),
            },
          ],
        };
      }

      case "library_create_collection": {
        const collName = args?.name as string;
        if (!collName) {
          throw new McpError(ErrorCode.InvalidParams, "name is required");
        }
        const collId = db.createCollection(
          collName,
          args?.description as string | undefined
        );
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                { id: collId, name: collName, status: "created" },
                null,
                2
              ),
            },
          ],
        };
      }

      case "library_list_collections": {
        const collections = db.listCollections();
        return {
          content: [
            { type: "text", text: JSON.stringify(collections, null, 2) },
          ],
        };
      }

      case "library_add_to_collection": {
        const docId = args?.document_id as number;
        const collName = args?.collection_name as string;
        if (docId === undefined || !collName) {
          throw new McpError(
            ErrorCode.InvalidParams,
            "document_id and collection_name are required"
          );
        }

        const collection = db.getCollectionByName(collName);
        if (!collection) {
          throw new McpError(
            ErrorCode.InvalidParams,
            `Collection "${collName}" not found`
          );
        }

        const added = db.addToCollection(docId, collection.id);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  document_id: docId,
                  collection: collName,
                  status: added ? "added" : "already in collection",
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case "library_tag": {
        const docId = args?.document_id as number;
        const tagName = args?.tag_name as string;
        const action = args?.action as string;
        if (docId === undefined || !tagName || !action) {
          throw new McpError(
            ErrorCode.InvalidParams,
            "document_id, tag_name, and action are required"
          );
        }

        let success: boolean;
        if (action === "add") {
          success = db.addTag(docId, tagName);
        } else if (action === "remove") {
          success = db.removeTag(docId, tagName);
        } else {
          throw new McpError(
            ErrorCode.InvalidParams,
            'action must be "add" or "remove"'
          );
        }

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                { document_id: docId, tag: tagName, action, success },
                null,
                2
              ),
            },
          ],
        };
      }

      case "library_stats": {
        const stats = db.getStats();
        return {
          content: [
            { type: "text", text: JSON.stringify(stats, null, 2) },
          ],
        };
      }

      default:
        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
    }
  } catch (error) {
    if (error instanceof McpError) {
      throw error;
    }
    const message = error instanceof Error ? error.message : String(error);
    throw new McpError(
      ErrorCode.InternalError,
      `Library error: ${message}`
    );
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`Prima Scholar Library MCP Server running on stdio (db: ${dbPath})`);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
