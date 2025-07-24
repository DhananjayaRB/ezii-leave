import dotenv from "dotenv";
dotenv.config();

import * as schema from "@shared/schema";

let db;

if (process.env.NODE_ENV === "development") {
  // Local dev: Use pg (no WebSocket)
  const pg = await import("pg");
  const { drizzle } = await import("drizzle-orm/node-postgres");

  const Pool = pg.default?.Pool || pg.Pool;

  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL must be set for local PostgreSQL");
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  db = drizzle(pool, { schema });
} else {
  // Production (e.g., Replit): Use Neon serverless with WebSocket
  const neon = await import("@neondatabase/serverless");
  const { drizzle } = await import("drizzle-orm/neon-serverless");
  const wsImport = await import("ws");

  const Pool = neon.default?.Pool || neon.Pool;
  const neonConfig = neon.default?.neonConfig || neon.neonConfig;
  neonConfig.webSocketConstructor = wsImport.default;

  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL must be set for Neon");
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  db = drizzle({ client: pool, schema });
}

export { db };
