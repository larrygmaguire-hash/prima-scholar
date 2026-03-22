/**
 * Shared type definitions for the PRIMA Scholar Search MCP server.
 */

export interface Author {
  name: string;
  affiliations?: string[];
}

export interface Paper {
  title: string;
  authors: Author[];
  abstract: string;
  year: number;
  journal?: string;
  doi?: string;
  url: string;
  source: "pubmed" | "arxiv" | "semantic_scholar" | "crossref";
  sourceId: string;
  citationCount?: number;
  keywords?: string[];
  apa7Citation: string;
}

export interface SearchResult {
  papers: Paper[];
  totalResults: number;
  query: string;
  sources: string[];
}

export interface SearchOptions {
  maxResults?: number;
}
