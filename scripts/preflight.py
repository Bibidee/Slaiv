"""Run the release gate.  A missing deployment record or any failed check fails closed."""
from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEPLOYMENT = ROOT / "release" / "deployment.json"


def run(command: list[str]) -> None:
    print("+", " ".join(command))
    completed = subprocess.run(command, cwd=ROOT)
    if completed.returncode:
        raise SystemExit(completed.returncode)


def validate_deployment() -> dict:
    if not DEPLOYMENT.exists():
        raise SystemExit("FAIL: release/deployment.json is required for a submission release.")
    record = json.loads(DEPLOYMENT.read_text(encoding="utf-8"))
    required = {"network", "contract_address", "deployment_tx", "deployer", "protocol_authority", "source_sha256", "git_commit", "cli_version"}
    missing = sorted(key for key in required if not isinstance(record.get(key), str) or not record[key])
    if missing:
        raise SystemExit("FAIL: deployment metadata missing " + ", ".join(missing))
    return record


def main() -> int:
    record = validate_deployment()
    if not (ROOT / ".env.example").exists():
        raise SystemExit("FAIL: .env.example missing")
    run([sys.executable, "scripts/audit_contract_candidates.py"])
    wsl = os.environ.get("SLAIV_DIRECT_PYTHON", "/home/imani/slaivdirect/.venv/bin/python")
    run(["wsl.exe", "bash", "-lc", f"cd /mnt/c/Users/ojiku/Desktop/Slaiv && {wsl} -m pytest tests/direct -q"])
    npm = "npm.cmd" if os.name == "nt" else "npm"
    run([npm, "run", "lint"])
    run([npm, "run", "typecheck"])
    run([npm, "test"])
    run([npm, "run", "build"])
    run([sys.executable, "scripts/source_match.py", "--address", record["contract_address"], "--rpc", record.get("rpc_url", "https://studio.genlayer.com/api")])
    print("PREFLIGHT: PASS")
    return 0


if __name__ == "__main__":
    sys.exit(main())
