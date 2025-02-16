// app/utils/db.server.ts
import type { Client as PGClientType } from "pg";
import pkg from "pg";
const { Client } = pkg;

async function connectWithRetry(
  client: PGClientType,
  retries = 5,
  delay = 2000
) {
  for (let i = 0; i < retries; i++) {
    try {
      await client.connect();
      return;
    } catch (error) {
      console.error("Failed to connect to Postgres. Retrying...", error);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw new Error("Unable to connect to Postgres after multiple attempts.");
}

/* eslint-disable no-var */
declare global {
  var __dbClient: PGClientType | undefined;
}
/* eslint-enable no-var */

const client =
  global.__dbClient ??
  (new Client({
    connectionString: process.env.DATABASE_URL,
  }) as PGClientType);

if (!global.__dbClient) {
  connectWithRetry(client).catch((err) => {
    console.error("Failed to connect to Postgres:", err);
  });
  global.__dbClient = client;
}

console.log("DATABASE_URL:", process.env.DATABASE_URL);

export { client };
