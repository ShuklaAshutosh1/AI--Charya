import { mkdir, writeFile } from "node:fs/promises";

await mkdir("server-dist", { recursive: true });
await writeFile(
  "server-dist/package.json",
  `${JSON.stringify({ type: "module" }, null, 2)}\n`,
  "utf8"
);
