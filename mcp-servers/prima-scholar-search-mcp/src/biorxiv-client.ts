/**
 * bioRxiv / medRxiv API client.
 *
 * Queries the bioRxiv and medRxiv preprint servers via their shared API.
 * No authentication required.
 *
 * API docs: https://api.biorxiv.org/
 */

import { Paper, SearchOptions, ScholarClient } from "./types.js";
import { RateLimiter } from "./rate-limiter.js";
import { formatAllCitations } from "./utils.js";

const BASE_URL = "https://api.biorxiv.org";

export class BiorxivClient implements ScholarClient {
  private rateLimiter = new RateLimiter(5, 1000);

  async search(query: string, options?: SearchOptions): Promise<Paper[]> {
    const maxResults = options?.maxResults ?? 10;
    await this.rateLimiter.acquire();

    // bioRxiv content API uses date-range endpoints for listing.
    // For keyword search, use the details endpoint with content search.
    // The public API is limited — use the /details endpoint with date range
    // and filter client-side by query terms.
    const currentYear = new Date().getFullYear();
    const yearFrom = options?.yearFrom ?? currentYear - 1;
    const yearTo = options?.yearTo ?? currentYear;

    const fromDate = `${yearFrom}-01-01`;
    const toDate = `${yearTo}-12-31`;

    // Search both bioRxiv and medRxiv
    const [biorxivResults, medrxivResults] = await Promise.allSettled([
      this.searchServer("biorxiv", query, fromDate, toDate, maxResults),
      this.searchServer("medrxiv", query, fromDate, toDate, maxResults),
    ]);

    const papers: Paper[] = [];

    if (biorxivResults.status === "fulfilled") {
      papers.push(...biorxivResults.value);
    }
    if (medrxivResults.status === "fulfilled") {
      papers.push(...medrxivResults.value);
    }

    return papers.slice(0, maxResults);
  }

  private async searchServer(
    server: "biorxiv" | "medrxiv",
    query: string,
    fromDate: string,
    toDate: string,
    maxResults: number
  ): Promise<Paper[]> {
    await this.rateLimiter.acquire();

    // The content API endpoint: /details/{server}/{from}/{to}/{cursor}
    const response = await fetch(
      `${BASE_URL}/details/${server}/${fromDate}/${toDate}/0/json`
    );

    if (!response.ok) {
      throw new Error(`${server} search failed: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as BiorxivResponse;
    const collection = data.collection ?? [];

    // Client-side keyword filtering
    const queryLower = query.toLowerCase();
    const queryTerms = queryLower.split(/\s+/).filter((t) => t.length > 2);

    const filtered = collection.filter((article) => {
      const text = `${article.title ?? ""} ${article.abstract ?? ""}`.toLowerCase();
      return queryTerms.some((term) => text.includes(term));
    });

    return filtered.slice(0, maxResults).map((article) => this.mapToPaper(article, server));
  }

  async getPaper(id: string): Promise<Paper> {
    await this.rateLimiter.acquire();

    // Accept DOI (e.g. 10.1101/2024.01.01.123456)
    const doi = id.replace("https://doi.org/", "");

    const response = await fetch(`${BASE_URL}/details/biorxiv/${doi}/na/json`);

    if (!response.ok) {
      // Try medRxiv
      const medResponse = await fetch(`${BASE_URL}/details/medrxiv/${doi}/na/json`);
      if (!medResponse.ok) {
        throw new Error(`bioRxiv/medRxiv get paper failed: ${response.status}`);
      }
      const medData = (await medResponse.json()) as BiorxivResponse;
      const article = medData.collection?.[0];
      if (!article) throw new Error(`Paper not found: ${id}`);
      return this.mapToPaper(article, "medrxiv");
    }

    const data = (await response.json()) as BiorxivResponse;
    const article = data.collection?.[0];
    if (!article) throw new Error(`Paper not found: ${id}`);
    return this.mapToPaper(article, "biorxiv");
  }

  private mapToPaper(article: BiorxivArticle, server: "biorxiv" | "medrxiv"): Paper {
    const authors = (article.authors ?? "")
      .split(";")
      .map((name) => name.trim())
      .filter(Boolean)
      .map((name) => ({ name }));

    const doi = article.doi ?? undefined;
    const url = doi
      ? `https://doi.org/${doi}`
      : `https://www.${server}.org/content/${article.doi}`;

    const paper: Omit<Paper, "citations"> = {
      title: article.title ?? "Untitled",
      authors,
      abstract: article.abstract ?? "",
      year: article.date ? parseInt(article.date.substring(0, 4), 10) : 0,
      journal: `${server} (preprint)`,
      volume: undefined,
      issue: undefined,
      pages: undefined,
      publisher: server === "biorxiv" ? "Cold Spring Harbor Laboratory" : "Cold Spring Harbor Laboratory",
      doi,
      url,
      source: "biorxiv",
      sourceId: doi ?? "",
      citationCount: undefined,
      keywords: article.category ? [article.category] : undefined,
      openAccess: true, // All preprints are OA
      openAccessUrl: url,
      fullTextAvailable: true,
    };

    return { ...paper, citations: formatAllCitations(paper) };
  }
}

// ── bioRxiv Response Types ───────────────────────────────────────────

interface BiorxivResponse {
  collection?: BiorxivArticle[];
  messages?: { total?: number }[];
}

interface BiorxivArticle {
  doi?: string;
  title?: string;
  authors?: string;
  abstract?: string;
  date?: string;
  category?: string;
  server?: string;
}
