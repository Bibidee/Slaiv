# SLAIV final reviewer dossier

## Release identity

| Field | Value |
|---|---|
| Frozen contract commit | `4e53e9ba210db7b0bd90635cd6ae037d9e574da5` |
| Contract SHA-256 | `afde26ecf341664241c76d9d6ade399beb6365b4c17a70b6a1f37ae111032e96` |
| Network / RPC | Studionet / `https://studio.genlayer.com/api` |
| Contract | `0x8B1Db5604D2dDDa6741fB9C7168EC7fA468FD440` |
| Deployment tx | `0xa9faac339e157bf428633d807906a033d830f2e17a4050c52f6b1b1832ef477a` |
| Deployer | `0x79b3ecbe6a65bee93b2fcda78e6909892671507f` |
| Protocol authority | `0xe362cf45d3b3dfb38ef78099daba6e3e7c96c792` |
| CLI | `genlayer@0.39.2` |

## Why GenLayer is necessary

Deterministic contract code validates schemas, authorization, event membership, claim/policy/validator binding, finality gates, bounds, terminal transitions and payout arithmetic. GenLayer consensus is used only for semantic incident classification, exclusion interpretation, evidence interpretation and eligible-loss adjudication. Every settlement-critical consensus field is revalidated deterministically.

## Trust model

The protocol authority is a narrow trusted protocol-fact attestor/adapter role. It can establish a normalized protocol fact after external verification; it cannot adjudicate eligibility, select eligible loss, set payout, bypass policy membership or finalize for the claimant. Claimants cannot establish finality. The browser cannot construct or submit `PROTOCOL_FACT` evidence.

## Verification

- Direct Mode: **60 passed, 0 failed**, including uncovered-event denial, uncovered-event approval rejection, appeal invariant preservation, evidence and protocol-event replay, malformed verdicts, validator disagreement, payout arithmetic and double finalization.
- Frontend: **22 passed, 0 failed**. Regression coverage includes policy lookup through `claim.policy_id`, browser protocol-fact prohibition, exact action gating, stored evidence ledger and absence of live fixture imports.
- Lint, typecheck and Next.js production build: PASS.
- Contract candidates: `1`, `contracts/SlaivClaims.py`, PASS.
- Source match: local `afde26...32e96`; network `afde26...32e96`; PASS.
- Full `scripts/preflight.py`: PASS.

## Live fail-closed proof

Policy tx: `0xa7c647fab5de0a66dc711cfead1b6bf38ed443626c8aebc6f1172d8afb7b3ca8`

Claim tx: `0x5d15341383f62380baff4535c01406f5d362608d0c25849ba5a306b3c759e5f5`

Claimant evidence tx: `0xa67ac9ab1e62eba7e7665009893e4e6aec5853b60467679ba7be43e80ff2793b`

Final reads: `AWAITING_FINALITY`, `PENDING`, review absent, payout `0`. The synthetic validator has no authentic slash record; therefore no protocol fact exists and review remains unavailable.

## Positive lifecycle limitation

`npx --yes genlayer@0.39.2 staking validator-history 0x1A7633691127bbB7237F3Fb62FDB0914B6dC0452 --network testnet-asimov --epochs 10 --limit 50` failed with `client.getSlashingAddress is not a function`. This is an external current-tooling limitation. The security consequence is fail-closed behavior, not fabricated evidence.

## Reproduction

```bash
python scripts/audit_contract_candidates.py
pytest tests/direct -v
npm test
npm run lint
npm run typecheck
npm run build
python scripts/source_match.py --address 0x8B1Db5604D2dDDa6741fB9C7168EC7fA468FD440 --rpc https://studio.genlayer.com/api
python scripts/preflight.py
```
