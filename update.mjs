#!/usr/bin/env node

import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

const SOURCE_URL =
  "https://raw.githubusercontent.com/aamiaa/discord-api-diff/refs/heads/main/quests.json";
const OUTPUT_PATH = path.join("data", "quests.json");
const LATEST_COUNT = 100;

async function main() {
  const res = await fetch(SOURCE_URL, {
    headers: {
      // avoid any caching layer serving stale content
      "Cache-Control": "no-cache",
    },
  });

  if (!res.ok) {
    throw new Error(
      `Failed to fetch source JSON: ${res.status} ${res.statusText}`
    );
  }

  const data = await res.json();

  if (!Array.isArray(data)) {
    throw new Error("Expected source JSON to be an array of quest objects");
  }

  const latest = data.slice(-LATEST_COUNT).reverse();

  const output = {
    source: SOURCE_URL,
    updated_at: new Date().toISOString(),
    count: latest.length,
    quests: latest,
  };

  await mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, JSON.stringify(output, null, 2) + "\n", "utf8");

  console.log(`Wrote ${latest.length} quests to ${OUTPUT_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
