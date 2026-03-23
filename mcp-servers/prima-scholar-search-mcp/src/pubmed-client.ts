/**
 * PubMed E-utilities API client.
 *
 * Searches PubMed via esearch + efetch for biomedical literature.
 * Optional API key via PUBMED_API_KEY env var for higher rate limits.
 */

import { XMLParser } from "fast-xml-parser";
import { Paper, SearchOptions } from "./types.js";
import { RateLimiter } from "./rate-limiter.js";
import { formatAllCitations } from "./utils.js";

const BASE_URL = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils";

export class PubMedClient {
  private rateLimiter: RateLimiter;
  private apiKey: string | undefined;
  private xmlParser: XMLParser;

  constructor() {
    this.apiKey = process.env.PUBMED_API_KEY;
    // 3 req/sec without key, 10 req/sec with key
    this.rateLimiter = new RateLimiter(this.apiKey ? 10 : 3, 1000);
    this.xmlParser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@_",
    });
  }

  private appendApiKey(url: string): string {
    if (this.apiKey) {
      const separator = url.includes("?") ? "&" : "?";
      return `${url}${separator}api_key=${this.apiKey}`;
    }
    return url;
  }

  /**
   * Search PubMed for articles matching the query.
   *
   * Two-step process: esearch to get PMIDs, then efetch to get full records.
   */
  async search(query: string, options?: SearchOptions): Promise<Paper[]> {
    const maxResults = options?.maxResults ?? 10;

    // Step 1: esearch — get PMID list
    await this.rateLimiter.acquire();
    const searchParams = new URLSearchParams({
      db: "pubmed",
      term: query,
      retmax: String(maxResults),
      retmode: "json",
    });

    const searchUrl = this.appendApiKey(
      `${BASE_URL}/esearch.fcgi?${searchParams}`
    );
    const searchResponse = await fetch(searchUrl);

    if (!searchResponse.ok) {
      throw new Error(
        `PubMed esearch failed: ${searchResponse.status} ${searchResponse.statusText}`
      );
    }

    const searchData = await searchResponse.json();
    const pmids: string[] = searchData?.esearchresult?.idlist ?? [];

    if (pmids.length === 0) {
      return [];
    }

    // Step 2: efetch — get full records as XML
    await this.rateLimiter.acquire();
    const fetchParams = new URLSearchParams({
      db: "pubmed",
      id: pmids.join(","),
      rettype: "xml",
    });

    const fetchUrl = this.appendApiKey(
      `${BASE_URL}/efetch.fcgi?${fetchParams}`
    );
    const fetchResponse = await fetch(fetchUrl);

    if (!fetchResponse.ok) {
      throw new Error(
        `PubMed efetch failed: ${fetchResponse.status} ${fetchResponse.statusText}`
      );
    }

    const xmlText = await fetchResponse.text();
    return this.parseArticles(xmlText);
  }

  /**
   * Get a single paper by PMID.
   */
  async getPaper(pmid: string): Promise<Paper> {
    await this.rateLimiter.acquire();

    const params = new URLSearchParams({
      db: "pubmed",
      id: pmid,
      rettype: "xml",
    });

    const url = this.appendApiKey(`${BASE_URL}/efetch.fcgi?${params}`);
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(
        `PubMed efetch failed: ${response.status} ${response.statusText}`
      );
    }

    const xmlText = await response.text();
    const papers = this.parseArticles(xmlText);

    if (papers.length === 0) {
      throw new Error(`No article found for PMID: ${pmid}`);
    }

    return papers[0];
  }

  private parseArticles(xmlText: string): Paper[] {
    const parsed = this.xmlParser.parse(xmlText);

    // Handle single article or array
    let articles = parsed?.PubmedArticleSet?.PubmedArticle;
    if (!articles) return [];
    if (!Array.isArray(articles)) articles = [articles];

    return articles.map((article: any) => this.mapToPaper(article));
  }

  private mapToPaper(article: any): Paper {
    const citation = article?.MedlineCitation;
    const articleData = citation?.Article;
    const pmid = String(citation?.PMID?.["#text"] ?? citation?.PMID ?? "");

    // Title
    const title = String(articleData?.ArticleTitle ?? "").replace(
      /<[^>]*>/g,
      ""
    );

    // Authors
    const authorList = articleData?.AuthorList?.Author;
    const authors = this.parseAuthors(authorList);

    // Abstract — may be a string, an object, or an array of sections
    const abstract = this.parseAbstract(articleData?.Abstract?.AbstractText);

    // Year
    const year = this.parseYear(articleData);

    // Journal
    const journal = articleData?.Journal?.Title ?? undefined;
    const journalIssue = articleData?.Journal?.JournalIssue;
    const volume = journalIssue?.Volume ? String(journalIssue.Volume) : undefined;
    const issue = journalIssue?.Issue ? String(journalIssue.Issue) : undefined;

    // Pages
    const paginationStr = articleData?.Pagination?.MedlinePgn;
    const pages = paginationStr ? String(paginationStr) : undefined;

    // DOI — from ArticleIdList or ELocationID
    const doi = this.parseDoi(article);

    const paper: Paper = {
      title,
      authors,
      abstract,
      year,
      journal,
      volume,
      issue,
      pages,
      doi,
      url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
      source: "pubmed",
      sourceId: pmid,
      citations: {},
    };

    paper.citations = formatAllCitations(paper);
    return paper;
  }

  private parseAuthors(authorList: any): { name: string }[] {
    if (!authorList) return [];
    const authors = Array.isArray(authorList) ? authorList : [authorList];

    return authors
      .map((a: any) => {
        const foreName = a.ForeName ?? a.FirstName ?? "";
        const lastName = a.LastName ?? "";
        if (!lastName) return null;
        return { name: `${foreName} ${lastName}`.trim() };
      })
      .filter(Boolean) as { name: string }[];
  }

  private parseAbstract(abstractText: any): string {
    if (!abstractText) return "";
    if (typeof abstractText === "string") return abstractText;

    // Single section with text content
    if (abstractText["#text"]) return String(abstractText["#text"]);

    // Array of sections
    if (Array.isArray(abstractText)) {
      return abstractText
        .map((section: any) => {
          if (typeof section === "string") return section;
          const label = section["@_Label"] ?? "";
          const text = section["#text"] ?? String(section);
          return label ? `${label}: ${text}` : text;
        })
        .join(" ");
    }

    return String(abstractText);
  }

  private parseYear(articleData: any): number {
    // Try JournalIssue PubDate first
    const pubDate =
      articleData?.Journal?.JournalIssue?.PubDate?.Year;
    if (pubDate) return Number(pubDate);

    // Try ArticleDate
    const articleDate = articleData?.ArticleDate;
    if (articleDate) {
      const dateObj = Array.isArray(articleDate)
        ? articleDate[0]
        : articleDate;
      if (dateObj?.Year) return Number(dateObj.Year);
    }

    return 0;
  }

  private parseDoi(article: any): string | undefined {
    // Check PubmedData ArticleIdList
    const idList =
      article?.PubmedData?.ArticleIdList?.ArticleId;
    if (idList) {
      const ids = Array.isArray(idList) ? idList : [idList];
      for (const id of ids) {
        if (id["@_IdType"] === "doi") {
          return id["#text"] ?? String(id);
        }
      }
    }

    // Check ELocationID
    const eloc = article?.MedlineCitation?.Article?.ELocationID;
    if (eloc) {
      const locs = Array.isArray(eloc) ? eloc : [eloc];
      for (const loc of locs) {
        if (loc["@_EIdType"] === "doi") {
          return loc["#text"] ?? String(loc);
        }
      }
    }

    return undefined;
  }
}
