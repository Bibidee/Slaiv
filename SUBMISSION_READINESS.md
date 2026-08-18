# SLAIV final reviewer dossier

## Release identity

| Field | Value |
|---|---|
| Frozen contract commit | `edb48853c3f4de10c0b2bab2d766763bd8487162` |
| Contract SHA-256 | `d00542cc83511cb595c9459fb74874e18b14908568c3b3b13cfa1a01abd8f943` |
| Network / RPC | Studionet / `https://studio.genlayer.com/api` |
| Contract | `0x7BCD17b76a9c6e3daA9f12a7b7E50Cfc83AF8eA0` |
| Deployment tx | `0x771f5ad3ac3111395761c008d7019ebe91e5f59991635343b3b793a3a1058fd4` |
| Deployer | `0x79b3ecbe6a65bee93b2fcda78e6909892671507f` |
| Protocol authority | `0xe362cf45d3b3dfb38ef78099daba6e3e7c96c792` |
| CLI | `genlayer@0.39.2` |

## Why GenLayer is necessary

Deterministic contract code validates schemas, authorization, event membership, claim/policy/validator binding, finality gates, bounds, terminal transitions and payout arithmetic. GenLayer consensus is used only for semantic incident classification, exclusion interpretation, evidence interpretation and eligible-loss adjudication. Every settlement-critical consensus field is revalidated deterministically.

## Trust model

The protocol authority is a narrow trusted protocol-fact attestor/adapter role. It can establish a normalized protocol fact after external verification; it cannot adjudicate eligibility, select eligible loss, set payout, bypass policy membership or finalize for the claimant. Every fact network must exactly equal the immutable policy `subject_network`. Claimants cannot establish finality. The browser cannot construct or submit `PROTOCOL_FACT` evidence.

## Verification

- Direct Mode: **67 passed, 0 failed**, including cross-network rejection, fail-closed network mismatch, uncovered-event denial, appeal invariant preservation, evidence and protocol-event replay, malformed verdicts, validator disagreement, payout arithmetic and double finalization.
- Frontend: **24 passed, 0 failed**. Regression coverage includes subject-network binding/display, adapter network validation, policy lookup through `claim.policy_id`, browser protocol-fact prohibition, exact action gating, stored evidence ledger and absence of live fixture imports.
- Lint, typecheck and Next.js production build: PASS.
- Contract candidates: `1`, `contracts/SlaivClaims.py`, PASS.
- Source match: local `d00542...8f943`; network `d00542...8f943`; PASS.
- Full `scripts/preflight.py`: PASS.

## Live fail-closed proof

Policy `pol_network_release_20260818` is explicitly bound to `subject_network=studionet`.

Policy tx: `0xed5eb036574fb555ec3dd559e3b597d70d017c619f669b5f9ede18e025c9d73c`

Claim tx: `0xdc20a1386f8d32b17b044d2ea9d5359f1359331f33e530d55f65736ae24a0af7`

Claimant evidence tx: `0x6ba1ea28bcb64a4c0b20f3516ad81b72dba4b90e13617d4579eddfa239db56e9`

Final reads: `AWAITING_FINALITY`, `PENDING`, review absent, payout `0`. The synthetic validator has no authentic slash record; therefore no protocol fact exists and review remains unavailable.

## Positive lifecycle limitation

`npx --yes genlayer@0.39.2 staking validator-history 0x1A7633691127bbB7237F3Fb62FDB0914B6dC0452 --network testnet-asimov --epochs 10 --limit 50` failed with `client.getSlashingAddress is not a function`. This was only an investigation of current staking-history availability: Asimov was never the SLAIV deployment network and its events cannot satisfy a Studionet-bound policy. The security consequence is fail-closed behavior, not fabricated evidence.

## Reproduction

```bash
python scripts/audit_contract_candidates.py
pytest tests/direct -v
npm test
npm run lint
npm run typecheck
npm run build
python scripts/source_match.py --address 0x7BCD17b76a9c6e3daA9f12a7b7E50Cfc83AF8eA0 --rpc https://studio.genlayer.com/api
python scripts/preflight.py
```
