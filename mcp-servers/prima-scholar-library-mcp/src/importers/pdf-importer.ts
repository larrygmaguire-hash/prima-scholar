/**
 * PDF file importer using pdf-parse
 */

import fs from "fs";
import path from "path";
import pdf from "pdf-parse";

export async function importPdf(filePath: string): Promise<{
  title: string;
  content: string;
  fileType: string;
  metadata?: Record<string, string>;
}> {
  const buffer = fs.readFileSync(filePath);

  let data;
  try {
    data = await pdf(buffer);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to parse PDF "${path.basename(filePath)}": ${message}`);
  }

  // Extract title from PDF metadata or first line of text
  let title: string;
  if (data.info?.Title && data.info.Title.trim().length > 0) {
    title = data.info.Title.trim();
  } else {
    const firstLine = data.text.split("\n").find((line: string) => line.trim().length > 0);
    title = firstLine?.trim().slice(0, 200) ?? path.basename(filePath, ".pdf");
  }

  // Collect available metadata
  const metadata: Record<string, string> = {};
  if (data.info?.Author) metadata.author = data.info.Author;
  if (data.info?.Subject) metadata.subject = data.info.Subject;
  if (data.info?.Keywords) metadata.keywords = data.info.Keywords;
  if (data.info?.Creator) metadata.creator = data.info.Creator;
  if (data.numpages) metadata.pages = String(data.numpages);

  return {
    title,
    content: data.text,
    fileType: "pdf",
    metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
  };
}
