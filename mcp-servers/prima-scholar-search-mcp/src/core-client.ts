/**
 * CORE API client.
 *
 * Queries the CORE API for open-access scholarly content.
 * Requires a free API key via CORE_API_KEY env var.
 * Register at: https://core.ac.uk/services/api
 *
 * API docs: https://api.core.ac.uk/docs/v3
 */

import { Paper, SearchOptions, ScholarClient } from "./types.js";
import { RateLimiter } from "./rate-limiter.js";
import { formatAllCitations } from "./utils.js";

const BASE_URL = "https://api.core.ac.uk/v3";

export class CoreClient implements ScholarClient {
  private rateLimiter = new RateLimiter(10, 1000);
  private apiKey: string | undefined;

  constructor() {
    this.apiKey = process.env.CORE_API_KEY;
  }

  isConfigured(): boolean {
    return !!this.apiKey;
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      Accept: "application/json",
    };
    if (this.apiKey) {
      headers["Authorization"] = `Bearer ${this.apiKey}`;
    }
    return headers;
  }

  async search(query: string, options?: SearchOptions): Promise<Paper[]> {
    if (!this.apiKey) {
      throw new Error(
        "CORE API key not configured. Set CORE_API_KEY in your environment. " +
        "Get a free key at https://core.ac.uk/services/api"
      );
    }

    const maxResults = options?.maxResults ?? 10;
    await this.rateLimiter.acquire();

    const params = new URLSearchParams({
      q: query,
      limit: String(maxResults),
    });

    if (options?.yearFrom) {
      params.set("yearFrom", String(options.yearFrom));
    }
    if (options?.yearTo) {
      params.set("yearTo", String(options.yearTo));
    }

    const response = await fetch(`${BASE_URL}/search/works?${params}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`CORE search failed: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as CoreSearchResponse;
    return (data.results ?? []).map((work) => this.mapToPaper(work));
  }

  async getPaper(id: string): Promise<Paper> {
    if (!this.apiKey) {
      throw new Error("CORE API key not configured. Set CORE_API_KEY in your environment.");
    }

    await this.rateLimiter.acquire();

    const response = await fetch(`${BASE_URL}/works/${id}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`CORE get paper failed: ${response.status} ${response.statusText}`);
    }

    const work = (await response.json()) as CoreWork;
    return this.mapToPaper(work);
  }

  async getFullText(id: string): Promise<string | null> {
    if (!this.apiKey) return null;

    await this.rateLimiter.acquire();

    const response = await fetch(`${BASE_URL}/works/${id}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) return null;

    const work = (await response.json()) as CoreWork;
    return work.fullText ?? null;
  }

  private mapToPaper(work: CoreWork): Paper {
    const authors = (work.authors ?? []).map((a) => ({
      name: a.name ?? "Unknown",
    }));

    const doi = work.doi?.replace("https://doi.org/", "") ?? undefined;

    const paper: Omit<Paper, "citations"> = {
      title: work.title ?? "Untitled",
      authors,
      abstract: work.abstract ?? "",
      year: work.yearPublished ?? 0,
      journal: work.journal?.title ?? undefined,
      volume: undefined,
      issue: undefined,
      pages: undefined,
      publisher: work.publisher ?? undefined,
      doi,
      url: work.downloadUrl ?? work.sourceFulltextUrls?.[0] ?? "",
      source: "core",
      sourceId: String(work.id ?? ""),
      citationCount: work.citationCount ?? undefined,
      keywords: undefined,
      openAccess: true, // CORE is OA-only
      openAccessUrl: work.downloadUrl ?? work.sourceFulltextUrls?.[0] ?? undefined,
      fullTextAvailable: !!(work.fullText || work.downloadUrl),
    };

    return { ...paper, citations: formatAllCitations(paper) };
  }
}

// ── CORE Response Types ──────────────────────────────────────────────

interface CoreSearchResponse {
  totalHits?: number;
  results: CoreWork[];
}

interface CoreWork {
  id?: number;
  title?: string;
  authors?: { name?: string }[];
  abstract?: string;
  yearPublished?: number;
  doi?: string;
  journal?: { title?: string };
  publisher?: string;
  downloadUrl?: string;
  sourceFulltextUrls?: string[];
  fullText?: string;
  citationCount?: number;
}
