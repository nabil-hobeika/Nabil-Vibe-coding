import { defineConfig } from "drizzle-kit";

const url = process.env.DATABASE_URL ?? "file:./data/local.db";
const authToken = process.env.DATABASE_AUTH_TOKEN;
const isRemote = url.startsWith("libsql:") || url.startsWith("https:");

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  ...(isRemote
    ? { dialect: "turso" as const, dbCredentials: { url, authToken } }
    : { dialect: "sqlite" as const, dbCredentials: { url } }),
});
