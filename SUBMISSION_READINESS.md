# SLAIV submission readiness

## Release identity

- Network: Studionet (`https://studio.genlayer.com/api`)
- Contract: `0xAcf34B0F9d40f7060E370577689AF5935a215dD6`
- Deployment transaction: `0xde7e9cfe607c4c2a3b7f19bb3f018c8e45736a32c3377e60676182b16cbe931c`
- Frozen source commit: `28065ee5556d6094942034e32825d67f4b75b2fb`
- Source SHA-256: `9fa11ce60385e2c70449b7e29e9f3e8f10723fb5c5c1f5a5171f58f1b4ba1da3`
- Protocol authority: `0xe362cf45d3b3dfb38ef78099daba6e3e7c96c792`

## Verification

`python scripts/audit_contract_candidates.py` reports one candidate: `contracts/SlaivClaims.py`.
`python scripts/source_match.py --address 0xAcf34B0F9d40f7060E370577689AF5935a215dD6 --rpc https://studio.genlayer.com/api` passes exact canonical source matching. The live read surface returned `policy_count: 0`, `claim_count: 0`; the fresh release intentionally contains no fixture data.

Direct Mode covers 56 production-contract cases, including evidence closure, replay protection, appeal replacements, payout arithmetic, authority rotation, and captured-validator disagreement. Run `python scripts/preflight.py` for the release gate.

## Trust model and limitation

GenLayer is necessary for consensus-backed semantic adjudication. Policy eligibility, evidence schema, lifecycle transitions and payout arithmetic are deterministic contract checks. Claimant evidence is not a protocol fact. The separated protocol authority can submit only bounded, claim-bound `PROTOCOL_FACT` evidence and cannot adjudicate or set payout.

Studionet does not support staking history. Testnet Asimov exposes validator discovery, but GenLayer CLI 0.39.2 validator-history currently fails with `client.getSlashingAddress is not a function`. Therefore no public authentic matching finalized slash event was available. The retained synthetic validator case remains fail-closed at `AWAITING_FINALITY`; no fabricated positive lifecycle was recorded.
