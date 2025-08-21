// FORCE CONNECTION TO EXTERNAL PRODUCTION DATABASE
<<<<<<< HEAD
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "@shared/schema";

// COMPLETELY OVERRIDE ANY ENVIRONMENT VARIABLES
const FORCED_EXTERNAL_URL =
  "postgres://postgres:resolve%402022@20.204.119.48:5432/ezii-leave";
=======
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

// COMPLETELY OVERRIDE ANY ENVIRONMENT VARIABLES
const FORCED_EXTERNAL_URL = "postgres://postgres:resolve%402022@20.204.119.48:5432/ezii-leave";
>>>>>>> 86b9e613a1c56dccd44b752e2920391633e6ebe0

// Force override any environment variables
process.env.DATABASE_URL = FORCED_EXTERNAL_URL;

<<<<<<< HEAD
console.log(
  "[DATABASE] HARD OVERRIDE - Forcing connection to external database",
);
console.log(
  "[DATABASE] Environment DATABASE_URL:",
  process.env.DATABASE_URL?.replace(/:[^:]*@/, ":****@"),
);
console.log(
  "[DATABASE] Using URL:",
  FORCED_EXTERNAL_URL.replace(/:[^:]*@/, ":****@"),
);
=======
console.log("[DATABASE] HARD OVERRIDE - Forcing connection to external database");
console.log("[DATABASE] Environment DATABASE_URL:", process.env.DATABASE_URL?.replace(/:[^:]*@/, ':****@'));
console.log("[DATABASE] Using URL:", FORCED_EXTERNAL_URL.replace(/:[^:]*@/, ':****@'));
>>>>>>> 86b9e613a1c56dccd44b752e2920391633e6ebe0

// Destroy any existing connections
if (global.pool) {
  console.log("[DATABASE] Destroying existing pool");
  global.pool.end();
  delete global.pool;
}

<<<<<<< HEAD
export const pool = new Pool({
=======
export const pool = new Pool({ 
>>>>>>> 86b9e613a1c56dccd44b752e2920391633e6ebe0
  connectionString: FORCED_EXTERNAL_URL,
  ssl: false,
  max: 10,
  min: 1,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 2000,
});

// Test the connection
<<<<<<< HEAD
pool
  .connect()
  .then((client) => {
    client
      .query(
        "SELECT current_database(), inet_server_addr(), inet_server_port()",
      )
      .then((result) => {
        console.log("[DATABASE] Connected to:", result.rows[0]);
        client.release();
      })
      .catch((err) => {
        console.error("[DATABASE] Test query failed:", err);
        client.release();
      });
  })
  .catch((err) => {
    console.error("[DATABASE] Connection failed:", err);
  });

export const db = drizzle(pool, { schema });
=======
pool.connect().then(client => {
  client.query('SELECT current_database(), inet_server_addr(), inet_server_port()').then(result => {
    console.log("[DATABASE] Connected to:", result.rows[0]);
    client.release();
  }).catch(err => {
    console.error("[DATABASE] Test query failed:", err);
    client.release();
  });
}).catch(err => {
  console.error("[DATABASE] Connection failed:", err);
});

export const db = drizzle(pool, { schema });
>>>>>>> 86b9e613a1c56dccd44b752e2920391633e6ebe0
