/**
 * SQLite Database Manager for Prima Scholar Library
 *
 * Manages the document library database with FTS5 full-text search.
 * Uses better-sqlite3 for synchronous, high-performance operations.
 */

import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import type {
  Document,
  Collection,
  Tag,
  SearchResult,
  LibraryStats,
} from "./types.js";

export class LibraryDatabase {
  private db: Database.Database;

  constructor(dbPath: string) {
    // Ensure parent directory exists
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    this.db = new Database(dbPath);
    this.db.pragma("journal_mode = WAL");
    this.db.pragma("foreign_keys = ON");
    this.initialise();
  }

  /**
   * Create tables and FTS index if they do not exist.
   */
  private initialise(): void {
    const statements = [
      `CREATE TABLE IF NOT EXISTS documents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        authors TEXT,
        abstract TEXT,
        content TEXT,
        year INTEGER,
        doi TEXT,
        source_url TEXT,
        file_path TEXT,
        file_type TEXT,
        date_added TEXT DEFAULT (datetime('now')),
        notes TEXT,
        metadata TEXT
      )`,

      `CREATE VIRTUAL TABLE IF NOT EXISTS documents_fts USING fts5(
        title, authors, abstract, content, notes,
        content='documents',
        content_rowid='id'
      )`,

      `CREATE TRIGGER IF NOT EXISTS documents_ai AFTER INSERT ON documents BEGIN
        INSERT INTO documents_fts(rowid, title, authors, abstract, content, notes)
        VALUES (new.id, new.title, new.authors, new.abstract, new.content, new.notes);
      END`,

      `CREATE TRIGGER IF NOT EXISTS documents_ad AFTER DELETE ON documents BEGIN
        INSERT INTO documents_fts(documents_fts, rowid, title, authors, abstract, content, notes)
        VALUES ('delete', old.id, old.title, old.authors, old.abstract, old.content, old.notes);
      END`,

      `CREATE TRIGGER IF NOT EXISTS documents_au AFTER UPDATE ON documents BEGIN
        INSERT INTO documents_fts(documents_fts, rowid, title, authors, abstract, content, notes)
        VALUES ('delete', old.id, old.title, old.authors, old.abstract, old.content, old.notes);
        INSERT INTO documents_fts(rowid, title, authors, abstract, content, notes)
        VALUES (new.id, new.title, new.authors, new.abstract, new.content, new.notes);
      END`,

      `CREATE TABLE IF NOT EXISTS collections (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        date_created TEXT DEFAULT (datetime('now'))
      )`,

      `CREATE TABLE IF NOT EXISTS tags (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE
      )`,

      `CREATE TABLE IF NOT EXISTS document_collections (
        document_id INTEGER REFERENCES documents(id) ON DELETE CASCADE,
        collection_id INTEGER REFERENCES collections(id) ON DELETE CASCADE,
        PRIMARY KEY (document_id, collection_id)
      )`,

      `CREATE TABLE IF NOT EXISTS document_tags (
        document_id INTEGER REFERENCES documents(id) ON DELETE CASCADE,
        tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE,
        PRIMARY KEY (document_id, tag_id)
      )`,
    ];

    for (const sql of statements) {
      this.db.prepare(sql).run();
    }
  }

  /**
   * Insert a new document and return its ID.
   */
  insertDocument(doc: Partial<Document>): number {
    const stmt = this.db.prepare(`
      INSERT INTO documents (title, authors, abstract, content, year, doi, source_url, file_path, file_type, notes, metadata)
      VALUES (@title, @authors, @abstract, @content, @year, @doi, @sourceUrl, @filePath, @fileType, @notes, @metadata)
    `);

    const result = stmt.run({
      title: doc.title ?? "Untitled",
      authors: doc.authors ?? null,
      abstract: doc.abstract ?? null,
      content: doc.content ?? null,
      year: doc.year ?? null,
      doi: doc.doi ?? null,
      sourceUrl: doc.sourceUrl ?? null,
      filePath: doc.filePath ?? null,
      fileType: doc.fileType ?? null,
      notes: doc.notes ?? null,
      metadata: doc.metadata ?? null,
    });

    return result.lastInsertRowid as number;
  }

  /**
   * Get a single document by ID.
   */
  getDocument(id: number): Document | null {
    const stmt = this.db.prepare(`
      SELECT id, title, authors, abstract, content, year, doi,
             source_url AS sourceUrl, file_path AS filePath, file_type AS fileType,
             date_added AS dateAdded, notes, metadata
      FROM documents WHERE id = ?
    `);
    return (stmt.get(id) as Document) ?? null;
  }

  /**
   * List documents with optional filters.
   */
  listDocuments(filters?: {
    collection?: string;
    tag?: string;
    year?: number;
    fileType?: string;
    limit?: number;
    offset?: number;
  }): Document[] {
    const conditions: string[] = [];
    const params: Record<string, unknown> = {};
    let joins = "";

    if (filters?.collection) {
      joins += `
        JOIN document_collections dc ON dc.document_id = d.id
        JOIN collections c ON c.id = dc.collection_id
      `;
      conditions.push("c.name = @collection");
      params.collection = filters.collection;
    }

    if (filters?.tag) {
      joins += `
        JOIN document_tags dt ON dt.document_id = d.id
        JOIN tags t ON t.id = dt.tag_id
      `;
      conditions.push("t.name = @tag");
      params.tag = filters.tag;
    }

    if (filters?.year) {
      conditions.push("d.year = @year");
      params.year = filters.year;
    }

    if (filters?.fileType) {
      conditions.push("d.file_type = @fileType");
      params.fileType = filters.fileType;
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const limit = filters?.limit ?? 20;
    const offset = filters?.offset ?? 0;

    const stmt = this.db.prepare(`
      SELECT DISTINCT d.id, d.title, d.authors, d.abstract, d.year, d.doi,
             d.source_url AS sourceUrl, d.file_path AS filePath, d.file_type AS fileType,
             d.date_added AS dateAdded, d.notes, d.metadata
      FROM documents d
      ${joins}
      ${where}
      ORDER BY d.date_added DESC
      LIMIT @limit OFFSET @offset
    `);

    return stmt.all({ ...params, limit, offset }) as Document[];
  }

  /**
   * Full-text search across the document library.
   */
  searchDocuments(query: string, limit: number = 10): SearchResult[] {
    const stmt = this.db.prepare(`
      SELECT d.id, d.title, d.authors, d.year,
             snippet(documents_fts, 3, '<mark>', '</mark>', '...', 30) AS snippet,
             rank
      FROM documents_fts f
      JOIN documents d ON d.id = f.rowid
      WHERE documents_fts MATCH ?
      ORDER BY rank
      LIMIT ?
    `);
    return stmt.all(query, limit) as SearchResult[];
  }

  /**
   * Update an existing document.
   */
  updateDocument(id: number, updates: Partial<Document>): boolean {
    const fields: string[] = [];
    const params: Record<string, unknown> = { id };

    if (updates.title !== undefined) { fields.push("title = @title"); params.title = updates.title; }
    if (updates.authors !== undefined) { fields.push("authors = @authors"); params.authors = updates.authors; }
    if (updates.abstract !== undefined) { fields.push("abstract = @abstract"); params.abstract = updates.abstract; }
    if (updates.content !== undefined) { fields.push("content = @content"); params.content = updates.content; }
    if (updates.year !== undefined) { fields.push("year = @year"); params.year = updates.year; }
    if (updates.doi !== undefined) { fields.push("doi = @doi"); params.doi = updates.doi; }
    if (updates.notes !== undefined) { fields.push("notes = @notes"); params.notes = updates.notes; }
    if (updates.sourceUrl !== undefined) { fields.push("source_url = @sourceUrl"); params.sourceUrl = updates.sourceUrl; }

    if (fields.length === 0) return false;

    const stmt = this.db.prepare(`UPDATE documents SET ${fields.join(", ")} WHERE id = @id`);
    const result = stmt.run(params);
    return result.changes > 0;
  }

  /**
   * Delete a document by ID. Cascade handles FTS cleanup via trigger.
   */
  deleteDocument(id: number): boolean {
    const stmt = this.db.prepare("DELETE FROM documents WHERE id = ?");
    const result = stmt.run(id);
    return result.changes > 0;
  }

  /**
   * Create a new collection.
   */
  createCollection(name: string, description?: string): number {
    const stmt = this.db.prepare(
      "INSERT INTO collections (name, description) VALUES (?, ?)"
    );
    const result = stmt.run(name, description ?? null);
    return result.lastInsertRowid as number;
  }

  /**
   * List all collections with document counts.
   */
  listCollections(): Collection[] {
    const stmt = this.db.prepare(`
      SELECT c.id, c.name, c.description, c.date_created AS dateCreated,
             COUNT(dc.document_id) AS documentCount
      FROM collections c
      LEFT JOIN document_collections dc ON dc.collection_id = c.id
      GROUP BY c.id
      ORDER BY c.name
    `);
    return stmt.all() as Collection[];
  }

  /**
   * Add a document to a collection.
   */
  addToCollection(documentId: number, collectionId: number): boolean {
    const stmt = this.db.prepare(
      "INSERT OR IGNORE INTO document_collections (document_id, collection_id) VALUES (?, ?)"
    );
    const result = stmt.run(documentId, collectionId);
    return result.changes > 0;
  }

  /**
   * Remove a document from a collection.
   */
  removeFromCollection(documentId: number, collectionId: number): boolean {
    const stmt = this.db.prepare(
      "DELETE FROM document_collections WHERE document_id = ? AND collection_id = ?"
    );
    const result = stmt.run(documentId, collectionId);
    return result.changes > 0;
  }

  /**
   * Add a tag to a document. Creates the tag if it does not exist.
   */
  addTag(documentId: number, tagName: string): boolean {
    this.db.prepare("INSERT OR IGNORE INTO tags (name) VALUES (?)").run(tagName);
    const tag = this.db.prepare("SELECT id FROM tags WHERE name = ?").get(tagName) as { id: number };
    const stmt = this.db.prepare(
      "INSERT OR IGNORE INTO document_tags (document_id, tag_id) VALUES (?, ?)"
    );
    const result = stmt.run(documentId, tag.id);
    return result.changes > 0;
  }

  /**
   * Remove a tag from a document.
   */
  removeTag(documentId: number, tagName: string): boolean {
    const tag = this.db.prepare("SELECT id FROM tags WHERE name = ?").get(tagName) as { id: number } | undefined;
    if (!tag) return false;
    const stmt = this.db.prepare(
      "DELETE FROM document_tags WHERE document_id = ? AND tag_id = ?"
    );
    const result = stmt.run(documentId, tag.id);
    return result.changes > 0;
  }

  /**
   * Get all tags for a document.
   */
  getDocumentTags(documentId: number): Tag[] {
    const stmt = this.db.prepare(`
      SELECT t.id, t.name
      FROM tags t
      JOIN document_tags dt ON dt.tag_id = t.id
      WHERE dt.document_id = ?
      ORDER BY t.name
    `);
    return stmt.all(documentId) as Tag[];
  }

  /**
   * Get a collection by name.
   */
  getCollectionByName(name: string): Collection | null {
    const stmt = this.db.prepare("SELECT id, name, description, date_created AS dateCreated FROM collections WHERE name = ?");
    return (stmt.get(name) as Collection) ?? null;
  }

  /**
   * Get aggregate library statistics.
   */
  getStats(): LibraryStats {
    const totalDocuments = (
      this.db.prepare("SELECT COUNT(*) AS count FROM documents").get() as { count: number }
    ).count;

    const byTypeRows = this.db
      .prepare("SELECT COALESCE(file_type, 'unknown') AS type, COUNT(*) AS count FROM documents GROUP BY file_type")
      .all() as { type: string; count: number }[];
    const byType: Record<string, number> = {};
    for (const row of byTypeRows) {
      byType[row.type] = row.count;
    }

    const byYearRows = this.db
      .prepare("SELECT COALESCE(CAST(year AS TEXT), 'unknown') AS yr, COUNT(*) AS count FROM documents GROUP BY year ORDER BY year DESC")
      .all() as { yr: string; count: number }[];
    const byYear: Record<string, number> = {};
    for (const row of byYearRows) {
      byYear[row.yr] = row.count;
    }

    const topTags = this.db
      .prepare(`
        SELECT t.name, COUNT(dt.document_id) AS count
        FROM tags t
        JOIN document_tags dt ON dt.tag_id = t.id
        GROUP BY t.id
        ORDER BY count DESC
        LIMIT 20
      `)
      .all() as { name: string; count: number }[];

    const totalCollections = (
      this.db.prepare("SELECT COUNT(*) AS count FROM collections").get() as { count: number }
    ).count;

    return { totalDocuments, byType, byYear, topTags, totalCollections };
  }
}
