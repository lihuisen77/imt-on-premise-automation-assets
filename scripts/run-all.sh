#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$repo_root"

if [ ! -d node_modules ]; then
  echo "[run-all] Installing dependencies"
  npm install
else
  echo "[run-all] Reusing existing node_modules"
fi

echo "[run-all] Running repo diagnostics"
npm run doctor

echo "[run-all] Generating workbook"
npm run build:terminology-bug-list

echo "[run-all] Done"
echo "[run-all] Output: $repo_root/outputs/terminology-bug-list/IMT_Private_Console_Terminology_Bug_List.xlsx"
