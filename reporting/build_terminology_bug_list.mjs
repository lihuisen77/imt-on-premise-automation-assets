import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const repoRoot = path.resolve(import.meta.dirname, "..");
const outputDir = path.join(repoRoot, "outputs", "terminology-bug-list");
const outputPath = path.join(outputDir, "IMT_Private_Console_Terminology_Bug_List.xlsx");

const files = {
  orgExportBug: path.join(repoRoot, "reports", "imt-private-console-ui", "screenshots", "bug-org-terminology-export.png"),
  orgTerminologyPage: path.join(repoRoot, "reports", "imt-private-console-ui", "screenshots", "platform-org-terminology.png"),
  uiFlowReport: path.join(repoRoot, "reports", "imt-private-console-ui", "IMT_Private_Console_前端用户流程测试报告.md"),
  fullReport: path.join(repoRoot, "reports", "IMT_Private_Console_自动化测试汇报材料.md"),
  summaryReport: path.join(repoRoot, "reports", "IMT_Private_Console_自动化测试汇报材料.md"),
  uiFlowJson: path.join(repoRoot, "reports", "imt-private-console-ui", "ui-flow-results.json"),
  tenantControllerTest: path.join(repoRoot, "docs", "superpowers", "plans", "2026-04-29-workflow-env-and-frontend-integration.md"),
};

const bugs = [
  {
    id: "B1",
    title: "Organization Terminology Export fails after takeover",
    description:
      "A platform administrator can start organization takeover and sees the organization terminology page in writable mode, but clicking Export still fails. This makes takeover look incomplete from a user perspective.",
    preconditions:
      "Login as test04 (platform_admin). Use organization 85d45991e3b94dbcb4f99e9e393970c9. Start takeover successfully before entering Terminology.",
    steps: [
      "Login with test04.",
      "Open /app/admin/org/85d45991e3b94dbcb4f99e9e393970c9/members.",
      "Click Start takeover and confirm Takeover active appears.",
      "Open the Terminology tab.",
      "Select terminology set Codex Org Terminology 1778695094317.",
      "Click Export."
    ].join("\n"),
    currentResult:
      "Export fails. The page shows a no-permission error even though takeover is active and the page is presented as writable.",
    expectedResult:
      "If takeover is intended to include terminology management, Export should succeed. Otherwise the Export action should be hidden or disabled with a clear explanation before the user clicks it.",
    screenshotLabel: "Failure screenshot",
    screenshotPath: files.orgExportBug,
    screenshotNote: "Bug-state screenshot exists in current black-box report.",
    apiEndpoint:
      "/api/organizations/85d45991e3b94dbcb4f99e9e393970c9/terminologies/75a4b37b3c504d3b9fc48139ba8067f5/concepts/export",
    httpStatus: "403 Forbidden",
    responseEvidence:
      "UI text: You do not have permission to perform this action. Raw automation evidence shows status 403 for the export endpoint.",
    sourceEvidence:
      "UI flow report BUG-UI-004; ui-flow-results.json lines around 1123-1129; screenshot bug-org-terminology-export.png.",
    reportPath: files.uiFlowReport,
  },
  {
    id: "B2",
    title: "Organization Terminology Import fails after takeover",
    description:
      "Import has the same permission-boundary problem as Export. After organization takeover is active, the user still cannot import terminology data.",
    preconditions:
      "Login as test04 (platform_admin). Use the same organization as above and ensure takeover is active before entering Terminology.",
    steps: [
      "Login with test04.",
      "Open the target organization members page.",
      "Click Start takeover and confirm Takeover active appears.",
      "Open the Terminology tab.",
      "Select an organization terminology set.",
      "Click Import and upload a valid terminology JSON file."
    ].join("\n"),
    currentResult:
      "Import fails with a no-permission outcome while the user is already in takeover mode.",
    expectedResult:
      "If takeover is intended to be full organization management, Import should succeed. Otherwise the Import action should be hidden or disabled with a clear permission explanation.",
    screenshotLabel: "Context screenshot only",
    screenshotPath: files.orgTerminologyPage,
    screenshotNote:
      "Current artifacts contain the terminology page screenshot with Import/Export buttons visible, but no dedicated failure-state screenshot for Import.",
    apiEndpoint:
      "/api/organizations/{organization_id}/terminologies/{terminology_set_id}/concepts/import",
    httpStatus: "403 Forbidden (per report evidence)",
    responseEvidence:
      "Report evidence says import fails in takeover mode with a no-permission outcome. No dedicated raw response body or failure screenshot is stored in current artifacts.",
    sourceEvidence:
      "Full test report marks Organization Terminology Import as abnormal and notes takeover import is not allowed.",
    reportPath: files.fullReport,
  },
  {
    id: "B3",
    title: "Tenant / Global Terminology Export is exposed but unavailable in v1",
    description:
      "The Global Terminology experience allows list and lookup behavior, but export is unavailable. Users see a capability mismatch: a terminology set can be viewed and searched, yet export fails.",
    preconditions:
      "Login as platform_admin and open Global Terminology / tenant terminology management.",
    steps: [
      "Login as platform_admin.",
      "Open Global Terminology.",
      "Open an existing tenant terminology set.",
      "Click Export."
    ].join("\n"),
    currentResult:
      "Export fails with 404 Not Found, while tenant terminology list and lookup continue to work.",
    expectedResult:
      "If tenant export is supported, Export should succeed. If v1 intentionally does not support tenant export, the front end should not expose the action.",
    screenshotLabel: "No screenshot in current artifacts",
    screenshotPath: "",
    screenshotNote:
      "Current repo artifacts do not include a dedicated Global Terminology export screenshot.",
    apiEndpoint: "/api/tenant/terminologies/{terminology_set_id}/concepts/export",
    httpStatus: "404 Not Found",
    responseEvidence:
      "The repo's controller test explicitly verifies the tenant export route returns 404 in v1, while list/lookup remain available according to the black-box report.",
    sourceEvidence:
      "Full report: Tenant terminology export is abnormal. API/controller test: Tenant_delete_import_and_export_routes_should_be_absent_in_v1.",
    reportPath: files.tenantControllerTest,
  },
];

const workbook = Workbook.create();

function setHeaderStyle(range) {
  range.format.fill = "accent1";
  range.format.font = { color: "lt1", bold: true };
  range.format.horizontalAlignment = "center";
  range.format.wrapText = true;
  range.format.borders = { preset: "outside", style: "thin", color: "#D9E2F3" };
}

function setBodyStyle(range) {
  range.format.wrapText = true;
  range.format.verticalAlignment = "top";
  range.format.borders = { preset: "outside", style: "thin", color: "#D9D9D9" };
}

function linkFormula(targetPath, label) {
  if (!targetPath) {
    return "";
  }
  const fileUrl = pathToFileURL(targetPath).href;
  return `=HYPERLINK("${fileUrl}", "${label.replaceAll("\"", "\"\"")}")`;
}

function escapeValue(value) {
  return typeof value === "string" ? value.replaceAll("\r", "") : value;
}

const summarySheet = workbook.worksheets.add("Summary");
summarySheet.getRange("A1").values = [["IMT Private Console Terminology Bug List"]];
summarySheet.getRange("A1").format.font = { bold: true, size: 16 };
summarySheet.getRange("A3:B8").values = [
  ["Generated On", "2026-05-14"],
  ["Scope", "Terminology-related front-end black-box bug list"],
  ["Source Basis", "Latest saved test artifacts in repo"],
  ["Bug Count", bugs.length],
  ["Screenshots Available", "B1 failure screenshot, B2 context screenshot, B3 no screenshot in current artifacts"],
  ["Notes", "Where dedicated failure screenshots or raw response bodies are missing, the workbook flags the evidence gap explicitly."]
];
summarySheet.getRange("A10:B13").values = [
  ["UI Flow Report", "Open file"],
  ["Full Test Report", "Open file"],
  ["Automation Summary", "Open file"],
  ["UI Flow Raw JSON", "Open file"],
];
summarySheet.getRange("B10").formulas = [[linkFormula(files.uiFlowReport, "Open UI Flow Report")]];
summarySheet.getRange("B11").formulas = [[linkFormula(files.fullReport, "Open Full Test Report")]];
summarySheet.getRange("B12").formulas = [[linkFormula(files.summaryReport, "Open Automation Summary")]];
summarySheet.getRange("B13").formulas = [[linkFormula(files.uiFlowJson, "Open Raw UI Flow JSON")]];
summarySheet.getRange("A3:A13").format.font.bold = true;
summarySheet.freezePanes.freezeRows(2);
summarySheet.getRange("A1:B13").format.wrapText = true;
summarySheet.getRange("A1:B13").format.borders = { preset: "outside", style: "thin", color: "#D9D9D9" };
summarySheet.getRange("A:A").format.columnWidth = 24;
summarySheet.getRange("B:B").format.columnWidth = 88;

const bugSheet = workbook.worksheets.add("Bug List");
const headers = [[
  "Bug ID",
  "Title",
  "Description",
  "Preconditions",
  "Reproduction Steps",
  "Current Result",
  "Expected Result",
  "Screenshot Link",
  "Screenshot Path",
  "Screenshot Notes",
  "API Endpoint",
  "HTTP Status",
  "Response / Evidence",
  "Source Evidence",
  "Primary Source Link"
]];
bugSheet.getRange("A1:O1").values = headers;
setHeaderStyle(bugSheet.getRange("A1:O1"));

const bugRows = bugs.map((bug) => [
  bug.id,
  bug.title,
  escapeValue(bug.description),
  escapeValue(bug.preconditions),
  escapeValue(bug.steps),
  escapeValue(bug.currentResult),
  escapeValue(bug.expectedResult),
  null,
  bug.screenshotPath || "No screenshot file in current artifacts",
  escapeValue(bug.screenshotNote),
  bug.apiEndpoint,
  bug.httpStatus,
  escapeValue(bug.responseEvidence),
  escapeValue(bug.sourceEvidence),
  null,
]);

bugSheet.getRange(`A2:O${bugs.length + 1}`).values = bugRows;
for (let row = 0; row < bugs.length; row += 1) {
  const sheetRow = row + 2;
  bugSheet.getRange(`H${sheetRow}`).formulas = [[linkFormula(bugs[row].screenshotPath, bugs[row].screenshotLabel)]];
  bugSheet.getRange(`O${sheetRow}`).formulas = [[linkFormula(bugs[row].reportPath, "Open Source Evidence")]];
}

setBodyStyle(bugSheet.getRange(`A2:O${bugs.length + 1}`));
bugSheet.freezePanes.freezeRows(1);
bugSheet.getRange("A:A").format.columnWidth = 10;
bugSheet.getRange("B:B").format.columnWidth = 32;
bugSheet.getRange("C:C").format.columnWidth = 44;
bugSheet.getRange("D:D").format.columnWidth = 34;
bugSheet.getRange("E:E").format.columnWidth = 42;
bugSheet.getRange("F:F").format.columnWidth = 34;
bugSheet.getRange("G:G").format.columnWidth = 34;
bugSheet.getRange("H:H").format.columnWidth = 18;
bugSheet.getRange("I:I").format.columnWidth = 42;
bugSheet.getRange("J:J").format.columnWidth = 40;
bugSheet.getRange("K:K").format.columnWidth = 42;
bugSheet.getRange("L:L").format.columnWidth = 18;
bugSheet.getRange("M:M").format.columnWidth = 44;
bugSheet.getRange("N:N").format.columnWidth = 42;
bugSheet.getRange("O:O").format.columnWidth = 20;

const evidenceSheet = workbook.worksheets.add("Evidence");
evidenceSheet.getRange("A1:H1").values = [[
  "Bug ID",
  "Evidence Type",
  "Artifact Link",
  "Artifact Path",
  "Relevant Endpoint",
  "Observed Status",
  "Evidence Notes",
  "Availability"
]];
setHeaderStyle(evidenceSheet.getRange("A1:H1"));

const evidenceRows = [
  [
    "B1",
    "Failure screenshot",
    null,
    files.orgExportBug,
    "/api/organizations/85d45991e3b94dbcb4f99e9e393970c9/terminologies/75a4b37b3c504d3b9fc48139ba8067f5/concepts/export",
    "403",
    "Export failure screenshot captured from real UI flow.",
    "Available"
  ],
  [
    "B1",
    "Raw automation JSON",
    null,
    files.uiFlowJson,
    "/api/organizations/85d45991e3b94dbcb4f99e9e393970c9/terminologies/75a4b37b3c504d3b9fc48139ba8067f5/concepts/export",
    "403",
    "Raw evidence includes explicit API status entry for the export endpoint.",
    "Available"
  ],
  [
    "B2",
    "Context screenshot",
    null,
    files.orgTerminologyPage,
    "/api/organizations/{organization_id}/terminologies/{terminology_set_id}/concepts/import",
    "403 (report only)",
    "The page screenshot shows Import/Export actions, but no dedicated import failure screenshot exists in current artifacts.",
    "Partial"
  ],
  [
    "B2",
    "Report evidence",
    null,
    files.fullReport,
    "/api/organizations/{organization_id}/terminologies/{terminology_set_id}/concepts/import",
    "403 (report only)",
    "Full report states import fails in takeover mode with no-permission behavior.",
    "Available"
  ],
  [
    "B3",
    "Controller / API test evidence",
    null,
    files.tenantControllerTest,
    "/api/tenant/terminologies/{terminology_set_id}/concepts/export",
    "404",
    "Tenant export route is asserted absent in v1 by repository test coverage.",
    "Available"
  ],
  [
    "B3",
    "Black-box summary report",
    null,
    files.fullReport,
    "/api/tenant/terminologies/{terminology_set_id}/concepts/export",
    "404",
    "Full report says tenant terminology list/lookup work but export is abnormal.",
    "Available"
  ]
];

evidenceSheet.getRange(`A2:H${evidenceRows.length + 1}`).values = evidenceRows;
for (let row = 0; row < evidenceRows.length; row += 1) {
  evidenceSheet.getRange(`C${row + 2}`).formulas = [[linkFormula(evidenceRows[row][3], "Open Artifact")]];
}
setBodyStyle(evidenceSheet.getRange(`A2:H${evidenceRows.length + 1}`));
evidenceSheet.freezePanes.freezeRows(1);
evidenceSheet.getRange("A:A").format.columnWidth = 10;
evidenceSheet.getRange("B:B").format.columnWidth = 24;
evidenceSheet.getRange("C:C").format.columnWidth = 18;
evidenceSheet.getRange("D:D").format.columnWidth = 42;
evidenceSheet.getRange("E:E").format.columnWidth = 42;
evidenceSheet.getRange("F:F").format.columnWidth = 16;
evidenceSheet.getRange("G:G").format.columnWidth = 44;
evidenceSheet.getRange("H:H").format.columnWidth = 14;

const summaryInspectRange = summarySheet.getRange("A1:B13");
const bugInspectRange = bugSheet.getRange(`A1:O${bugs.length + 1}`);
const evidenceInspectRange = evidenceSheet.getRange(`A1:H${evidenceRows.length + 1}`);

await fs.mkdir(outputDir, { recursive: true });

const inspectPayload = await workbook.inspect({
  kind: "table",
  range: "Bug List!A1:O4",
  include: "values,formulas",
  tableMaxRows: 4,
  tableMaxCols: 15,
});
console.log(inspectPayload.ndjson);

summaryInspectRange.format.autofitRows?.();
bugInspectRange.format.autofitRows?.();
evidenceInspectRange.format.autofitRows?.();

try {
  await workbook.render({ sheetName: "Bug List", range: "A1:O4", scale: 1.2 });
} catch (error) {
  console.warn("Render skipped:", error?.message ?? String(error));
}

const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(outputPath);
console.log(`Saved workbook to ${outputPath}`);
