import { DocumentVectorRepository } from '../../../domain/rag/ports/repositories';
import { SimilarDocument } from '../../../application/dto/rag.dto';
import { getPool } from '../../db/pg';

export class PostgresDocumentVectorRepository implements DocumentVectorRepository {
  async insertChunk(params: {
    text: string;
    embedding: number[];
    source: string;
    sourceUrl?: string;
    sourceType?: string;
    chunkIndex: number;
    totalChunks: number;
  }): Promise<void> {
    const pool = getPool();
    const client = await pool.connect();
    try {
      const embeddingStr = `ARRAY[${params.embedding.join(',')}]::vector`;
      await client.query(
        `INSERT INTO document_vectors (text, embedding, source, source_url, source_type, chunk_index, total_chunks)
         VALUES ($1, ${embeddingStr}, $2, $3, $4, $5, $6)`,
        [params.text, params.source, params.sourceUrl || null, params.sourceType || null, params.chunkIndex, params.totalChunks]
      );
    } finally {
      client.release();
    }
  }

  async findSimilar(embedding: number[], k: number): Promise<SimilarDocument[]> {
    const pool = getPool();
    const client = await pool.connect();
    try {
      const embeddingStr = `ARRAY[${embedding.join(',')}]::vector`;
      const result = await client.query(
        `SELECT text, source, source_url as "sourceUrl", source_type as "sourceType"
         FROM document_vectors
         ORDER BY embedding <-> ${embeddingStr}
         LIMIT $1`,
        [k]
      );

      return result.rows.map((row: any) => ({ 
        text: row.text, 
        source: row.source,
        sourceUrl: row.sourceUrl,
        sourceType: row.sourceType
      }));
    } finally {
      client.release();
    }
  }

  async getAllChunksBySource(source: string): Promise<{ text: string; chunkIndex: number }[]> {
    const pool = getPool();
    const client = await pool.connect();
    try {
      const result = await client.query(
        `SELECT text, chunk_index as "chunkIndex"
         FROM document_vectors
         WHERE source = $1
         ORDER BY chunk_index ASC`,
        [source]
      );
      return result.rows;
    } finally {
      client.release();
    }
  }

  async countAll(): Promise<number> {
    const pool = getPool();
    const client = await pool.connect();
    try {
      const result = await client.query('SELECT COUNT(*) AS total FROM document_vectors');
      return parseInt(result.rows[0].total, 10);
    } finally {
      client.release();
    }
  }

  async clearAll(): Promise<void> {
    const pool = getPool();
    const client = await pool.connect();
    try {
      await client.query('DELETE FROM document_vectors');
    } finally {
      client.release();
    }
  }

  async deleteBySource(source: string): Promise<number> {
    const pool = getPool();
    const client = await pool.connect();
    try {
      const result = await client.query('DELETE FROM document_vectors WHERE source = $1', [source]);
      return result.rowCount || 0;
    } finally {
      client.release();
    }
  }
}

