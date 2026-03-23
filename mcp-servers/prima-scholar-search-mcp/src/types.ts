/**
 * Shared type definitions for the PRIMA Scholar Search MCP server.
 */

export interface Author {
  name: string;
  affiliations?: string[];
}

export type CitationStyle = 'apa7' | 'harvard' | 'chicago' | 'vancouver' | 'ieee' | 'mla';

export interface Paper {
  title: string;
  authors: Author[];
  abstract: string;
  year: number;
  journal?: string;
  volume?: string;
  issue?: string;
  pages?: string;
  publisher?: string;
  doi?: string;
  url: string;
  source: "pubmed" | "arxiv" | "semantic_scholar" | "crossref";
  sourceId: string;
  citationCount?: number;
  keywords?: string[];
  citations: Record<string, string>;
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
