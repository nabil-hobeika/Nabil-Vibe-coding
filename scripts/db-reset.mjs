// Wipes the local SQLite database and rebuilds it: delete -> push schema -> seed.
// Local files only; refuses to run against a remote DATABASE_URL.
import { execSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";

const url = process.env.DATABASE_URL ?? "file:./data/local.db";
if (!url.startsWith("file:")) {
  console.error(`Refusing to reset a non-local database: ${url}`);
  process.exit(1);
}

const file = url.slice("file:".length);
for (const f of [file, `${file}-shm`, `${file}-wal`]) {
  if (existsSync(f)) rmSync(f);
}
console.log(`Removed ${file}`);

execSync("npx drizzle-kit push --force", { stdio: "inherit" });
execSync("npm run db:seed", { stdio: "inherit" });
