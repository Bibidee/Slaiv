"""Fail release verification unless exactly one tracked Intelligent Contract exists."""
from __future__ import annotations

import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONTRACT = re.compile(r"^\s*class\s+\w+\s*\(\s*gl\.Contract\s*\)", re.MULTILINE)


def tracked_files() -> list[Path]:
    result = subprocess.run(["git", "ls-files"], cwd=ROOT, text=True, capture_output=True, check=True)
    return [ROOT / line for line in result.stdout.splitlines() if line.endswith(".py")]


def main() -> int:
    candidates = [path.relative_to(ROOT).as_posix() for path in tracked_files() if CONTRACT.search(path.read_text(encoding="utf-8"))]
    print(f"Contract candidates: {len(candidates)}")
    for candidate in candidates:
        print(candidate)
    if candidates != ["contracts/SlaivClaims.py"]:
        print("FAIL: expected exactly contracts/SlaivClaims.py")
        return 1
    print("PASS")
    return 0


if __name__ == "__main__":
    sys.exit(main())
