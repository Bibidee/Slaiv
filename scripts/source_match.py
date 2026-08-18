"""Compare frozen contract source to the source exposed by the GenLayer CLI.

The tool never treats an unavailable network source as a match.
"""
from __future__ import annotations

import argparse
import hashlib
import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "contracts" / "SlaivClaims.py"


def digest(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def canonical_source(value: bytes) -> bytes:
    """Normalize line endings and the CLI's harmless trailing blank lines."""
    return value.replace(b"\r\n", b"\n").rstrip(b"\n") + b"\n"


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--address", required=True)
    parser.add_argument("--rpc", required=True)
    parser.add_argument("--cli", default="npx")
    args = parser.parse_args()
    local = canonical_source(SOURCE.read_bytes())
    print(f"Contract path: {SOURCE.relative_to(ROOT).as_posix()}")
    print(f"Local SHA-256: {digest(local)}")
    cli = args.cli + ".cmd" if os.name == "nt" and args.cli == "npx" else args.cli
    command = [cli, "--yes", "genlayer@0.39.2", "code", args.address, "--rpc", args.rpc]
    try:
        result = subprocess.run(command, cwd=ROOT, capture_output=True)
    except OSError as exc:
        print("SOURCE MATCH: UNAVAILABLE")
        print(f"Unable to run the configured GenLayer CLI: {exc}")
        return 2
    if result.returncode != 0 or not result.stdout.strip():
        print("SOURCE MATCH: UNAVAILABLE")
        detail = (result.stderr or result.stdout).decode("utf-8", errors="replace").strip()
        print(detail or "GenLayer CLI did not expose deployed source.")
        return 2
    marker = b"\nResult:\n"
    if marker not in result.stdout:
        print("SOURCE MATCH: UNAVAILABLE")
        print("GenLayer CLI did not return a parseable source payload.")
        return 2
    remote = canonical_source(result.stdout.split(marker, 1)[1])
    remote_hash = digest(remote)
    print(f"Network SHA-256: {remote_hash}")
    if remote == local:
        print("SOURCE MATCH: PASS")
        return 0
    print("SOURCE MATCH: FAIL (CLI response was not byte-identical source)")
    return 1


if __name__ == "__main__":
    sys.exit(main())
