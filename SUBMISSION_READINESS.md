# SLAIV historical v2 reviewer dossier

> **Historical record only.** This file documents the previously deployed authority-gated release at `0x7BCD17b76a9c6e3daA9f12a7b7E50Cfc83AF8eA0`. The `permissionless-v3` branch replaces the authority architecture and requires a new deployment, new source hash, new test report, and new live proof before submission metadata is updated. See `README.md` and `REVIEWER_TESTING.md` for the v3 design.

## Historical release identity

| Field | Value |
|---|---|
| Frozen contract commit | `edb48853c3f4de10c0b2bab2d766763bd8487162` |
| Contract SHA-256 | `d00542cc83511cb595c9459fb74874e18b14908568c3b3b13cfa1a01abd8f943` |
| Network / RPC | Studionet / `https://studio.genlayer.com/api` |
| Contract | `0x7BCD17b76a9c6e3daA9f12a7b7E50Cfc83AF8eA0` |
| Deployment tx | `0x771f5ad3ac3111395761c008d7019ebe91e5f59991635343b3b793a3a1058fd4` |
| Deployer | `0x79b3ecbe6a65bee93b2fcda78e6909892671507f` |
| Historical protocol authority | `0xe362cf45d3b3dfb38ef78099daba6e3e7c96c792` |
| CLI | `genlayer@0.39.2` |

## Why GenLayer was necessary

Deterministic contract code validated schemas, authorization, event membership, claim/policy/validator binding, finality gates, bounds, terminal transitions and payout arithmetic. GenLayer consensus was used for semantic incident classification, exclusion interpretation, evidence interpretation and eligible-loss adjudication. Every settlement-critical consensus field was revalidated deterministically.

## Historical trust model

The v2 protocol authority was a narrow trusted protocol-fact attestor/adapter role. It could establish a normalized protocol fact after external verification but could not adjudicate eligibility, select eligible loss, set payout, bypass policy membership or finalize for the claimant. Every fact network had to exactly equal the immutable policy `subject_network`. Claimants could not establish finality.

**v3 removes this authority role.** Protocol-event verification, judgment, appeal judgment and eligible finalization are permissionless triggers; GenLayer consensus verifies source-grounded facts and outcomes.

## Historical verification

- Direct Mode: **67 passed, 0 failed**.
- Frontend: **24 passed, 0 failed**.
- Lint, typecheck and Next.js production build: PASS.
- Source match and preflight: PASS.

These counts apply only to the frozen v2 source above and must not be presented as v3 results.

## Historical live fail-closed proof

Policy `pol_network_release_20260818` was bound to `subject_network=studionet`.

Policy tx: `0xed5eb036574fb555ec3dd559e3b597d70d017c619f669b5f9ede18e025c9d73c`

Claim tx: `0xdc20a1386f8d32b17b044d2ea9d5359f1359331f33e530d55f65736ae24a0af7`

Claimant evidence tx: `0x6ba1ea28bcb64a4c0b20f3516ad81b72dba4b90e13617d4579eddfa239db56e9`

Final reads: `AWAITING_FINALITY`, `PENDING`, review absent, payout `0`. No authentic protocol event was fabricated to force a positive result.

## v3 release gate

Before replacing this historical dossier with a v3 submission record:

```bash
python scripts/audit_contract_candidates.py
pytest tests/direct -v
npm test
npm run lint
npm run typecheck
npm run build
python scripts/source_match.py --address <NEW_V3_ADDRESS> --rpc https://studio.genlayer.com/api
python scripts/preflight.py
```

Then record the new frozen source commit, SHA-256, contract address, deployment transaction and fresh live evidence. The historical v2 identifiers above must remain clearly separated from the new release.
