# SLAIV submission readiness

## Current release: permissionless v3

| Field | Value |
|---|---|
| Frozen contract commit | `f62614693d421c115579d82d082d8319995774aa` (`permissionless-v3`) |
| Contract SHA-256 | `7dbd7de944a7f250d5876a14180fadca2cc6d1e99dd43293952e1a15da4bbf2a` |
| Network / RPC | Studionet / `https://studio.genlayer.com/api` |
| Contract | `0xC8DC9930efA7276280E2E23BC59038420e97F747` |
| Deployment tx | `0xe4b87aa75d3952f054dc319e3929b0f1d3808ef612a733d43bef4fd593d89737` |
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

Two rounds of correctness/liveness gaps were found and fixed across `0xc17bfE775D46080E9A58F1eC80edC2E7A04DF101` and `0x283ae69159d7eE8b2c05981139cF493d8fD730D8` before this release:

1. **Evidence-slot DoS** -- phase- and kind-scoped evidence quotas (reserved `PROTOCOL_FACT` slot, reserved appeal-evidence pool, per-wallet public-evidence cap, canonical-field duplicate detection) so no combination of outsider `PUBLIC_SOURCE` submissions can block protocol-fact recording or a claimant's later appeal.
2. **Evidence never reaching judgment** -- claimant statements are now stored as bounded text in contract state; `PUBLIC_SOURCE` references are independently retrieved by the leader and every validator via `gl.nondet.web` at judgment time (bounded, fail-safe on fetch failure).
3. **Unstable consensus equivalence** -- judgment and appeal review now compare only settlement-critical fields (`_verdict_key`), and `eligible_loss` is computed deterministically in contract code from a fixed `loss_fraction_bps` band.
4. **Unresolvable appeals** -- an `UNRESOLVED` appeal disposition no longer strands the claim; `review_appeal` can be re-triggered until it actually resolves.
5. **Public-source fetch crowding** -- fetch selection is now priority-ordered (appeal evidence, then claimant-submitted evidence, then everyone else's) instead of naive first-N, so an outsider filling the pre-review public-evidence pool can never crowd the claimant's own relevant source out of judgment's retrieval window.
6. **Appeal evidence not canonicalized** -- `record_appeal` now reconstructs its evidence argument from the same explicit field allowlist `append_evidence` uses; injected fields can no longer reach the appeal prompt.
7. **Weak commitment/URL validation** -- `policy_commitment`/`evidence_commitment` must be proper 64-hex sha256 digests (the frontend's own placeholder commitments were fixed too), and `PUBLIC_SOURCE` URLs are validated beyond a bare `https://` prefix.

Also closed: strict state canonicalization (explicit field allowlists on `create_policy`/`submit_claim`/`append_evidence`/`record_appeal`, contract-side bounds on every variable-size field) and network-gated policy creation (a policy can no longer be created for a network SLAIV cannot currently verify).

## Verification

- Direct Mode: **91 passed, 0 failed** (`pytest tests/direct -v`).
- Frontend: **35 passed, 0 failed** (`npm test`).
- Lint, typecheck, and Next.js production build: PASS.
- Source match and preflight: PASS.

## Live proof

A full manual multi-wallet Studionet lifecycle test (legitimate policy/claim/evidence flows, outsider policy/claim impersonation rejection, duplicate policy rejection, per-wallet public-evidence quota enforcement) was run against the previous release address, `0x283ae69159d7eE8b2c05981139cF493d8fD730D8` -- all confirmed live and passing. Full transaction table: `docs/DEPLOYMENT.md`, "Live release proof (`0x283ae69159d7eE8b2c05981139cF493d8fD730D8`, superseded)". The current release address, `0xC8DC9930efA7276280E2E23BC59038420e97F747`, has deployment finality, source match, and full local-gate verification confirmed (see "Deployment verification" in `docs/DEPLOYMENT.md`), but the full live multi-wallet lifecycle has not been re-run against it specifically, since this pass only changed evidence-selection ordering, an added canonicalization step, and stricter validation -- not the core state machine already proven live.

A `verify_protocol_finality` call was also attempted live (on the previous address) but did **not** prove the RPC path: it was submitted via `genlayer write --args`, a known-buggy path that corrupts hex transaction hashes, and reverted at an earlier format check instead of reaching the RPC. This was caught on review and is documented, not hidden -- see `docs/DEPLOYMENT.md`, "Correction: transaction #12 did not prove the RPC path". The RPC path itself was previously verified live (identical contract logic) on a now-superseded deployment; it has not yet been re-verified against the current address using the correct signing path.

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

`0x283ae69159d7eE8b2c05981139cF493d8fD730D8`, `0xc17bfE775D46080E9A58F1eC80edC2E7A04DF101`, `0x265B238DB4d8f08Ed9f8B5609C73F88b9ffC1ECd`, `0xE2c8ECFa29Dd67a1dDe8026Df62628bE765d78A5`, `0x95FCEcA657dCfc87F140B616e79fD9D04700bBA9`, `0x5E90423450c1a571f0434014aA03A3958887E437` -- none must be treated as a release candidate, pointed to by the frontend, or reused. See `docs/DEPLOYMENT.md`, "Superseded releases" for full detail on why each was replaced.

</details>
