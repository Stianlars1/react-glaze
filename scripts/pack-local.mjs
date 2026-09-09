import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
execFileSync("npm", ["run", "build", "-w", "react-glaze"], {
  cwd: root,
  stdio: "inherit",
});
const parent = join(root, "work/package-packs");
mkdirSync(parent, { recursive: true });
const output = mkdtempSync(join(parent, `${new Date().toISOString().replaceAll(":", "-")}-`));
const [pack] = JSON.parse(execFileSync("npm", [
  "pack", "-w", "react-glaze", "--json", "--pack-destination", output,
], { cwd: root, encoding: "utf8" }));
const archive = join(output, pack.filename);
const unexpected = pack.files.filter(({ path }) =>
  !path.startsWith("dist/") && !["package.json", "README.md", "LICENSE", "THIRD-PARTY-NOTICES.md"].includes(path),
);
if (unexpected.length) throw new Error(`Unexpected package files: ${unexpected.map(file => file.path).join(", ")}`);
writeFileSync(join(output, "manifest.json"), JSON.stringify({
  ...pack,
  sha256: createHash("sha256").update(readFileSync(archive)).digest("hex"),
}, null, 2) + "\n");
console.log(`Local archive: ${archive}`);
