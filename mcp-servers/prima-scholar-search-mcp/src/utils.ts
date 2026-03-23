/**
 * Utility functions for citation formatting and deduplication.
 */

import { Author, CitationStyle, Paper } from "./types.js";

type PaperForCitation = Omit<Paper, 'citations'> & { citations?: Record<string, string> };

/**
 * Format a single author name in APA7 style: "LastName, F. M."
 * Handles names in "First Last" format by splitting on spaces.
 */
function formatAuthorApa7(author: Author): string {
  const parts = author.name.trim().split(/\s+/);
  if (parts.length === 0) return author.name;
  if (parts.length === 1) return parts[0];

  const lastName = parts[parts.length - 1];
  const initials = parts
    .slice(0, -1)
    .map((p) => `${p[0].toUpperCase()}.`)
    .join(" ");

  return `${lastName}, ${initials}`;
}

/**
 * Format a Paper into an APA7 citation string.
 *
 * Handles single author, two authors, and three or more authors.
 * Handles preprints (no journal) and missing DOIs.
 */
export function formatApa7Citation(paper: PaperForCitation): string {
  // Format authors
  let authorStr: string;
  if (paper.authors.length === 0) {
    authorStr = "Unknown";
  } else if (paper.authors.length === 1) {
    authorStr = formatAuthorApa7(paper.authors[0]);
  } else if (paper.authors.length === 2) {
    authorStr = `${formatAuthorApa7(paper.authors[0])}, & ${formatAuthorApa7(paper.authors[1])}`;
  } else {
    // APA7 lists up to 20 authors
    const formatted = paper.authors.slice(0, 20).map(formatAuthorApa7);
    const last = formatted.pop();
    authorStr = `${formatted.join(", ")}, & ${last}`;
  }

  // Year
  const yearStr = paper.year ? `(${paper.year})` : "(n.d.)";

  // Title — italicised in APA7 for standalone works, plain for journal articles
  const title = paper.title.replace(/\.$/, "");

  // Build citation
  let citation = `${authorStr} ${yearStr}. ${title}.`;

  if (paper.journal) {
    citation += ` ${paper.journal}.`;
    const volIssueParts: string[] = [];
    if (paper.volume) volIssueParts.push(paper.volume);
    if (paper.issue) volIssueParts.push(`(${paper.issue})`);
    if (volIssueParts.length > 0) citation = citation.replace(/\.$/, `, ${volIssueParts.join("")}.`);
    if (paper.pages) citation = citation.replace(/\.$/, `, ${paper.pages}.`);
  } else if (paper.source === "arxiv") {
    citation += " arXiv.";
  }

  // DOI or URL
  if (paper.doi) {
    const normDoi = normaliseDoi(paper.doi);
    citation += ` https://doi.org/${normDoi}`;
  } else if (paper.url) {
    citation += ` ${paper.url}`;
  }

  return citation;
}

export function formatHarvardCitation(paper: PaperForCitation): string {
  let authorStr: string;
  if (paper.authors.length === 0) {
    authorStr = "Unknown";
  } else if (paper.authors.length === 1) {
    authorStr = formatAuthorApa7(paper.authors[0]);
  } else if (paper.authors.length === 2) {
    authorStr = `${formatAuthorApa7(paper.authors[0])} and ${formatAuthorApa7(paper.authors[1])}`;
  } else {
    const formatted = paper.authors.slice(0, 20).map(formatAuthorApa7);
    const last = formatted.pop();
    authorStr = `${formatted.join(", ")} and ${last}`;
  }

  const yearStr = paper.year ? `${paper.year}` : "n.d.";
  const title = paper.title.replace(/\.$/, "");

  let citation = `${authorStr} ${yearStr}. ${title}.`;

  if (paper.journal) {
    citation += ` ${paper.journal}.`;
    if (paper.volume) citation = citation.replace(/\.$/, `, vol. ${paper.volume}.`);
    if (paper.issue) citation = citation.replace(/\.$/, `, no. ${paper.issue}.`);
    if (paper.pages) citation = citation.replace(/\.$/, `, pp. ${paper.pages}.`);
  }

  if (paper.doi) {
    citation += ` https://doi.org/${normaliseDoi(paper.doi)}`;
  } else if (paper.url) {
    citation += ` ${paper.url}`;
  }

  return citation;
}

export function formatChicagoCitation(paper: PaperForCitation): string {
  let authorStr: string;
  if (paper.authors.length === 0) {
    authorStr = "Unknown";
  } else {
    const first = paper.authors[0];
    const parts = first.name.trim().split(/\s+/);
    if (parts.length > 1) {
      const lastName = parts[parts.length - 1];
      const firstNames = parts.slice(0, -1).join(" ");
      authorStr = `${lastName}, ${firstNames}`;
    } else {
      authorStr = first.name;
    }
    if (paper.authors.length > 1) {
      const rest = paper.authors.slice(1).map(a => a.name);
      authorStr += ", " + rest.join(", ");
    }
  }

  const title = paper.title.replace(/\.$/, "");
  const yearStr = paper.year ? `${paper.year}` : "n.d.";

  let citation = `${authorStr}. "${title}."`;

  if (paper.journal) {
    citation += ` ${paper.journal}`;
    if (paper.volume) citation += ` ${paper.volume}`;
    if (paper.issue) citation += `, no. ${paper.issue}`;
    citation += ` (${yearStr})`;
    if (paper.pages) citation += `: ${paper.pages}`;
    citation += ".";
  } else {
    citation += ` ${yearStr}.`;
  }

  if (paper.doi) {
    citation += ` https://doi.org/${normaliseDoi(paper.doi)}`;
  } else if (paper.url) {
    citation += ` ${paper.url}`;
  }

  return citation;
}

export function formatVancouverCitation(paper: PaperForCitation): string {
  let authorStr: string;
  if (paper.authors.length === 0) {
    authorStr = "Unknown";
  } else {
    const formatted = paper.authors.slice(0, 6).map(a => {
      const parts = a.name.trim().split(/\s+/);
      if (parts.length <= 1) return a.name;
      const lastName = parts[parts.length - 1];
      const initials = parts.slice(0, -1).map(p => p[0].toUpperCase()).join("");
      return `${lastName} ${initials}`;
    });
    if (paper.authors.length > 6) formatted.push("et al");
    authorStr = formatted.join(", ");
  }

  const title = paper.title.replace(/\.$/, "");
  const yearStr = paper.year ? `${paper.year}` : "n.d.";

  let citation = `${authorStr}. ${title}.`;

  if (paper.journal) {
    citation += ` ${paper.journal}.`;
    citation += ` ${yearStr}`;
    if (paper.volume) {
      citation += `;${paper.volume}`;
      if (paper.issue) citation += `(${paper.issue})`;
      if (paper.pages) citation += `:${paper.pages}`;
    }
    citation += ".";
  } else {
    citation += ` ${yearStr}.`;
  }

  if (paper.doi) {
    citation += ` https://doi.org/${normaliseDoi(paper.doi)}`;
  } else if (paper.url) {
    citation += ` ${paper.url}`;
  }

  return citation;
}

export function formatIeeeCitation(paper: PaperForCitation): string {
  let authorStr: string;
  if (paper.authors.length === 0) {
    authorStr = "Unknown";
  } else {
    const formatted = paper.authors.map(a => {
      const parts = a.name.trim().split(/\s+/);
      if (parts.length <= 1) return a.name;
      const lastName = parts[parts.length - 1];
      const initials = parts.slice(0, -1).map(p => `${p[0].toUpperCase()}.`).join(" ");
      return `${initials} ${lastName}`;
    });
    if (formatted.length === 1) {
      authorStr = formatted[0];
    } else if (formatted.length === 2) {
      authorStr = `${formatted[0]} and ${formatted[1]}`;
    } else {
      const last = formatted.pop();
      authorStr = `${formatted.join(", ")}, and ${last}`;
    }
  }

  const title = paper.title.replace(/\.$/, "");
  const yearStr = paper.year ? `${paper.year}` : "n.d.";

  let citation = `${authorStr}, "${title},"`;

  if (paper.journal) {
    citation += ` ${paper.journal}`;
    if (paper.volume) citation += `, vol. ${paper.volume}`;
    if (paper.issue) citation += `, no. ${paper.issue}`;
    if (paper.pages) citation += `, pp. ${paper.pages}`;
    citation += `, ${yearStr}.`;
  } else {
    citation += ` ${yearStr}.`;
  }

  if (paper.doi) {
    citation += ` https://doi.org/${normaliseDoi(paper.doi)}`;
  } else if (paper.url) {
    citation += ` ${paper.url}`;
  }

  return citation;
}

export function formatMlaCitation(paper: PaperForCitation): string {
  let authorStr: string;
  if (paper.authors.length === 0) {
    authorStr = "Unknown";
  } else {
    const first = paper.authors[0];
    const parts = first.name.trim().split(/\s+/);
    if (parts.length > 1) {
      const lastName = parts[parts.length - 1];
      const firstNames = parts.slice(0, -1).join(" ");
      authorStr = `${lastName}, ${firstNames}`;
    } else {
      authorStr = first.name;
    }
    if (paper.authors.length === 2) {
      authorStr += `, and ${paper.authors[1].name}`;
    } else if (paper.authors.length > 2) {
      authorStr += ", et al";
    }
  }

  const title = paper.title.replace(/\.$/, "");
  const yearStr = paper.year ? `${paper.year}` : "n.d.";

  let citation = `${authorStr}. "${title}."`;

  if (paper.journal) {
    citation += ` ${paper.journal}`;
    if (paper.volume) citation += `, vol. ${paper.volume}`;
    if (paper.issue) citation += `, no. ${paper.issue}`;
    citation += `, ${yearStr}`;
    if (paper.pages) citation += `, pp. ${paper.pages}`;
    citation += ".";
  } else {
    citation += ` ${yearStr}.`;
  }

  if (paper.doi) {
    citation += ` https://doi.org/${normaliseDoi(paper.doi)}`;
  } else if (paper.url) {
    citation += ` ${paper.url}`;
  }

  return citation;
}

export function formatCitation(paper: PaperForCitation, style: CitationStyle): string {
  switch (style) {
    case 'apa7': return formatApa7Citation(paper);
    case 'harvard': return formatHarvardCitation(paper);
    case 'chicago': return formatChicagoCitation(paper);
    case 'vancouver': return formatVancouverCitation(paper);
    case 'ieee': return formatIeeeCitation(paper);
    case 'mla': return formatMlaCitation(paper);
    default: return formatApa7Citation(paper);
  }
}

export function formatAllCitations(paper: Omit<Paper, 'citations'>): Record<string, string> {
  const styles: CitationStyle[] = ['apa7', 'harvard', 'chicago', 'vancouver', 'ieee', 'mla'];
  const citations: Record<string, string> = {};
  for (const style of styles) {
    citations[style] = formatCitation(paper, style);
  }
  return citations;
}

/**
 * Normalise a DOI string: strip common prefixes, lowercase, trim.
 */
export function normaliseDoi(doi: string): string {
  return doi
    .trim()
    .replace(/^https?:\/\/doi\.org\//i, "")
    .replace(/^doi:\s*/i, "")
    .toLowerCase();
}

/**
 * Deduplicate papers by DOI.
 *
 * When duplicates are found, prefer the source with more metadata
 * (measured by number of non-null fields).
 */
export function deduplicateByDoi(papers: Paper[]): Paper[] {
  const doiMap = new Map<string, Paper>();
  const noDoi: Paper[] = [];

  for (const paper of papers) {
    if (!paper.doi) {
      noDoi.push(paper);
      continue;
    }

    const normDoi = normaliseDoi(paper.doi);
    const existing = doiMap.get(normDoi);

    if (!existing) {
      doiMap.set(normDoi, paper);
    } else {
      // Prefer the paper with more metadata
      const existingScore = metadataScore(existing);
      const newScore = metadataScore(paper);
      if (newScore > existingScore) {
        doiMap.set(normDoi, paper);
      }
    }
  }

  return [...doiMap.values(), ...noDoi];
}

/**
 * Score a paper by how many metadata fields are populated.
 */
function metadataScore(paper: Paper): number {
  let score = 0;
  if (paper.title) score++;
  if (paper.abstract) score++;
  if (paper.authors.length > 0) score++;
  if (paper.year) score++;
  if (paper.journal) score++;
  if (paper.doi) score++;
  if (paper.citationCount != null) score++;
  if (paper.keywords && paper.keywords.length > 0) score++;
  return score;
}
