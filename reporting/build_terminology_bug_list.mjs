import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import ExcelJS from "exceljs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = path.join(repoRoot, "outputs", "terminology-bug-list");
const outputPath = path.join(outputDir, "IMT_Private_Console_Terminology_Bug_List.xlsx");
const artifactsNote = path.join(
  repoRoot,
  "reports",
  "imt-private-console-ui",
  "ARTIFACTS_NOT_INCLUDED.md",
);

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
      "Click Export.",
    ].join("\n"),
    currentResult:
      "Export fails. The page shows a no-permission error even though takeover is active and the page is presented as writable.",
    expectedResult:
      "If takeover is intended to include terminology management, Export should succeed. Otherwise the Export action should be hidden or disabled with a clear explanation before the user clicks it.",
    screenshotLabel: "Failure screenshot",
    screenshotPath: files.orgExportBug,
    screenshotNote: "Bug-state screenshot exists in the original black-box report, but may be omitted from this extracted repo.",
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
      "Click Import and upload a valid terminology JSON file.",
    ].join("\n"),
    currentResult:
      "Import fails with a no-permission outcome while the user is already in takeover mode.",
    expectedResult:
      "If takeover is intended to be full organization management, Import should succeed. Otherwise the Import action should be hidden or disabled with a clear permission explanation.",
    screenshotLabel: "Context screenshot only",
    screenshotPath: files.orgTerminologyPage,
    screenshotNote:
      "Current extracted repo keeps the narrative report, but not necessarily the original import failure screenshot.",
    apiEndpoint:
      "/api/organizations/{organization_id}/terminologies/{terminology_set_id}/concepts/import",
    httpStatus: "403 Forbidden (per report evidence)",
    responseEvidence:
      "Report evidence says import fails in takeover mode with a no-permission outcome. No dedicated raw response body or failure screenshot is stored in current extracted artifacts.",
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
      "Click Export.",
    ].join("\n"),
    currentResult:
      "Export fails with 404 Not Found, while tenant terminology list and lookup continue to work.",
    expectedResult:
      "If tenant export is supported, Export should succeed. If v1 intentionally does not support tenant export, the front end should not expose the action.",
    screenshotLabel: "No screenshot in current artifacts",
    screenshotPath: "",
    screenshotNote:
      "Current extracted repo does not include a dedicated Global Terminology export screenshot.",
    apiEndpoint: "/api/tenant/terminologies/{terminology_set_id}/concepts/export",
    httpStatus: "404 Not Found",
    responseEvidence:
      "The repo's controller test explicitly verifies the tenant export route returns 404 in v1, while list/lookup remain available according to the black-box report.",
    sourceEvidence:
      "Full report: Tenant terminology export is abnormal. API/controller test: Tenant_delete_import_and_export_routes_should_be_absent_in_v1.",
    reportPath: files.tenantControllerTest,
  },
];

const evidenceRows = [
  {
    bugId: "B1",
    evidenceType: "Failure screenshot",
    artifactPath: files.orgExportBug,
    endpoint:
      "/api/organizations/85d45991e3b94dbcb4f99e9e393970c9/terminologies/75a4b37b3c504d3b9fc48139ba8067f5/concepts/export",
    status: "403",
    notes: "Export failure screenshot captured from the original UI flow run.",
    availability: "Optional",
  },
  {
    bugId: "B1",
    evidenceType: "Raw automation JSON",
    artifactPath: files.uiFlowJson,
    endpoint:
      "/api/organizations/85d45991e3b94dbcb4f99e9e393970c9/terminologies/75a4b37b3c504d3b9fc48139ba8067f5/concepts/export",
    status: "403",
    notes: "Raw evidence file is referenced by the narrative report but excluded from this repo by default.",
    availability: "Optional",
  },
  {
    bugId: "B2",
    evidenceType: "Context screenshot",
    artifactPath: files.orgTerminologyPage,
    endpoint: "/api/organizations/{organization_id}/terminologies/{terminology_set_id}/concepts/import",
    status: "403 (report only)",
    notes: "The extracted repo keeps only the report context unless screenshots are restored manually.",
    availability: "Optional",
  },
  {
    bugId: "B2",
    evidenceType: "Report evidence",
    artifactPath: files.fullReport,
    endpoint: "/api/organizations/{organization_id}/terminologies/{terminology_set_id}/concepts/import",
    status: "403 (report only)",
    notes: "Full report states import fails in takeover mode with no-permission behavior.",
    availability: "Available",
  },
  {
    bugId: "B3",
    evidenceType: "Controller / API test evidence",
    artifactPath: files.tenantControllerTest,
    endpoint: "/api/tenant/terminologies/{terminology_set_id}/concepts/export",
    status: "404",
    notes: "Tenant export route is asserted absent in v1 by repository test coverage.",
    availability: "Available",
  },
  {
    bugId: "B3",
    evidenceType: "Black-box summary report",
    artifactPath: files.fullReport,
    endpoint: "/api/tenant/terminologies/{terminology_set_id}/concepts/export",
    status: "404",
    notes: "Full report says tenant terminology list/lookup work but export is abnormal.",
    availability: "Available",
  },
];

const workbook = new ExcelJS.Workbook();
workbook.creator = "Codex";
workbook.created = new Date("2026-05-14T00:00:00Z");
workbook.modified = new Date();

function setHeaderRow(worksheet, rowNumber) {
  const row = worksheet.getRow(rowNumber);
  row.font = { bold: true, color: { argb: "FFFFFFFF" } };
  row.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF4472C4" },
  };
  row.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
  row.eachCell((cell) => {
    cell.border = borderStyle("FFD9E2F3");
  });
}

function borderStyle(color) {
  return {
    top: { style: "thin", color: { argb: color } },
    left: { style: "thin", color: { argb: color } },
    bottom: { style: "thin", color: { argb: color } },
    right: { style: "thin", color: { argb: color } },
  };
}

function styleBodyCell(cell) {
  cell.alignment = { vertical: "top", wrapText: true };
  cell.border = borderStyle("FFD9D9D9");
}

async function exists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function resolveLinkTarget(targetPath) {
  if (!targetPath) {
    return null;
  }
  if (await exists(targetPath)) {
    return targetPath;
  }
  return artifactsNote;
}

function hyperlinkValue(targetPath, label) {
  return {
    text: label,
    hyperlink: pathToFileURL(targetPath).href,
    tooltip: targetPath,
  };
}

function setColumns(worksheet, widths) {
  worksheet.columns = widths.map((width) => ({ width }));
}

async function buildSummarySheet() {
  const sheet = workbook.addWorksheet("Summary", {
    views: [{ state: "frozen", ySplit: 2 }],
  });

  sheet.getCell("A1").value = "IMT Private Console Terminology Bug List";
  sheet.getCell("A1").font = { bold: true, size: 16 };

  const summaryRows = [
    ["Generated On", "2026-05-14"],
    ["Scope", "Terminology-related front-end black-box bug list"],
    ["Source Basis", "Saved reports and workflow assets included in this extracted repo"],
    ["Bug Count", bugs.length],
    ["Screenshots Available", "Narrative reports are included; screenshots remain optional and can be restored later"],
    ["Notes", "Missing raw JSON or screenshots fall back to ARTIFACTS_NOT_INCLUDED.md hyperlinks."],
  ];

  let rowIndex = 3;
  for (const [label, value] of summaryRows) {
    sheet.getCell(`A${rowIndex}`).value = label;
    sheet.getCell(`A${rowIndex}`).font = { bold: true };
    sheet.getCell(`B${rowIndex}`).value = value;
    rowIndex += 1;
  }

  sheet.getCell("A10").value = "UI Flow Report";
  sheet.getCell("A11").value = "Full Test Report";
  sheet.getCell("A12").value = "Automation Summary";
  sheet.getCell("A13").value = "UI Flow Raw JSON";

  for (const cellId of ["A10", "A11", "A12", "A13"]) {
    sheet.getCell(cellId).font = { bold: true };
  }

  const summaryLinks = [
    ["B10", files.uiFlowReport, "Open UI Flow Report"],
    ["B11", files.fullReport, "Open Full Test Report"],
    ["B12", files.summaryReport, "Open Automation Summary"],
    ["B13", files.uiFlowJson, "Open Raw UI Flow JSON"],
  ];

  for (const [cellId, filePath, label] of summaryLinks) {
    const target = await resolveLinkTarget(filePath);
    sheet.getCell(cellId).value = target ? hyperlinkValue(target, label) : label;
  }

  setColumns(sheet, [24, 88]);
  for (let i = 1; i <= 13; i += 1) {
    styleBodyCell(sheet.getRow(i).getCell(1));
    styleBodyCell(sheet.getRow(i).getCell(2));
  }
}

async function buildBugSheet() {
  const sheet = workbook.addWorksheet("Bug List", {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  sheet.addRow([
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
    "Primary Source Link",
  ]);
  setHeaderRow(sheet, 1);

  for (const bug of bugs) {
    const row = sheet.addRow([
      bug.id,
      bug.title,
      bug.description,
      bug.preconditions,
      bug.steps,
      bug.currentResult,
      bug.expectedResult,
      "",
      bug.screenshotPath || "No screenshot file in current artifacts",
      bug.screenshotNote,
      bug.apiEndpoint,
      bug.httpStatus,
      bug.responseEvidence,
      bug.sourceEvidence,
      "",
    ]);

    const screenshotTarget = await resolveLinkTarget(bug.screenshotPath);
    if (screenshotTarget) {
      row.getCell(8).value = hyperlinkValue(screenshotTarget, bug.screenshotLabel);
    } else {
      row.getCell(8).value = bug.screenshotLabel;
    }

    const reportTarget = await resolveLinkTarget(bug.reportPath);
    if (reportTarget) {
      row.getCell(15).value = hyperlinkValue(reportTarget, "Open Source Evidence");
    }

    row.eachCell((cell) => {
      styleBodyCell(cell);
    });
  }

  setColumns(sheet, [10, 32, 44, 34, 42, 34, 34, 18, 42, 40, 42, 18, 44, 42, 20]);
}

async function buildEvidenceSheet() {
  const sheet = workbook.addWorksheet("Evidence", {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  sheet.addRow([
    "Bug ID",
    "Evidence Type",
    "Artifact Link",
    "Artifact Path",
    "Relevant Endpoint",
    "Observed Status",
    "Evidence Notes",
    "Availability",
  ]);
  setHeaderRow(sheet, 1);

  for (const item of evidenceRows) {
    const row = sheet.addRow([
      item.bugId,
      item.evidenceType,
      "",
      item.artifactPath,
      item.endpoint,
      item.status,
      item.notes,
      item.availability,
    ]);

    const target = await resolveLinkTarget(item.artifactPath);
    if (target) {
      row.getCell(3).value = hyperlinkValue(target, "Open Artifact");
    }

    row.eachCell((cell) => {
      styleBodyCell(cell);
    });
  }

  setColumns(sheet, [10, 24, 18, 42, 42, 16, 44, 14]);
}

async function main() {
  await fs.mkdir(outputDir, { recursive: true });
  await buildSummarySheet();
  await buildBugSheet();
  await buildEvidenceSheet();
  await workbook.xlsx.writeFile(outputPath);
  console.log(`Saved workbook to ${outputPath}`);
}

await main();
