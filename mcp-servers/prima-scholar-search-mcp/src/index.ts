#!/usr/bin/env node
/**
 * PRIMA Scholar Search MCP Server v2.0.0
 *
 * A Model Context Protocol server for searching academic literature
 * across 10 databases: PubMed, arXiv, Semantic Scholar, CrossRef,
 * OpenAlex, CORE, Europe PMC, ERIC, bioRxiv/medRxiv, and DBLP.
 *
 * 5-tool surface: wizard, search, get_paper, citations, full_text.
 *
 * @author PRIMA Contributors
 * @version 2.0.0
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
import { OpenAlexClient } from "./openalex-client.js";
import { CoreClient } from "./core-client.js";
import { EuropePmcClient } from "./europepmc-client.js";
import { EricClient } from "./eric-client.js";
import { BiorxivClient } from "./biorxiv-client.js";
import { DblpClient } from "./dblp-client.js";
import { TOOLS } from "./tools.js";
import { CitationStyle, Paper, SourceName, ALL_SOURCES, SearchOptions } from "./types.js";
import { deduplicateByDoi } from "./utils.js";
import { runWizard } from "./wizard.js";

// ── Citation Filtering ───────────────────────────────────────────────

function filterCitations(paper: Paper, style?: CitationStyle): Paper {
  if (!style) return paper;
  const citation = paper.citations[style];
  return { ...paper, citations: citation ? { [style]: citation } : {} };
}

function filterPapersCitations(papers: Paper[], style?: CitationStyle): Paper[] {
  if (!style) return papers;
  return papers.map((p) => filterCitations(p, style));
}

// ── Client Initialisation ────────────────────────────────────────────

const pubmedClient = new PubMedClient();
const arxivClient = new ArxivClient();
const semanticClient = new SemanticScholarClient();
const crossrefClient = new CrossRefClient();
const openalexClient = new OpenAlexClient();
const coreClient = new CoreClient();
const europepmcClient = new EuropePmcClient();
const ericClient = new EricClient();
const biorxivClient = new BiorxivClient();
const dblpClient = new DblpClient();

// Source routing map
const SOURCE_CLIENTS: Record<SourceName, { search: (q: string, o?: SearchOptions) => Promise<Paper[]>; getPaper: (id: string) => Promise<Paper> }> = {
  pubmed: pubmedClient,
  arxiv: arxivClient,
  semantic_scholar: semanticClient,
  crossref: crossrefClient,
  openalex: openalexClient,
  core: coreClient,
  europe_pmc: europepmcClient,
  eric: ericClient,
  biorxiv: biorxivClient,
  dblp: dblpClient,
};

// Sources that require API keys
const API_KEY_SOURCES: Record<string, { envVar: string; url: string }> = {
  core: { envVar: "CORE_API_KEY", url: "https://core.ac.uk/services/api" },
};

// ── MCP Server ───────────────────────────────────────────────────────

const server = new Server(
  {
    name: "prima-scholar-search-mcp",
    version: "2.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: TOOLS };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      // ── Wizard ───────────────────────────────────────────────
      case "scholar_wizard": {
        const query = args?.query as string;
        if (!query) throw new McpError(ErrorCode.InvalidParams, "query is required");

        const result = runWizard(query);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      // ── Search ───────────────────────────────────────────────
      case "scholar_search": {
        const query = args?.query as string;
        if (!query) throw new McpError(ErrorCode.InvalidParams, "query is required");

        const maxResults = (args?.max_results as number) ?? 10;
        const sources = (args?.sources as SourceName[]) ?? ALL_SOURCES;
        const openAccessOnly = (args?.open_access_only as boolean) ?? false;
        const yearFrom = args?.year_from as number | undefined;
        const yearTo = args?.year_to as number | undefined;
        const citationStyle = args?.citation_style as CitationStyle | undefined;

        const searchOptions: SearchOptions = {
          maxResults,
          yearFrom,
          yearTo,
          openAccessOnly,
        };

        const results = await aggregatedSearch(query, sources, searchOptions);

        if (citationStyle) {
          results.papers = filterPapersCitations(results.papers, citationStyle);
        }

        return {
          content: [{ type: "text", text: JSON.stringify(results, null, 2) }],
        };
      }

      // ── Get Paper ────────────────────────────────────────────
      case "scholar_get_paper": {
        const id = args?.id as string;
        if (!id) throw new McpError(ErrorCode.InvalidParams, "id is required");
        const citationStyle = args?.citation_style as CitationStyle | undefined;

        const paper = await routeGetPaper(id);
        const filtered = citationStyle ? filterCitations(paper, citationStyle) : paper;

        return {
          content: [{ type: "text", text: JSON.stringify(filtered, null, 2) }],
        };
      }

      // ── Citations ────────────────────────────────────────────
      case "scholar_citations": {
        const paperId = args?.paper_id as string;
        if (!paperId) throw new McpError(ErrorCode.InvalidParams, "paper_id is required");

        const direction = (args?.direction as string) ?? "citations";
        const maxResults = (args?.max_results as number) ?? 10;

        let papers: Paper[];
        if (direction === "references") {
          papers = await semanticClient.getReferences(paperId, { maxResults });
        } else {
          papers = await semanticClient.getCitations(paperId, { maxResults });
        }

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  papers,
                  totalResults: papers.length,
                  direction,
                  source: "semantic_scholar",
                },
                null,
                2
              ),
            },
          ],
        };
      }

      // ── Full Text ────────────────────────────────────────────
      case "scholar_full_text": {
        const id = args?.id as string;
        if (!id) throw new McpError(ErrorCode.InvalidParams, "id is required");

        const fullText = await retrieveFullText(id);

        return {
          content: [{ type: "text", text: JSON.stringify(fullText, null, 2) }],
        };
      }

      default:
        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
    }
  } catch (error) {
    if (error instanceof McpError) throw error;
    const message = error instanceof Error ? error.message : String(error);
    throw new McpError(ErrorCode.InternalError, `Scholar search error: ${message}`);
  }
});

// ── Aggregated Search ────────────────────────────────────────────────

async function aggregatedSearch(
  query: string,
  sources: SourceName[],
  options: SearchOptions
): Promise<{
  papers: Paper[];
  totalResults: number;
  openAccessCount: number;
  gatedCount: number;
  query: string;
  sources: string[];
  errors?: string[];
  missingApiKeys?: string[];
}> {
  const activeSources: SourceName[] = [];
  const missingApiKeys: string[] = [];

  // Check which sources are available
  for (const source of sources) {
    const keyInfo = API_KEY_SOURCES[source];
    if (keyInfo && !process.env[keyInfo.envVar]) {
      missingApiKeys.push(
        `${source}: API key not configured. Set ${keyInfo.envVar} in your environment. ` +
        `Get a free key at ${keyInfo.url}`
      );
      continue;
    }
    activeSources.push(source);
  }

  if (activeSources.length === 0) {
    throw new Error(
      `No sources available. Missing API keys:\n${missingApiKeys.join("\n")}`
    );
  }

  // Fan out to all active sources in parallel
  const searchPromises = activeSources.map(async (source) => {
    const client = SOURCE_CLIENTS[source];
    return client.search(query, options);
  });

  const results = await Promise.allSettled(searchPromises);

  const allPapers: Paper[] = [];
  const successfulSources: string[] = [];
  const errors: string[] = [];

  results.forEach((result, index) => {
    const source = activeSources[index];
    if (result.status === "fulfilled") {
      allPapers.push(...result.value);
      successfulSources.push(source);
    } else {
      errors.push(`${source}: ${result.reason?.message ?? String(result.reason)}`);
    }
  });

  if (successfulSources.length === 0) {
    throw new Error(`All sources failed:\n${errors.join("\n")}`);
  }

  // Deduplicate by DOI
  let deduplicated = deduplicateByDoi(allPapers);

  // Filter to OA only if requested
  if (options.openAccessOnly) {
    deduplicated = deduplicated.filter((p) => p.openAccess);
  }

  // Sort: OA first, then by citation count descending
  deduplicated.sort((a, b) => {
    // OA papers first
    if (a.openAccess && !b.openAccess) return -1;
    if (!a.openAccess && b.openAccess) return 1;
    // Then by citation count
    const aCount = a.citationCount ?? -1;
    const bCount = b.citationCount ?? -1;
    return bCount - aCount;
  });

  const openAccessCount = deduplicated.filter((p) => p.openAccess).length;
  const gatedCount = deduplicated.length - openAccessCount;

  return {
    papers: deduplicated,
    totalResults: deduplicated.length,
    openAccessCount,
    gatedCount,
    query,
    sources: successfulSources,
    ...(errors.length > 0 ? { errors } : {}),
    ...(missingApiKeys.length > 0 ? { missingApiKeys } : {}),
  };
}

// ── Paper ID Routing ─────────────────────────────────────────────────

async function routeGetPaper(id: string): Promise<Paper> {
  // Route based on ID format
  if (id.startsWith("PMID:")) {
    return pubmedClient.getPaper(id.replace("PMID:", ""));
  }
  if (id.startsWith("ARXIV:") || id.startsWith("arxiv:")) {
    return arxivClient.getPaper(id.replace(/^ARXIV:|^arxiv:/, ""));
  }
  if (id.startsWith("W") && /^W\d+$/.test(id)) {
    return openalexClient.getPaper(id);
  }
  if (id.startsWith("https://openalex.org/")) {
    return openalexClient.getPaper(id);
  }
  if (/^(EJ|ED)\d+$/.test(id)) {
    return ericClient.getPaper(id);
  }
  if (id.startsWith("PMC")) {
    return europepmcClient.getPaper(id);
  }

  // DOI — try Semantic Scholar first (has citation data), fall back to CrossRef
  if (id.startsWith("DOI:") || id.startsWith("doi:") || id.includes("10.")) {
    const doiId = id.replace(/^DOI:|^doi:/, "").trim();
    try {
      return await semanticClient.getPaper(`DOI:${doiId}`);
    } catch {
      return await crossrefClient.resolveDoi(doiId);
    }
  }

  // Default: try Semantic Scholar (accepts its own IDs)
  return semanticClient.getPaper(id);
}

// ── Full Text Retrieval ──────────────────────────────────────────────

async function retrieveFullText(id: string): Promise<{
  fullText?: string;
  downloadUrl?: string;
  source: string;
  message?: string;
}> {
  // Try CORE first (has full-text API)
  if (coreClient.isConfigured()) {
    try {
      const coreId = id.replace(/^CORE:/, "");
      const text = await coreClient.getFullText(coreId);
      if (text) {
        return { fullText: text, source: "core" };
      }
    } catch {
      // Fall through to Europe PMC
    }
  }

  // Try Europe PMC for PMC content
  if (id.startsWith("PMC") || id.startsWith("PMID:") || id.includes("10.")) {
    try {
      const paper = await europepmcClient.getPaper(id.replace("PMID:", ""));
      if (paper.fullTextAvailable && paper.openAccessUrl) {
        return {
          downloadUrl: paper.openAccessUrl,
          source: "europe_pmc",
          message: "Full text available via Europe PMC. Use the downloadUrl to access.",
        };
      }
    } catch {
      // Fall through
    }
  }

  // Try arXiv (always has PDF)
  if (id.startsWith("ARXIV:") || id.startsWith("arxiv:") || id.match(/^\d{4}\.\d+/)) {
    const arxivId = id.replace(/^ARXIV:|^arxiv:/, "");
    return {
      downloadUrl: `https://arxiv.org/pdf/${arxivId}`,
      source: "arxiv",
      message: "PDF available from arXiv.",
    };
  }

  // Try bioRxiv/medRxiv
  if (id.includes("10.1101/")) {
    return {
      downloadUrl: `https://doi.org/${id}`,
      source: "biorxiv",
      message: "Preprint available from bioRxiv/medRxiv.",
    };
  }

  return {
    source: "none",
    message:
      "Full text not available through PRIMA Scholar. " +
      "The paper may be behind a paywall. Check your institutional access or the publisher's website.",
  };
}

// ── Start Server ─────────────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("PRIMA Scholar Search MCP Server v2.0.0 running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
