#!/usr/bin/env python3
"""Validate the draw-odontogram-teeth skill's executable fixture contract."""

import argparse
import json
import re
from pathlib import Path


ROOT = Path(__file__).parent.resolve()
DEFAULT_FIXTURE = ROOT / "tests/draw-odontogram-teeth.test.md"
REQUIRED_FILES = (
    "SKILL.md",
    "agents/openai.yaml",
    "references/anatomy-svg-standard.md",
    "references/fhir-dental-core-graphics.md",
    "tests/draw-odontogram-teeth.test.md",
)
EXPECTED_INPUTS = {
    "permanent-template": {"fdi": "11", "dentition": "permanent", "view": "facial"},
    "primary-template": {"fdi": "54", "dentition": "primary", "view": "facial"},
    "surface-specific-finding": {"fdi": "16", "surface": "buccal", "finding": "scored-caries"},
    "unmapped-drifting": {
        "concept": "new-renderer-layer",
        "adapter_capability": "absent",
        "expected_outcome": "report-unmapped-drifting",
    },
}
CONTRACT_PATTERN = re.compile(r"```json\s*\n(?P<body>.*?)\n```", re.DOTALL)


def load_contract(path: Path) -> list[dict[str, object]]:
    matches = CONTRACT_PATTERN.findall(path.read_text(encoding="utf-8"))
    if len(matches) != 1:
        raise ValueError(f"{path}: expected exactly one JSON contract block")
    payload = json.loads(matches[0])
    cases = payload.get("cases") if isinstance(payload, dict) else None
    if not isinstance(cases, list):
        raise ValueError(f"{path}: contract must contain a cases list")
    if not all(isinstance(case, dict) for case in cases):
        raise ValueError(f"{path}: every case must be an object")
    return cases


def validate_case(case: dict[str, object]) -> list[str]:
    case_id = case.get("id")
    if not isinstance(case_id, str) or case_id not in EXPECTED_INPUTS:
        return [f"unknown contract case: {case_id!r}"]

    errors: list[str] = []
    if case.get("input") != EXPECTED_INPUTS[case_id]:
        errors.append(f"{case_id}: input does not match the required clinical scenario")

    assertions = case.get("assertions")
    if not isinstance(assertions, list) or not assertions:
        return errors + [f"{case_id}: assertions must be a non-empty list"]

    for assertion in assertions:
        if not isinstance(assertion, dict):
            errors.append(f"{case_id}: assertion must be an object")
            continue
        path = assertion.get("path")
        phrases = assertion.get("must_include")
        if not isinstance(path, str) or not isinstance(phrases, list) or not all(isinstance(item, str) for item in phrases):
            errors.append(f"{case_id}: assertion requires a path and string must_include list")
            continue
        document = (ROOT / path).resolve()
        if not document.is_relative_to(ROOT) or not document.is_file():
            errors.append(f"{case_id}: assertion path is unavailable: {path}")
            continue
        content = document.read_text(encoding="utf-8")
        for phrase in phrases:
            if phrase not in content:
                errors.append(f"{case_id}: missing assertion phrase in {path}: {phrase}")
    return errors


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--fixture", type=Path, default=DEFAULT_FIXTURE)
    fixture = parser.parse_args().fixture.resolve()

    missing = [name for name in REQUIRED_FILES if not (ROOT / name).is_file()]
    if missing:
        raise SystemExit(f"Missing required skill artifacts: {', '.join(missing)}")
    if not fixture.is_file():
        raise SystemExit(f"Fixture not found: {fixture}")

    try:
        cases = load_contract(fixture)
    except (ValueError, json.JSONDecodeError) as error:
        raise SystemExit(f"Invalid fixture contract: {error}") from error

    errors = [error for case in cases for error in validate_case(case)]
    if fixture == DEFAULT_FIXTURE:
        expected_ids = set(EXPECTED_INPUTS)
        actual_ids = {case.get("id") for case in cases}
        if actual_ids != expected_ids or len(cases) != len(expected_ids):
            errors.append("default fixture must define each required contract case exactly once")
    if errors:
        raise SystemExit("Contract validation failed: " + "; ".join(errors))
    print(f"draw-odontogram-teeth contract passed: {len(cases)} case(s)")


if __name__ == "__main__":
    main()
