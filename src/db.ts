import mysql from "mysql2/promise";

function parseMysqlUrl(raw: string) {
  const u = new URL(raw);
  const database = u.pathname.replace(/^\//, "");
  if (!u.hostname || !database) {
    throw new Error("DATABASE_URL inválida: falta host o nombre de base de datos");
  }
  return {
    host: u.hostname,
    port: Number(u.port || 3306),
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database,
  };
}

let pool: mysql.Pool | null = null;

export function getPool(): mysql.Pool {
  if (pool) return pool;
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    throw new Error("DATABASE_URL no está definida en el entorno");
  }
  const cfg = parseMysqlUrl(url);
  pool = mysql.createPool({
    ...cfg,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
  });
  return pool;
}

export async function pingDb(): Promise<boolean> {
  const p = getPool();
  const [rows] = await p.query("SELECT 1 AS ok");
  const row = (rows as { ok: number }[])[0];
  return row?.ok === 1;
}
