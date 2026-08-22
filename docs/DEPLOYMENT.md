# Current release

- Network: Studionet (`https://studio.genlayer.com/api`)
- Contract: `0x283ae69159d7eE8b2c05981139cF493d8fD730D8`
- Deployment tx: `0x7a32c9f26b7c99c0f94ccd7d7ef7c3581512d88ff8859830bab286b8a671560e`
- Deployment timestamp: 2026-08-22 (Studionet-confirmed `FINALIZED`)
- Frozen source commit: `041be918249ca64b823e96bd735eac6a57ff2ad5` (`permissionless-v3`)
- Canonical source SHA-256: `6b56342a11a7ec8076838370a7b8951a1f8fff93969d5e54c49bc8e330067364`
- Deployer: `0x79b3ecbe6a65bee93b2fcda78e6909892671507f` (`faultline-dev` CLI wallet)
- Protocol authority: none. This is the permissionless v3 release; there is no privileged finality role.
- CLI: `genlayer@0.39.2`
- Supported incident types: `MISSED_EXECUTION_WINDOW` only. `MISSED_APPEAL_WINDOW` is not supported -- see "Why the prior deployments were superseded" below.
- Evidence model: phase-scoped, kind-aware quotas (claimant/public/appeal/protocol-fact each have their own reserved pool; no combination of outsider `PUBLIC_SOURCE` submissions can block the `PROTOCOL_FACT` slot or later appeal evidence), canonical-field duplicate detection, real `gl.nondet.web` retrieval of `PUBLIC_SOURCE` references at judgment time, bounded claimant statement text stored in contract state.
- Consensus model: settlement-critical-field equivalence (`_verdict_key`) for both first judgment and appeal review; deterministic `eligible_loss = documented_loss * loss_fraction_bps // 10000` computed in contract code from a fixed `loss_fraction_bps` band, never an LLM-supplied loss amount; `UNRESOLVED` appeal dispositions no longer strand the claim.
- Tests: 63 Direct Mode passed; 35 frontend tests passed; lint/typecheck/build all pass
- Source match: `SOURCE MATCH: PASS`
- Preflight: `PREFLIGHT: PASS`
- Explorer: https://explorer-studio.genlayer.com/address/0x283ae69159d7eE8b2c05981139cF493d8fD730D8

## Why the evidence/consensus model changed in this release

This release corrects four gaps found in the prior `0xc17bfE775D46080E9A58F1eC80edC2E7A04DF101` deployment:

1. **Evidence-slot DoS.** The prior release used a single shared cap (and, before that, a flat 12-item cap) across all evidence kinds and phases. An outsider could fill every `PUBLIC_SOURCE` slot before a claimant's `PROTOCOL_FACT` was recorded or before an appeal, permanently blocking either. Evidence quotas are now phase-scoped: appeal evidence draws from its own reserved pool that pre-review spam can never touch, `PROTOCOL_FACT` has an unconditional reserved slot, and a per-wallet public-evidence cap (`3`, under a strict total of `8`) limits a single attacker's share. Live-tested below (`evd_public_outsider_4` rejected by the per-wallet quota while the claim remained fully advanceable).
2. **Evidence discarded before judgment.** The frontend previously hashed claimant/public evidence content and discarded it, so GenLayer judgment never actually saw what a claimant said or what a public source claimed. `CLAIMANT_ASSERTION` now stores real bounded text in contract state, and `PUBLIC_SOURCE` references are independently retrieved by the leader and every validator via `gl.nondet.web` at judgment time (bounded source count and response size; a fetch failure is recorded as unavailable, never silently trusted).
3. **Free-form consensus equivalence.** Judgment and appeal review previously required near-byte-identical LLM output to reach consensus, including a free-form `eligible_loss` integer. Both now compare only a small set of settlement-critical fields (`_verdict_key`), and `eligible_loss` is computed deterministically in contract code from a `loss_fraction_bps` value constrained to a fixed band.
4. **Unresolvable appeals.** An `UNRESOLVED` appeal disposition previously froze `appeal_resolved` at a state that made the claim unfinalizable and unreviewable. It now leaves `appeal_resolved=false` and the claim in `APPEALED`, so `review_appeal` can be triggered again until it actually resolves.

Direct Mode coverage for all four: `tests/direct/test_security_matrix.py::test_public_evidence_spam_cannot_block_protocol_fact`, `::test_public_evidence_spam_cannot_block_appeal_evidence`, `::test_public_evidence_per_wallet_quota`, `::test_duplicate_public_evidence_detected_by_canonical_fields_not_just_id`, `::test_retrieved_public_evidence_reaches_semantic_judgment`, `::test_public_source_fetch_failure_fails_safe`, `::test_unresolved_appeal_can_be_reviewed_again`, `::test_arbitrary_policy_and_claim_json_cannot_survive_canonicalization`, `::test_time_handling_is_deterministic_across_validators`.

## Live release proof (v3, permissionless -- current release)

Manual multi-wallet lifecycle test performed against `0x283ae69159d7eE8b2c05981139cF493d8fD730D8`, using two independent CLI-managed wallets (`faultline-dev` as policy holder/claimant, `recallshield-studio-test` as an unrelated outsider wallet). Every step's state effect was independently confirmed by re-reading contract state after each transaction, not just the explorer's ERROR/SUCCESS badge.

**Reading this table:** several of these transactions are deliberate attack/misuse attempts (impersonation, duplication, per-wallet-quota abuse) that are *designed* to be rejected -- `ERROR`/no-state-change there means the security model worked, not that something broke.

| # | Tx hash | Method | Sender | What it tested | Result | Match? |
|---|---|---|---|---|---|---|
| 1 | `0x7a32c9f26b7c99c0f94ccd7d7ef7c3581512d88ff8859830bab286b8a671560e` | (constructor) | faultline-dev | Deployment | `FINALIZED` | ✅ |
| 2 | not captured (CLI output was truncated locally; `result_name: MAJORITY_AGREE` was observed and `get_policy` below confirms the write landed) | create_policy | faultline-dev | Legitimate policy creation (`pol_release_v3_final`) | Stored, `active:true`, `policy_commitment:"release-v3-final-commitment"` | ✅ |
| 3 | `0xcb731b8a97f8f03d6e1219212a1b6d05cecdd50a68d1a63a032bc87a8cb15c39` | create_policy | faultline-dev | Duplicate `policy_id` resubmission | Consensus-accepted call, but state unchanged (`policy_commitment` still the first submission's) | ✅ `duplicate policy` rejected |
| 4 | `0xb69af4fe7a4f6f55ab3cba9547689c224c629730c14ef046a5fe89f82297b05c` | create_policy | recallshield-studio-test | Outsider impersonates faultline-dev as policy `holder` | Consensus-accepted call, `get_policy` returns empty -- never stored | ✅ `holder mismatch` rejected |
| 5 | `0x4300099a8536d58c082502b8befad63b7ccd1402839a19dc274a3a11b76ee730` | submit_claim | recallshield-studio-test | Outsider impersonates faultline-dev as claim `claimant` | Consensus-accepted call, `get_claim` returns empty -- never stored | ✅ `unauthorized claimant` rejected |
| 6 | `0xb1ee6513d041fc597a67d6d250bb3f56d981a727bfdc5d14b09f8cce11c39f86` | submit_claim | faultline-dev | Legitimate claim filing (`clm_release_v3_final`) | Stored, `state:AWAITING_FINALITY` | ✅ |
| 7 | `0xbc147a2801c2f12786e032d79fb06e7c72fb327e4e6ab35e4ebb02d9f5c4a80f` | append_evidence | faultline-dev (claimant) | `CLAIMANT_ASSERTION` with real bounded statement text | Stored with `content` field populated in state | ✅ |
| 8 | `0x1f5f709cb7bd158639b04e605a257db6359b0a48acb3a0c712505dd139486a10` | append_evidence | recallshield-studio-test (outsider) | `PUBLIC_SOURCE` evidence by a non-claimant wallet | Stored | ✅ |
| 9–10 | `0x49b4ad1ebede1011c81e99ae231d10fff8645e9247bac2f167fc294b8732e6fd`, `0x97889ffbb722510ebde5d92e734bc3a64fcb91e465ba52aae53bdd9f0f5dedc0` | append_evidence | recallshield-studio-test | Two more `PUBLIC_SOURCE` items from the same wallet (now 3 total) | Stored | ✅ |
| 11 | `0xdf422dfd4c67a2b07a042b62815c77ef112a746ae88f07d2628ac4db158a8d5b` | append_evidence | recallshield-studio-test | 4th `PUBLIC_SOURCE` from the same wallet, exceeding `MAX_PUBLIC_EVIDENCE_PER_WALLET=3` | Consensus-accepted call, `get_evidence_quotas` confirms `public_used` stayed at `3` -- never stored | ✅ per-wallet quota enforced |
| 12 | `0x5343dcd9b5a742e1f26d51f0f6cf1bf706e1ffdf7e6037ee2507ff57eb73f81a` | verify_protocol_finality | faultline-dev | Candidate = this deployment's own deploy tx, submitted via `genlayer write --args` | Reverted at `_event_id()` with `"invalid protocol candidate"` -- see correction note below | ⚠️ not the RPC-path proof it was first reported as; see below |

Final `get_evidence_quotas("clm_release_v3_final")`: `{"claimant_used": 1, "claimant_max": 3, "public_used": 3, "public_max": 8, "public_per_wallet_max": 3, "appeal_used": 0, "appeal_max": 2, "protocol_fact_recorded": false}` -- matches transactions 1-11 above exactly.

No genuine Studionet `leader_timeout_validators` incident was available at test time, so the positive settlement path (`UNDER_REVIEW` -> judgment -> appeal -> finalize) was not exercised end-to-end on this live contract; per the release policy, no incident was fabricated to force it. That path is covered by Direct Mode's synthetic fixtures (63/63 passing, including the new evidence-DoS, canonicalization, consensus-equivalence, unresolved-appeal, and time-determinism tests listed above).

### Correction: transaction #12 did not prove the RPC path (found immediately after first reporting it)

Transaction #12 above was first reported in this document as proof that `verify_protocol_finality`'s live RPC path reaches the official RPC and fails closed on a genuine non-incident transaction. That was wrong, caught on review of the raw GenVM traceback rather than the explorer's ERROR/Accepted badges. The traceback showed the revert came from the contract's very first check:

```
File "/contract.py", line 286, in verify_protocol_finality
    if not self._event_id(event_id): raise Exception("invalid protocol candidate")
Exception: invalid protocol candidate
```

That is `_event_id()`'s hex-format check, not `_valid_protocol_result()` -- meaning the call never reached `gl.nondet.web.post()` at all. Root cause: transaction #12 was submitted with `genlayer write --args`, whose positional-argument parser is the exact same known bug already documented in this file's "Correction record: prior verify_protocol_finality claim (superseded deployment)" section below -- it silently coerces a bare `0x`-prefixed 32-byte hex string into a `BigInt` before the contract ever sees it. `scripts/verify-protocol-finality.mjs` exists specifically to avoid this by calling `genlayer-js`'s `writeContract` directly, but transaction #12 did not use it.

**As of this writing, the live RPC path has not yet been re-verified on `0x283ae69159d7eE8b2c05981139cF493d8fD730D8`.** It was previously verified on a now-superseded deployment (`0x265B238DB4d8f08Ed9f8B5609C73F88b9ffC1ECd`, see "verify_protocol_finality live RPC path: verified" below) using the correct script and the user's own signing key. The same script (`npm run verify:finality -- --claim-id clm_release_v3_final --event-id 0x7a32c9f26b7c99c0f94ccd7d7ef7c3581512d88ff8859830bab286b8a671560e`, with `SLAIV_SIGNER_PRIVATE_KEY` set to a funded Studionet key, run by the user in their own terminal) is the correct way to re-verify it against this deployment. Until that is run, the fail-closed RPC path on this specific address is proven only by Direct Mode's synthetic fixtures and the identical contract logic already verified live on the prior deployment -- not by a fresh live call.

## Why the prior deployments were superseded

`0x5E90423450c1a571f0434014aA03A3958887E437` (deployed 2026-08-20) supported a second incident type, `MISSED_APPEAL_WINDOW`, classified whenever the official RPC's `appeal_leader_timeout` or `appeal_validators_timeout` flags were `true`. A live-transaction audit on 2026-08-21 found this was a genuine settlement-logic bug, not a caller/tooling issue: those flags are exposed only as transaction-wide booleans, with no field binding either one to a specific validator address, unlike `leader_timeout_validators` (which explicitly enumerates the timed-out validator and remains genuinely validator-bound). GenLayer's own consensus/fee-distribution model (`genlayerlabs/genlayer-fee-distribution-simulator`) confirms leader-timeouts, including during appeal rounds, are attributed to one specific round's leader address at the protocol level -- but that attribution never reaches the public `eth_getTransactionByHash` response SLAIV queries. Concretely: a genuine appeal timeout on validator X could have satisfied a claim against a SLAIV policy insuring an unrelated validator Y, as long as both happened to sit on the same GenLayer transaction.

`MISSED_APPEAL_WINDOW` has been removed from `EVENTS` entirely (see `contracts/SlaivClaims.py`, `docs/PROTOCOL_ADAPTER.md`) rather than shipping an unverifiable validator binding.

`0x95FCEcA657dCfc87F140B616e79fD9D04700bBA9` (deployed 2026-08-21) was the first corrected deployment carrying that fix, deployed from the `faultline-dev` CLI wallet, source-matched cleanly, and fully live-tested.

`0xE2c8ECFa29Dd67a1dDe8026Df62628bE765d78A5` (deployed 2026-08-21) was a second deployment of the identical corrected source, submitted independently from a different wallet (`0xc81d1717a158a76559a6890660d80213678efe57`, not one of this repo's CLI accounts). Investigation traced the RPC method `genlayer code` uses (`gen_getContractCode`) directly to `genlayer-js`, confirming it returns the exact bytes GenLayer stored for that address -- so the module docstring genuinely was not part of what got deployed there (some difference in how that deployment was submitted, not a retrieval artifact as first suspected). A manual line-by-line diff confirmed the rest of the file, including `EVENTS` and the `MISSED_APPEAL_WINDOW`-removal comment, was byte-identical, and a full live multi-wallet lifecycle test on that address passed with no unexpected errors -- but `source_match.py`/`preflight.py` correctly reported `FAIL` against it, since the deployed bytecode is not byte-identical to `contracts/SlaivClaims.py`. Rather than accept that gap, the contract was redeployed via the same clean path already proven for `0x95FCEcA657dCfc87F140B616e79fD9D04700bBA9`, producing `0x265B238DB4d8f08Ed9f8B5609C73F88b9ffC1ECd`.

`0x265B238DB4d8f08Ed9f8B5609C73F88b9ffC1ECd` (deployed 2026-08-21) was the clean redeploy above and, for the first time, had `verify_protocol_finality`'s RPC-fetch path live-verified against it (see "Live release proof" below). That test surfaced a genuine consensus-efficiency bug: the call took 4 rounds and finalized `MAJORITY_DISAGREE` even though every node independently computed the identical, correct, fail-closed result. Root cause and fix are documented under "Consensus validator() agreement fix" below. The contract was redeployed a third time carrying that fix, producing `0xc17bfE775D46080E9A58F1eC80edC2E7A04DF101`.

`0xc17bfE775D46080E9A58F1eC80edC2E7A04DF101` (deployed 2026-08-21) carried the consensus fix and was the release candidate for a full finishing pass: a phase-scoped evidence-quota redesign (fixing an evidence-slot DoS where outsider `PUBLIC_SOURCE` spam could block the `PROTOCOL_FACT` slot or appeal evidence), real `gl.nondet.web` public-source retrieval at judgment time, a deterministic `loss_fraction_bps` payout model replacing free-form LLM-supplied loss amounts, settlement-critical-field consensus equivalence for both judgment and appeal review, an unresolved-appeal fix so the claim is never stranded, explicit-allowlist state canonicalization, and network-gated policy creation. See "Why the evidence/consensus model changed in this release" above. The corrected source was redeployed, producing the current release, `0x283ae69159d7eE8b2c05981139cF493d8fD730D8`.

All five prior addresses (`0x5E90423450c1a571f0434014aA03A3958887E437`, `0x95FCEcA657dCfc87F140B616e79fD9D04700bBA9`, `0xE2c8ECFa29Dd67a1dDe8026Df62628bE765d78A5`, `0x265B238DB4d8f08Ed9f8B5609C73F88b9ffC1ECd`, `0xc17bfE775D46080E9A58F1eC80edC2E7A04DF101`) are retained below purely as historical/audit evidence -- none must be treated as a release candidate, pointed to by the frontend, or reused.

## Live release proof (v3, permissionless -- current release)

Manual multi-wallet lifecycle test performed against `0xc17bfE775D46080E9A58F1eC80edC2E7A04DF101` (the current release address), using two independent CLI-managed wallets (`faultline-dev` as policy holder/claimant, `recallshield-studio-test` as an unrelated outsider wallet). Every step below was independently confirmed via each transaction's decoded exception text (not just its ERROR/SUCCESS badge) and by re-reading contract state after each step.

**Reading this table:** the explorer shows a bare `ERROR`/`SUCCESS` badge with no context. 3 of these 6 transactions are deliberate attack/misuse attempts (impersonation, duplication, coverage-bypass) that are *designed* to be rejected -- `ERROR` there means the security model worked, not that something broke.

| # | Tx hash | Method | Explorer result | What it tested | Expected | Match? |
|---|---|---|---|---|---|---|
| 1 | `0x5ecab1576a818abdf7ce3018429deeb2bec1fefbbb8258e63a278f499d6a2028` | (constructor) | SUCCESS | Deployment | SUCCESS | ✅ |
| 2 | `0x75bc2723b1233e811565f46c3fea1d1e0f478c277626f4be3091814b5dc9ec5d` | create_policy | SUCCESS | Wallet A creates its own policy (`pol_v3e_lifecycle_20260821`) | SUCCESS | ✅ |
| 3 | `0x8c29551da05f38df5ba7ab0cefe53a70a166f384a666ea822518b2ac07931fe9` | submit_claim | SUCCESS | Wallet A files a claim on its own policy (`clm_v3e_lifecycle_20260821`) | SUCCESS | ✅ |
| 4 | `0x1a57391aad7cc4e5ef6c6fb57e8668f1dd802518f8334ac0bb6d9f3fba5c1c74` | create_policy | ERROR | Outsider impersonates Wallet A as policy `holder` | ERROR (`holder mismatch`) | ✅ |
| 5 | `0xf6e254a13a4087dfe927925642603a4f36c692fc075bdc4d2688621d0b9b5d5e` | create_policy | ERROR | Re-submitting the same `policy_id` twice | ERROR (`duplicate policy`) | ✅ |
| 6 | `0x3311880a44b1541416f1e080ac99364bf1fbb1a201842dba503c6ff2dd063990` | create_policy | ERROR | Policy advertising the removed `MISSED_APPEAL_WINDOW` event | ERROR (`invalid covered events`) | ✅ -- confirms the settlement-bug fix is enforced live on this specific redeploy |

3 SUCCESS + 3 ERROR = 6, and every one produced the outcome it was supposed to. `get_protocol_stats` after the run: `{"policy_count": 1, "claim_count": 1, "permissionless": true}` -- only the one legitimate policy and claim exist. This deliberately smaller batch skips the unauthorized-evidence, permissionless-evidence, and state-guard checks already proven on the identical or near-identical source at `0x95FCEcA657...`, `0xE2c8ECFa29Dd...`, and `0x265B238DB4d8...`, and focuses on what's unique to this redeploy: that it behaves identically and carries the consensus fix.

### CLI numeric-string encoding (found during the 0xE2c8EC... lifecycle test)

While testing `0xE2c8ECFa29Dd67a1dDe8026Df62628bE765d78A5`, a `content_hash` value made entirely of one repeated digit (`"3333...3"`, 64 digits) was silently coerced by `genlayer write --args` into a plain integer -- the on-chain calldata showed `content_hash:3333...3` with no quotes, not a string. This is the same root cause documented below for `0x`-prefixed 32-byte hashes (`genlayer@0.39.2`'s `parseScalar` in `src/commands/contracts/index.ts`), but reached through its `Number(value)`/`BigInt(value)` fallback path rather than `HEX_RE`: **any** bare CLI argument that parses fully as a decimal number -- not just `0x`-prefixed hex -- gets coerced, regardless of prefix. Test values built from repeated digits (`"1"*N`, `"2"*N`, `"3"*N`, ...) are unsafe for this CLI; values containing at least one non-digit hex letter (`a`-`f`) are unaffected. This did not affect the frontend (unaffected for the same reason as the hash-string bug).

### verify_protocol_finality live RPC path: verified (2026-08-21, on `0x265B238DB4d8f08Ed9f8B5609C73F88b9ffC1ECd`)

The RPC-fetch path (past `_event_id()`, through `gl.nondet.web.post()`) was signed and submitted using the corrected `scripts/verify-protocol-finality.mjs` (native `genlayer-js` path, not the buggy CLI `write --args`), run by the user in their own terminal with their own key -- never shared with or handled by this assistant. Candidate: `clm_v3d_lifecycle_20260821` against event `0x26267d45384a2879226f55951c8b8c43ebe9b5876f59799f72cadea1eecaf833` (this deployment lineage's own first deploy tx -- a real, finalized, non-incident transaction). Result tx: `0x01489d51804afd5e853980c67875ec9bcc6a393959b048c5a2bf8296f816f38f`.

Confirmed from the receipt's `eq_outputs`:
- `event_id` matched exactly, `event_final: true`, `verified: true` -- the RPC was genuinely queried and the transaction was recognized;
- `incident_class: ""` -- correctly not a timeout event, so not in `EVENTS`;
- every node (leader and all validators, across all rounds) independently derived this identical result and raised `Exception: protocol finality not verified`;
- claim state confirmed unchanged afterward: `state=AWAITING_FINALITY`, `underlying_finality=PENDING`.

This is proof the RPC path is reached and fails closed correctly. It also surfaced the consensus-efficiency bug documented next.

### Consensus validator() agreement fix

The transaction above took 4 consensus rounds and finalized `MAJORITY_DISAGREE`, despite every node computing the byte-identical result. Cause: the `validator()` closures in `verify_protocol_finality`, `review_slashing_claim`, and `review_appeal` required agreement AND validity (`_valid_protocol_result(lead,...) and _valid_protocol_result(own,...) and equality`), when validity is already, separately, and correctly re-checked once by the caller after `run_nondet_unsafe` returns. Tying agreement to validity meant any unanimous-but-rejected outcome -- the common case, since most finality candidates are not genuine incidents -- could never reach single-round consensus. Fixed in all three closures to agree purely on "leader and validator independently computed the same value," letting the pre-existing outer validity checks be the sole gate on state mutation (unchanged, still fully enforced). Added `test_protocol_validator_agrees_on_matching_fail_closed_non_incident` to Direct Mode proving the fix. Carried in the current release (`0xc17bfE775D46080E9A58F1eC80edC2E7A04DF101`); not yet re-verified with a second live signed call, since that requires the user's key again and the Direct Mode test plus the identical-logic reasoning is considered sufficient for now.

No genuine validator-timeout incident is available, so the positive settlement path (`UNDER_REVIEW` -> judgment -> appeal -> finalize) has not been exercised end-to-end on-chain. This remains proven only by Direct Mode's synthetic fixtures (54/54 passing).

## Correction record: prior verify_protocol_finality claim (superseded deployment)

The superseded deployment's live-proof note previously claimed an outsider-triggered `verify_protocol_finality` call against a real, finalized, non-incident transaction (this deployment's own deploy tx) proved fail-closed rejection. It did not. A 2026-08-21 audit found the explorer's decoded calldata showed `event_id` arriving as the decimal integer `17255893019083365422223124959272975130536380754561951960972769562471330150451` -- exactly `int(tx_hash_hex, 16)` -- not the hash string. Execution reverted at the contract's very first check, `_event_id()` ("invalid protocol candidate"), before ever reaching `gl.nondet.web.post()`. Root cause: a caller-side bug in `genlayer@0.39.2`'s `write --args` positional parser (confirmed present in the latest published pre-release, `0.40.0-rc2`, too), which coerces any bare `0x`-prefixed hex string other than a 40-hex-char address into a `BigInt`. Fixed in `scripts/verify-protocol-finality.mjs`, which now calls `genlayer-js` directly (`createClient`/`writeContract`), bypassing that parser entirely -- the frontend was never affected, since `genlayer-js`'s `writeContract` takes native JS values with no such heuristic.

## External protocol-finality limitation

Attempted against a genuine active Testnet Asimov validator:

```bash
npx --yes genlayer@0.39.2 staking validator-history 0x1A7633691127bbB7237F3Fb62FDB0914B6dC0452 --network testnet-asimov --epochs 10 --limit 50
```

Result: `client.getSlashingAddress is not a function`. This Asimov query investigated tooling availability only. Asimov was never SLAIV's deployment network and an Asimov fact cannot satisfy a Studionet-bound policy. SLAIV refuses to replace unavailable authoritative Studionet history with synthetic protocol facts.

## Superseded releases

- `0xc17bfE775D46080E9A58F1eC80edC2E7A04DF101` -- **SUPERSEDED.** tx `0x5ecab1576a818abdf7ce3018429deeb2bec1fefbbb8258e63a278f499d6a2028`, deployed 2026-08-21 from the `faultline-dev` CLI wallet, frozen source commit `1e661be442eb36796831f8764001eb204569a6fd`, source SHA-256 `23302fca89fd298988bab337010a9696ebce5a880182789c18a6ff9df39a260f` (`SOURCE MATCH: PASS` against this one). Carried the consensus validator() agreement fix but not yet the evidence-DoS fix, real public-source retrieval, deterministic loss-fraction settlement, or the unresolved-appeal fix -- see "Why the evidence/consensus model changed in this release" above. Superseded by a full finishing-pass redeploy, not by a further audit finding on this address itself.
- `0x265B238DB4d8f08Ed9f8B5609C73F88b9ffC1ECd` -- **SUPERSEDED.** tx `0x5caf1e63a90832e8bf6605bf40fd1a5e085a48c925e9eaaaf9d91edf95d507bc`, deployed 2026-08-21 from the `faultline-dev` CLI wallet, frozen source commit `267f29bb45feeabaff759f017f91b7e395318e3e`, source SHA-256 `3ab4d28b265a5d32779d488ae2ae68a4b638e7165cedf9fa7a10d9a163da6cf7` (`SOURCE MATCH: PASS`). Same settlement-corrected source as `0x95FCEcA657...`/`0xE2c8ECFa29Dd...`; superseded not by a settlement bug but by the consensus validator() agreement fix found while live-testing `verify_protocol_finality` against this exact address (see "Consensus validator() agreement fix" above). This deployment is where that live RPC-path proof was actually captured -- keep its deploy tx and the finality tx `0x01489d51804afd5e853980c67875ec9bcc6a393959b048c5a2bf8296f816f38f` as the record of it.
- `0xE2c8ECFa29Dd67a1dDe8026Df62628bE765d78A5` -- **SUPERSEDED.** tx `0x22a18d4194b8594206b0e82daec2e2b3743534ab9c2302a7f650ed348dd64c4b`, deployed 2026-08-21 from wallet `0xc81d1717a158a76559a6890660d80213678efe57`, frozen source commit `5be08dd3786537ec4d68a8f75cf81b8898d679a8`. Reason superseded: `SOURCE MATCH: FAIL` -- `genlayer code` (via `gen_getContractCode`) confirms the module docstring genuinely was not part of what got deployed to this address, even though the rest of the file, functionally, was byte-identical and fully live-tested. See "Why the prior deployments were superseded" above for the full investigation. Retained as audit evidence; do not point the frontend at it, and do not use it for any future `preflight.py` run.
- `0x95FCEcA657dCfc87F140B616e79fD9D04700bBA9` -- **SUPERSEDED.** tx `0xbcd0d5f4c2c9f6e10f636c1640f51659e08f76750ea297d5f3849e30758582c4`, deployed 2026-08-21 from the `faultline-dev` CLI wallet, frozen source commit `5be08dd3786537ec4d68a8f75cf81b8898d679a8`, source SHA-256 `3ab4d28b265a5d32779d488ae2ae68a4b638e7165cedf9fa7a10d9a163da6cf7` (`SOURCE MATCH: PASS` against this one). Same corrected source as the current release; superseded by a further redeploy, not by any further code change. Underwent a full live lifecycle test (policy/claim/evidence/impersonation/duplicate/unsupported-event/state-guards), all passing.
- `0x5E90423450c1a571f0434014aA03A3958887E437` -- **SUPERSEDED / TEST-AUDIT DEPLOYMENT.** tx `0x26267d45384a2879226f55951c8b8c43ebe9b5876f59799f72cadea1eecaf833`, frozen source commit `6312fdb8f8c225747835feaa7340b270ddb23447`, source SHA-256 `694721a37a9790673e88bfb45f3c6d98c8535c323a6f0be0080d30c17d793274`. Reason superseded: validator-unbound `MISSED_APPEAL_WINDOW` settlement logic (see "Why the prior deployment was superseded" above). Retained only as audit evidence; do not point the frontend at it, and do not treat its `verify_protocol_finality` live-proof claim as valid (see correction record above).
- `0x7BCD17b76a9c6e3daA9f12a7b7E50Cfc83AF8eA0` (historical v2, authority-gated), tx `0x771f5ad3ac3111395761c008d7019ebe91e5f59991635343b3b793a3a1058fd4`, frozen source commit `edb48853c3f4de10c0b2bab2d766763bd8487162`, source SHA-256 `d00542cc83511cb595c9459fb74874e18b14908568c3b3b13cfa1a01abd8f943`, protocol authority `0xe362cf45d3b3dfb38ef78099daba6e3e7c96c792`. Authority rotation completed through proposal tx `0x2062be4ed46897967dcb6f042412a668e2db0b6e6b9dc7f82181edf43e769c62` and acceptance tx `0x9aaa5fc8ea85d0b02077d75d04d75b30d28686c128381fa9a1f48d23e9f0ad4c`. Live proof: Studionet-bound policy `pol_network_release_20260818` (tx `0xed5eb036574fb555ec3dd559e3b597d70d017c619f669b5f9ede18e025c9d73c`), claim `clm_network_failclosed_20260818` (tx `0xdc20a1386f8d32b17b044d2ea9d5359f1359331f33e530d55f65736ae24a0af7`), claimant evidence tx `0x6ba1ea28bcb64a4c0b20f3516ad81b72dba4b90e13617d4579eddfa239db56e9`. Result: `state=AWAITING_FINALITY`, `underlying_finality=PENDING`, review absent, payout `0`. Full historical dossier remains in `SUBMISSION_READINESS.md`.
- `0x8B1Db5604D2dDDa6741fB9C7168EC7fA468FD440`, tx `0xa9faac339e157bf428633d807906a033d830f2e17a4050c52f6b1b1832ef477a`
- `0xAcf34B0F9d40f7060E370577689AF5935a215dD6`, tx `0xde7e9cfe607c4c2a3b7f19bb3f018c8e45736a32c3377e60676182b16cbe931c`
- `0xadF6812B3e124BaFAfE1b17C22c4530a9D95F4C4`, tx `0x19a6f65f318d24e5e848df93f34202d8aec79e4ce4491171b5eed9f10bb0b18c`
- `0x3d19d355EC07b9cCFB5FACc367449A5e3B52DaD7`, tx `0xd95466efefee7df2b295e71e353f7ea8ee498d34bde19bffb9326786d7596b38`
- `0x6361B95A2AaD2b42CF2299b01123c301Ac6e5A1D`, tx `0xab035af3f463e7296111a8649fabccca88ee1b7d7a7e474fd597d1d437758d77`
