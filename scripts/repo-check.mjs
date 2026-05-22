import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const expected = {
  description:
    "Automation workflows, deployment references, and report-generation assets for IMT on-premise operations.",
  topics: ["imt", "automation", "deployment", "reporting", "github-actions", "on-premise"],
  visibility: "public",
};

async function runGh(args) {
  const { stdout } = await execFileAsync("gh", args, { maxBuffer: 1024 * 1024 });
  return stdout.trim();
}

function printMatch(label, actual, wanted) {
  const ok = JSON.stringify(actual) === JSON.stringify(wanted);
  console.log(`- ${ok ? "OK " : "DIFF"} ${label}`);
  console.log(`  actual: ${JSON.stringify(actual)}`);
  console.log(`  wanted: ${JSON.stringify(wanted)}`);
}

async function main() {
  const repo = await runGh([
    "repo",
    "view",
    "--json",
    "nameWithOwner,description,visibility,viewerPermission,repositoryTopics",
  ]);
  const parsed = JSON.parse(repo);
  const topics = (parsed.repositoryTopics ?? []).map((item) => item.topic.name).sort();
  const wantedTopics = [...expected.topics].sort();
  const visibility = String(parsed.visibility ?? "").toLowerCase();

  console.log(`Repository: ${parsed.nameWithOwner}`);
  console.log(`Viewer permission: ${parsed.viewerPermission}`);
  printMatch("description", parsed.description ?? "", expected.description);
  printMatch("visibility", visibility, expected.visibility);
  printMatch("topics", topics, wantedTopics);
}

await main();
