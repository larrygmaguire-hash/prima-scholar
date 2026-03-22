/**
 * Type definitions for the Prima Scholar Library
 */

export interface Document {
  id: number;
  title: string;
  authors: string | null;      // JSON array string
  abstract: string | null;
  content: string | null;
  year: number | null;
  doi: string | null;
  sourceUrl: string | null;
  filePath: string | null;
  fileType: string | null;
  dateAdded: string;
  notes: string | null;
  metadata: string | null;     // JSON blob
}

export interface Collection {
  id: number;
  name: string;
  description: string | null;
  dateCreated: string;
  documentCount?: number;
}

export interface Tag {
  id: number;
  name: string;
}

export interface SearchResult {
  id: number;
  title: string;
  authors: string | null;
  year: number | null;
  snippet: string;             // FTS5 snippet
  rank: number;
}

export interface LibraryStats {
  totalDocuments: number;
  byType: Record<string, number>;
  byYear: Record<string, number>;
  topTags: { name: string; count: number }[];
  totalCollections: number;
}

export interface ImportResult {
  id: number;
  title: string;
  extractedLength: number;
  fileType: string;
}
