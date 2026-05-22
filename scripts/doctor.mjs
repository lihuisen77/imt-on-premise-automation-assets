import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const requiredPaths = [
  "package.json",
  "reporting/build_terminology_bug_list.mjs",
  "reports/IMT_Private_Console_自动化测试汇报材料.md",
  "reports/imt-private-console-ui/IMT_Private_Console_前端用户流程测试报告.md",
];

const optionalPaths = [
  "reports/imt-private-console-ui/ui-flow-results.json",
  "reports/imt-private-console-ui/people-manage-org-result.json",
  "reports/imt-private-console-ui/screenshots/bug-org-terminology-export.png",
  "reports/imt-private-console-ui/screenshots/platform-org-terminology.png",
];

async function exists(relativePath) {
  try {
    await fs.access(path.join(repoRoot, relativePath));
    return true;
  } catch {
    return false;
  }
}

async function main() {
  let hasMissingRequired = false;

  console.log("Required paths:");
  for (const relativePath of requiredPaths) {
    const present = await exists(relativePath);
    console.log(`- ${present ? "OK " : "MISS"} ${relativePath}`);
    if (!present) {
      hasMissingRequired = true;
    }
  }

  console.log("");
  console.log("Optional evidence paths:");
  for (const relativePath of optionalPaths) {
    const present = await exists(relativePath);
    console.log(`- ${present ? "OK " : "SKIP"} ${relativePath}`);
  }

  console.log("");
  console.log(`Repo root: ${repoRoot}`);
  console.log("Outputs directory will be created automatically when reports are generated.");

  if (hasMissingRequired) {
    process.exitCode = 1;
  }
}

await main();
