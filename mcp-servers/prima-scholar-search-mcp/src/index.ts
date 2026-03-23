#!/usr/bin/env node
/**
 * PRIMA Scholar Search MCP Server
 *
 * A Model Context Protocol server for searching academic literature
 * across PubMed, arXiv, Semantic Scholar, and CrossRef.
 *
 * @author PRIMA Contributors
 * @version 1.0.0
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import { PubMedClient } from "./pubmed-client.js";
import { ArxivClient } from "./arxiv-client.js";
import { SemanticScholarClient } from "./semantic-scholar-client.js";
import { CrossRefClient } from "./crossref-client.js";
import { TOOLS } from "./tools.js";
import { Paper } from "./types.js";
import { deduplicateByDoi } from "./utils.js";

// Initialise API clients — no required env vars (all optional)
const pubmedClient = new PubMedClient();
const arxivClient = new ArxivClient();
const semanticClient = new SemanticScholarClient();
const crossrefClient = new CrossRefClient();

// Source name mapping
const SOURCE_CLIENTS = {
  pubmed: pubmedClient,
  arxiv: arxivClient,
  semantic_scholar: semanticClient,
  crossref: crossrefClient,
} as const;

type SourceName = keyof typeof SOURCE_CLIENTS;

const ALL_SOURCES: SourceName[] = [
  "pubmed",
  "arxiv",
  "semantic_scholar",
  "crossref",
];

// Create MCP server
const server = new Server(
  {
    name: "prima-scholar-search-mcp",
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
      case "scholar_search": {
        const query = args?.query as string;
        const maxResults = (args?.max_results as number) ?? 10;
        const sources = (args?.sources as SourceName[]) ?? ALL_SOURCES;

        const results = await aggregatedSearch(query, maxResults, sources);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(results, null, 2),
            },
          ],
        };
      }

      case "pubmed_search": {
        const papers = await pubmedClient.search(args?.query as string, {
          maxResults: (args?.max_results as number) ?? 10,
        });
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                { papers, totalResults: papers.length, source: "pubmed" },
                null,
                2
              ),
            },
          ],
        };
      }

      case "pubmed_get_paper": {
        const paper = await pubmedClient.getPaper(args?.pmid as string);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(paper, null, 2),
            },
          ],
        };
      }

      case "arxiv_search": {
        const papers = await arxivClient.search(args?.query as string, {
          maxResults: (args?.max_results as number) ?? 10,
        });
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                { papers, totalResults: papers.length, source: "arxiv" },
                null,
                2
              ),
            },
          ],
        };
      }

      case "arxiv_get_paper": {
        const paper = await arxivClient.getPaper(args?.arxiv_id as string);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(paper, null, 2),
            },
          ],
        };
      }

      case "semantic_search": {
        const papers = await semanticClient.search(args?.query as string, {
          maxResults: (args?.max_results as number) ?? 10,
        });
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  papers,
                  totalResults: papers.length,
                  source: "semantic_scholar",
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case "semantic_get_paper": {
        const paper = await semanticClient.getPaper(
          args?.paper_id as string
        );
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(paper, null, 2),
            },
          ],
        };
      }

      case "semantic_citations": {
        const papers = await semanticClient.getCitations(
          args?.paper_id as string,
          { maxResults: (args?.max_results as number) ?? 10 }
        );
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  papers,
                  totalResults: papers.length,
                  source: "semantic_scholar",
                  type: "citations",
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case "semantic_references": {
        const papers = await semanticClient.getReferences(
          args?.paper_id as string,
          { maxResults: (args?.max_results as number) ?? 10 }
        );
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  papers,
                  totalResults: papers.length,
                  source: "semantic_scholar",
                  type: "references",
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case "crossref_search": {
        const papers = await crossrefClient.search(args?.query as string, {
          maxResults: (args?.max_results as number) ?? 10,
        });
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                { papers, totalResults: papers.length, source: "crossref" },
                null,
                2
              ),
            },
          ],
        };
      }

      case "crossref_resolve_doi": {
        const paper = await crossrefClient.resolveDoi(args?.doi as string);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(paper, null, 2),
            },
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
      `Scholar search error: ${message}`
    );
  }
});

/**
 * Aggregated search across multiple academic databases.
 *
 * Fans out to all requested sources in parallel using Promise.allSettled,
 * merges results, deduplicates by DOI, and sorts by citation count
 * (descending, nulls last).
 */
async function aggregatedSearch(
  query: string,
  maxResults: number,
  sources: SourceName[]
): Promise<{
  papers: Paper[];
  totalResults: number;
  query: string;
  sources: string[];
  errors?: string[];
}> {
  const searchPromises = sources.map(async (source) => {
    switch (source) {
      case "pubmed":
        return pubmedClient.search(query, { maxResults });
      case "arxiv":
        return arxivClient.search(query, { maxResults });
      case "semantic_scholar":
        return semanticClient.search(query, { maxResults });
      case "crossref":
        return crossrefClient.search(query, { maxResults });
    }
  });

  const results = await Promise.allSettled(searchPromises);

  const allPapers: Paper[] = [];
  const successfulSources: string[] = [];
  const errors: string[] = [];

  results.forEach((result, index) => {
    const source = sources[index];
    if (result.status === "fulfilled") {
      allPapers.push(...result.value);
      successfulSources.push(source);
    } else {
      errors.push(`${source}: ${result.reason?.message ?? String(result.reason)}`);
    }
  });

  // Deduplicate by DOI
  const deduplicated = deduplicateByDoi(allPapers);

  // Sort by citation count descending, nulls last
  deduplicated.sort((a, b) => {
    const aCount = a.citationCount ?? -1;
    const bCount = b.citationCount ?? -1;
    return bCount - aCount;
  });

  return {
    papers: deduplicated,
    totalResults: deduplicated.length,
    query,
    sources: successfulSources,
    ...(errors.length > 0 ? { errors } : {}),
  };
}

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("PRIMA Scholar Search MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
