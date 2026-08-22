# SLAIV submission readiness

## Current release: permissionless v3

| Field | Value |
|---|---|
| Frozen contract commit | `041be918249ca64b823e96bd735eac6a57ff2ad5` (`permissionless-v3`) |
| Contract SHA-256 | `6b56342a11a7ec8076838370a7b8951a1f8fff93969d5e54c49bc8e330067364` |
| Network / RPC | Studionet / `https://studio.genlayer.com/api` |
| Contract | `0x283ae69159d7eE8b2c05981139cF493d8fD730D8` |
| Deployment tx | `0x7a32c9f26b7c99c0f94ccd7d7ef7c3581512d88ff8859830bab286b8a671560e` |
| Deployer | `0x79b3ecbe6a65bee93b2fcda78e6909892671507f` (`faultline-dev` CLI wallet) |
| Protocol authority | none -- this is the permissionless release; there is no privileged finality role |
| CLI | `genlayer@0.39.2` |
| Source match | `SOURCE MATCH: PASS` |
| Preflight | `PREFLIGHT: PASS` |

Full deployment history, live-transaction table, and the audit trail of prior superseded deployments: `docs/DEPLOYMENT.md`.

## What GenLayer does here

Deterministic contract code validates schemas, authorization, event membership, claim/policy/validator binding, finality gates, bounds, terminal transitions, and payout arithmetic. GenLayer consensus is used for semantic incident classification, exclusion interpretation, evidence interpretation, and eligibility/loss-band adjudication. Every settlement-critical consensus field is revalidated deterministically in contract code before any state change -- including the payout amount, which is computed from a validator-chosen `loss_fraction_bps` (constrained to a fixed band) rather than trusted as a free-form LLM-supplied number.

## Permissionless trust model

There is no protocol-authority role in this release. Any wallet may trigger protocol-finality verification, GenLayer judgment, appeal review, and eligible finalization -- triggering an action never determines its outcome. Identity-bound rights (creating one's own policy, filing one's own claim, claimant assertions, choosing to appeal) remain owner-only. See `docs/SECURITY.md` for the full security boundary and `docs/PROTOCOL_ADAPTER.md` for the finality-verification design.

## What changed in this finishing pass

Four correctness/liveness gaps found in the prior candidate deployment (`0xc17bfE775D46080E9A58F1eC80edC2E7A04DF101`) were fixed and redeployed:

1. **Evidence-slot DoS** -- phase- and kind-scoped evidence quotas (reserved `PROTOCOL_FACT` slot, reserved appeal-evidence pool, per-wallet public-evidence cap, canonical-field duplicate detection) so no combination of outsider `PUBLIC_SOURCE` submissions can block protocol-fact recording or a claimant's later appeal.
2. **Evidence never reaching judgment** -- claimant statements are now stored as bounded text in contract state; `PUBLIC_SOURCE` references are independently retrieved by the leader and every validator via `gl.nondet.web` at judgment time (bounded, fail-safe on fetch failure).
3. **Unstable consensus equivalence** -- judgment and appeal review now compare only settlement-critical fields (`_verdict_key`), and `eligible_loss` is computed deterministically in contract code from a fixed `loss_fraction_bps` band.
4. **Unresolvable appeals** -- an `UNRESOLVED` appeal disposition no longer strands the claim; `review_appeal` can be re-triggered until it actually resolves.

Also closed: strict state canonicalization (explicit field allowlists on `create_policy`/`submit_claim`/`append_evidence`, contract-side bounds on every variable-size field) and network-gated policy creation (a policy can no longer be created for a network SLAIV cannot currently verify).

## Verification

- Direct Mode: **63 passed, 0 failed** (`pytest tests/direct -v`).
- Frontend: **35 passed, 0 failed** (`npm test`).
- Lint, typecheck, and Next.js production build: PASS.
- Source match and preflight: PASS.

## Live proof

Manual multi-wallet Studionet lifecycle test against the current release address, covering legitimate policy/claim/evidence flows, outsider policy/claim impersonation rejection, duplicate policy rejection, and per-wallet public-evidence quota enforcement -- all confirmed live and passing. Full transaction table: `docs/DEPLOYMENT.md`, "Live release proof (v3, permissionless -- current release)".

A `verify_protocol_finality` call was also attempted live but did **not** prove the RPC path: it was submitted via `genlayer write --args`, a known-buggy path that corrupts hex transaction hashes, and reverted at an earlier format check instead of reaching the RPC. This was caught on review and is documented, not hidden -- see `docs/DEPLOYMENT.md`, "Correction: transaction #12 did not prove the RPC path". The RPC path itself was previously verified live (identical contract logic) on a now-superseded deployment; it has not yet been re-verified against the current address using the correct signing path.

No genuine Studionet `leader_timeout_validators` incident was available at test time, so the positive settlement path (`UNDER_REVIEW` -> judgment -> appeal -> finalize) is proven only by Direct Mode's synthetic fixtures, not by a live on-chain run. This is stated plainly rather than fabricated.

## Product scope

SLAIV is a GenLayer-native slashing-coverage adjudication and deterministic payout-instruction protocol. It does not operate a treasury, collateral pool, or premium system, and stored payout amounts are not automatically transferred GEN unless a funded settlement layer is added in a future release.

---

## Historical releases (superseded)

<details>
<summary>v2, authority-gated (superseded by permissionless v3)</summary>

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

The v2 protocol authority was a narrow trusted protocol-fact attestor/adapter role. It could establish a normalized protocol fact after external verification but could not adjudicate eligibility, select eligible loss, set payout, bypass policy membership, or finalize for the claimant. Every fact network had to exactly equal the immutable policy `subject_network`. Claimants could not establish finality. v3 removes this authority role entirely.

Verification at the time: Direct Mode 67 passed, 0 failed; Frontend 24 passed, 0 failed; lint/typecheck/build PASS; source match and preflight PASS. These counts apply only to the frozen v2 source and must not be presented as v3 results.

Live fail-closed proof: policy `pol_network_release_20260818` (tx `0xed5eb036574fb555ec3dd559e3b597d70d017c619f669b5f9ede18e025c9d73c`), claim tx `0xdc20a1386f8d32b17b044d2ea9d5359f1359331f33e530d55f65736ae24a0af7`, claimant evidence tx `0x6ba1ea28bcb64a4c0b20f3516ad81b72dba4b90e13617d4579eddfa239db56e9`. Final reads: `AWAITING_FINALITY`, `PENDING`, review absent, payout `0`. No authentic protocol event was fabricated to force a positive result.

</details>

<details>
<summary>v3 pre-finishing-pass candidates (superseded, full list in docs/DEPLOYMENT.md)</summary>

`0xc17bfE775D46080E9A58F1eC80edC2E7A04DF101`, `0x265B238DB4d8f08Ed9f8B5609C73F88b9ffC1ECd`, `0xE2c8ECFa29Dd67a1dDe8026Df62628bE765d78A5`, `0x95FCEcA657dCfc87F140B616e79fD9D04700bBA9`, `0x5E90423450c1a571f0434014aA03A3958887E437` -- none must be treated as a release candidate, pointed to by the frontend, or reused. See `docs/DEPLOYMENT.md`, "Superseded releases" for full detail on why each was replaced.

</details>
