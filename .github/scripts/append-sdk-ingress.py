#!/usr/bin/env python3
import os
import re
import sys
from pathlib import Path


def main() -> int:
    if len(sys.argv) != 2:
        print("usage: append-sdk-ingress.py <settings.yaml>", file=sys.stderr)
        return 2

    settings_path = Path(sys.argv[1])
    settings = settings_path.read_text()
    docs = re.split(r"(?m)^---\s*$", settings)
    ingress = next((doc.strip() for doc in docs if re.search(r"(?m)^kind:\s*Ingress\s*$", doc)), None)
    if ingress is None:
        print("No Ingress manifest found in rendered settings.yaml", file=sys.stderr)
        return 1

    sdk_host = f"{os.environ['PUBLIC_PROJECT_NAME']}-sdk.{os.environ['K8S_CLUSTER_DOMAIN']}"
    settings_path.write_text(settings.rstrip() + "\n---\n" + transform_ingress(ingress, sdk_host) + "\n")
    return 0


def transform_ingress(ingress: str, sdk_host: str) -> str:
    updated: list[str] = []
    in_metadata = False
    renamed = False
    hosts_indent: int | None = None

    for line in ingress.splitlines():
        stripped = line.strip()
        indent = len(line) - len(line.lstrip(" "))

        if stripped == "metadata:":
            in_metadata = True
            hosts_indent = None
            updated.append(line)
            continue

        if in_metadata and stripped.startswith("name:") and not renamed:
            prefix, name = line.split("name:", 1)
            updated.append(f"{prefix}name:{name.rstrip()}-sdk")
            renamed = True
            in_metadata = False
            continue

        if re.match(r"^\s*(?:-\s*)?host:\s*", line):
            updated.append(re.sub(r"^(\s*(?:-\s*)?host:\s*).*$", rf"\1{sdk_host}", line))
            hosts_indent = None
            continue

        if stripped in ("hosts:", "- hosts:"):
            hosts_indent = indent
            updated.append(line)
            continue

        if hosts_indent is not None:
            if indent <= hosts_indent or not stripped:
                hosts_indent = None
            elif re.match(r"^\s*-\s*", line):
                updated.append(re.sub(r"^(\s*-\s*).*$", rf"\1{sdk_host}", line))
                continue

        updated.append(line)

    return "\n".join(updated)


if __name__ == "__main__":
    raise SystemExit(main())
