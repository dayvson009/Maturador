const fs = require('fs');
const path = require('path');
const pool = require('./db');

const TABLE = process.env.WWEBJS_TABLE || 'wwebjs_sessions';

class PostgresStore {
  constructor() {}

  async sessionExists({ session }) {
    const client = await pool.connect();
    try {
      const { rows } = await client.query(
        `SELECT 1 FROM ${TABLE} WHERE client_id = $1 LIMIT 1`,
        [session]
      );
      return rows.length > 0;
    } finally {
      client.release();
    }
  }

  async save({ session }) {
    const zipFile = `${session}.zip`;
    const zipPath = path.resolve(zipFile);
    const data = await fs.promises.readFile(zipPath);
    const base64 = data.toString('base64');

    const client = await pool.connect();
    try {
      await client.query(
        `INSERT INTO ${TABLE} (client_id, data, updated_at)
         VALUES ($1, $2::jsonb, NOW())
         ON CONFLICT (client_id)
         DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`,
        [session, JSON.stringify({ zipBase64: base64 })]
      );
    } finally {
      client.release();
    }
  }

  async extract({ session, path: outPath }) {
    const client = await pool.connect();
    try {
      const { rows } = await client.query(
        `SELECT data FROM ${TABLE} WHERE client_id = $1 LIMIT 1`,
        [session]
      );
      if (!rows.length) return;
      const base64 = rows[0].data?.zipBase64;
      if (!base64) return;
      const buffer = Buffer.from(base64, 'base64');
      await fs.promises.writeFile(outPath, buffer);
    } finally {
      client.release();
    }
  }

  async delete({ session }) {
    const client = await pool.connect();
    try {
      await client.query(
        `DELETE FROM ${TABLE} WHERE client_id = $1`,
        [session]
      );
    } finally {
      client.release();
    }
  }
}

module.exports = { PostgresStore };


