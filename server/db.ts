import dotenv from "dotenv";
dotenv.config();

import * as schema from "@shared/schema";

let db;

if (process.env.NODE_ENV === "development") {
  // Local dev: Use pg (no WebSocket)
  const { Pool } = await import("pg");
  const { drizzle } = await import("drizzle-orm/node-postgres");

  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL must be set for local PostgreSQL");
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  db = drizzle(pool, { schema });
} else {
  // Production (Replit): Use Neon serverless with WebSocket
  const { Pool, neonConfig } = await import("@neondatabase/serverless");
  const { drizzle } = await import("drizzle-orm/neon-serverless");
  const ws = (await import("ws")).default;

  neonConfig.webSocketConstructor = ws;

  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL must be set for Neon");
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  db = drizzle({ client: pool, schema });
}

export { db };
