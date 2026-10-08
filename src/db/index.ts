import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import * as schema from "./schema";

type Db = LibSQLDatabase<typeof schema>;

let instance: Db | undefined;

// The connection is opened on first use, not on import, so `next build` works
// on a machine with no database (e.g. a fresh checkout on Vercel).
function getDb(): Db {
  if (instance) return instance;

  const url = process.env.DATABASE_URL;
  if (!url && process.env.NODE_ENV === "production") {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  const client = createClient({
    url: url ?? "file:./data/local.db",
    // Only needed for a hosted libSQL database such as Turso; ignored for local files.
    authToken: process.env.DATABASE_AUTH_TOKEN,
  });
  instance = drizzle(client, { schema });
  return instance;
}

export const db: Db = new Proxy({} as Db, {
  get(_target, prop) {
    const real = getDb();
    const value = Reflect.get(real, prop, real);
    return typeof value === "function" ? value.bind(real) : value;
  },
});
