# Current release

- Network: Studionet (`https://studio.genlayer.com/api`)
- Contract: `0xE2c8ECFa29Dd67a1dDe8026Df62628bE765d78A5`
- Deployment tx: `0x22a18d4194b8594206b0e82daec2e2b3743534ab9c2302a7f650ed348dd64c4b`
- Deployment timestamp: 2026-08-21T07:57:59Z (Studionet-confirmed `FINALIZED`)
- Frozen source commit: `5be08dd3786537ec4d68a8f75cf81b8898d679a8` (`permissionless-v3`)
- Canonical source SHA-256: `3ab4d28b265a5d32779d488ae2ae68a4b638e7165cedf9fa7a10d9a163da6cf7`
- Deployer: `0xc81d1717a158a76559a6890660d80213678efe57`
- Protocol authority: none. This is the permissionless v3 release; there is no privileged finality role.
- CLI: `genlayer@0.39.2`
- Supported incident types: `MISSED_EXECUTION_WINDOW` only. `MISSED_APPEAL_WINDOW` is not supported -- see "Why the prior deployment was superseded" below.
- Tests: 53 Direct Mode passed; 35 frontend tests passed
- Source match: **caveat.** `scripts/source_match.py` reports `FAIL` against this address -- `genlayer code` returns the deployed source with the module-level docstring (the `"""Permissionless SLAIV..."""` block) stripped, which is not present in `contracts/SlaivClaims.py`. A manual line-by-line diff confirms every other line, including the full body, `EVENTS`, and the MISSED_APPEAL_WINDOW-removal comment, is byte-identical; the only difference is that missing docstring plus a `# v0.2.17` tag `genlayer code` prepends. This looks like an artifact of how `genlayer code` reconstructs source for this deployment, not an actual difference in the deployed logic, but the automated gate cannot currently confirm that on its own -- `preflight.py` will also report `FAIL` on this contract until that's resolved. Treat this deployment as functionally verified by manual diff, not by the automated source-match tool, until that gap is closed.
- Explorer: https://explorer-studio.genlayer.com/address/0xE2c8ECFa29Dd67a1dDe8026Df62628bE765d78A5

This release has not been merged to `main` and the public frontend has not been switched to it. It is pending review on draft PR #5.

## Why the prior deployments were superseded

`0x5E90423450c1a571f0434014aA03A3958887E437` (deployed 2026-08-20) supported a second incident type, `MISSED_APPEAL_WINDOW`, classified whenever the official RPC's `appeal_leader_timeout` or `appeal_validators_timeout` flags were `true`. A live-transaction audit on 2026-08-21 found this was a genuine settlement-logic bug, not a caller/tooling issue: those flags are exposed only as transaction-wide booleans, with no field binding either one to a specific validator address, unlike `leader_timeout_validators` (which explicitly enumerates the timed-out validator and remains genuinely validator-bound). GenLayer's own consensus/fee-distribution model (`genlayerlabs/genlayer-fee-distribution-simulator`) confirms leader-timeouts, including during appeal rounds, are attributed to one specific round's leader address at the protocol level -- but that attribution never reaches the public `eth_getTransactionByHash` response SLAIV queries. Concretely: a genuine appeal timeout on validator X could have satisfied a claim against a SLAIV policy insuring an unrelated validator Y, as long as both happened to sit on the same GenLayer transaction.

`MISSED_APPEAL_WINDOW` has been removed from `EVENTS` entirely (see `contracts/SlaivClaims.py`, `docs/PROTOCOL_ADAPTER.md`) rather than shipping an unverifiable validator binding.

`0x95FCEcA657dCfc87F140B616e79fD9D04700bBA9` (deployed 2026-08-21) was the first corrected deployment carrying that fix, deployed from the `faultline-dev` CLI wallet and fully live-tested (see its entry under Superseded releases below for that test record). It was superseded by the current release above, a fresh deployment of the identical source from a different wallet.

Both `0x5E90423450c1a571f0434014aA03A3958887E437` and `0x95FCEcA657dCfc87F140B616e79fD9D04700bBA9` are retained below purely as historical/audit evidence -- neither must be treated as a release candidate, pointed to by the frontend, or reused.

## Live release proof (v3, permissionless -- current release)

Manual multi-wallet lifecycle test performed against `0xE2c8ECFa29Dd67a1dDe8026Df62628bE765d78A5` (the current release address), using two independent CLI-managed wallets (`faultline-dev` as policy holder/claimant, `recallshield-studio-test` as an unrelated outsider wallet). Every step below was independently confirmed via each transaction's decoded exception text (not just its ERROR/SUCCESS badge) and by re-reading contract state after each step:

- Policy `pol_v3c_lifecycle_20260821`, holder `0x79b3ecbe6a65bee93b2fcda78e6909892671507f`: created successfully by its own holder (tx `0x8afbe4c7...9a593a6`, `FINALIZED`). `get_policy` confirms the exact stored terms.
- Claim `clm_v3c_lifecycle_20260821`: filed successfully by the policy holder against its own policy (tx `0xf5071850...e90a24c16`, `FINALIZED`). `get_claim` confirms `state=AWAITING_FINALITY`, `underlying_finality=PENDING`.
- Outsider `PUBLIC_SOURCE` evidence: accepted permissionlessly (tx `0xbea688bf...151b85b`, `FINALIZED`). `get_evidence` confirms it stored with `submitted_by` equal to the outsider wallet.
- Impersonation attempt: outsider wallet tried `create_policy` naming the holder wallet as `holder` -- rejected (`holder mismatch`). No record created.
- Duplicate policy creation (same `policy_id`): rejected (`duplicate policy`).
- Policy creation advertising `covered_events: ["MISSED_APPEAL_WINDOW"]`: rejected (`invalid covered events`) -- confirms the removal live on this specific deployment, not just in Direct Mode or the prior (superseded) live test.
- Outsider `CLAIMANT_ASSERTION` evidence attempt: rejected (`unauthorized evidence`). (First attempt at this used an all-digit test hash and was misleadingly rejected as `invalid evidence hash` instead -- see "CLI numeric-string encoding" below; redone with a hex-letter hash to get the intended rejection reason.)
- `review_slashing_claim`, `finalize_claim`, `record_appeal`, and `review_appeal` were each attempted at this (non-advanced) claim state and correctly rejected by their state guards.
- `get_protocol_stats` after the full run: `{"policy_count": 1, "claim_count": 1, "permissionless": true}` -- only the one legitimate policy and claim exist; none of the six rejected attempts left partial state.

### CLI numeric-string encoding (second instance of the same class of bug)

While building the unauthorized-evidence test above, a `content_hash` value made entirely of one repeated digit (`"3333...3"`, 64 digits) was silently coerced by `genlayer write --args` into a plain integer -- the on-chain calldata shows `content_hash:3333...3` with no quotes, not a string. This is the same root cause documented below for `0x`-prefixed 32-byte hashes (`genlayer@0.39.2`'s `parseScalar` in `src/commands/contracts/index.ts`), but reached through its `Number(value)`/`BigInt(value)` fallback path rather than `HEX_RE`: **any** bare CLI argument that parses fully as a decimal number -- not just `0x`-prefixed hex -- gets coerced, regardless of prefix. Test values built from repeated digits (`"1"*N`, `"2"*N`, `"3"*N`, ...) are unsafe for this CLI; values containing at least one non-digit hex letter (`a`-`f`) are unaffected. This did not affect the frontend (unaffected for the same reason as the hash-string bug) or any earlier test in this document that happened to use letter-containing hashes.

The prior corresponding entry for `0x95FCEcA657dCfc87F140B616e79fD9D04700bBA9` recorded the same lifecycle (policy/claim/evidence/impersonation/duplicate/state-guards), all passing, with no distinct issues found there.

`verify_protocol_finality`'s RPC-fetch path (past `_event_id()`, through `gl.nondet.web.post()`) has still not been exercised live on this deployment as of this writing: it requires a funded signer key supplied via `SLAIV_SIGNER_PRIVATE_KEY` to `scripts/verify-protocol-finality.mjs` (the CLI's `write --args` path cannot carry a 32-byte hex string correctly -- see the correction below), and no private key has been extracted or requested to complete it. This is the one open item before the live RPC path can be marked verified end-to-end; see "Remaining known limitations."

No genuine validator-timeout incident is available, so the positive settlement path (`UNDER_REVIEW` -> judgment -> appeal -> finalize) has not been exercised end-to-end on-chain either. Both gaps are proven only by Direct Mode's synthetic fixtures (53/53 passing).

## Correction record: prior verify_protocol_finality claim (superseded deployment)

The superseded deployment's live-proof note previously claimed an outsider-triggered `verify_protocol_finality` call against a real, finalized, non-incident transaction (this deployment's own deploy tx) proved fail-closed rejection. It did not. A 2026-08-21 audit found the explorer's decoded calldata showed `event_id` arriving as the decimal integer `17255893019083365422223124959272975130536380754561951960972769562471330150451` -- exactly `int(tx_hash_hex, 16)` -- not the hash string. Execution reverted at the contract's very first check, `_event_id()` ("invalid protocol candidate"), before ever reaching `gl.nondet.web.post()`. Root cause: a caller-side bug in `genlayer@0.39.2`'s `write --args` positional parser (confirmed present in the latest published pre-release, `0.40.0-rc2`, too), which coerces any bare `0x`-prefixed hex string other than a 40-hex-char address into a `BigInt`. Fixed in `scripts/verify-protocol-finality.mjs`, which now calls `genlayer-js` directly (`createClient`/`writeContract`), bypassing that parser entirely -- the frontend was never affected, since `genlayer-js`'s `writeContract` takes native JS values with no such heuristic.

## External protocol-finality limitation

Attempted against a genuine active Testnet Asimov validator:

```bash
npx --yes genlayer@0.39.2 staking validator-history 0x1A7633691127bbB7237F3Fb62FDB0914B6dC0452 --network testnet-asimov --epochs 10 --limit 50
```

Result: `client.getSlashingAddress is not a function`. This Asimov query investigated tooling availability only. Asimov was never SLAIV's deployment network and an Asimov fact cannot satisfy a Studionet-bound policy. SLAIV refuses to replace unavailable authoritative Studionet history with synthetic protocol facts.

## Superseded releases

- `0x95FCEcA657dCfc87F140B616e79fD9D04700bBA9` -- **SUPERSEDED.** tx `0xbcd0d5f4c2c9f6e10f636c1640f51659e08f76750ea297d5f3849e30758582c4`, deployed 2026-08-21 from the `faultline-dev` CLI wallet, frozen source commit `5be08dd3786537ec4d68a8f75cf81b8898d679a8`, source SHA-256 `3ab4d28b265a5d32779d488ae2ae68a4b638e7165cedf9fa7a10d9a163da6cf7` (`SOURCE MATCH: PASS` against this one). Same corrected source as the current release; superseded by a fresh deployment from a different wallet, not by any further code change. Underwent the same full live lifecycle test (policy/claim/evidence/impersonation/duplicate/unsupported-event/state-guards), all passing -- see "Live release proof" above, which now records the equivalent run against the current release address.
- `0x5E90423450c1a571f0434014aA03A3958887E437` -- **SUPERSEDED / TEST-AUDIT DEPLOYMENT.** tx `0x26267d45384a2879226f55951c8b8c43ebe9b5876f59799f72cadea1eecaf833`, frozen source commit `6312fdb8f8c225747835feaa7340b270ddb23447`, source SHA-256 `694721a37a9790673e88bfb45f3c6d98c8535c323a6f0be0080d30c17d793274`. Reason superseded: validator-unbound `MISSED_APPEAL_WINDOW` settlement logic (see "Why the prior deployment was superseded" above). Retained only as audit evidence; do not point the frontend at it, and do not treat its `verify_protocol_finality` live-proof claim as valid (see correction record above).
- `0x7BCD17b76a9c6e3daA9f12a7b7E50Cfc83AF8eA0` (historical v2, authority-gated), tx `0x771f5ad3ac3111395761c008d7019ebe91e5f59991635343b3b793a3a1058fd4`, frozen source commit `edb48853c3f4de10c0b2bab2d766763bd8487162`, source SHA-256 `d00542cc83511cb595c9459fb74874e18b14908568c3b3b13cfa1a01abd8f943`, protocol authority `0xe362cf45d3b3dfb38ef78099daba6e3e7c96c792`. Authority rotation completed through proposal tx `0x2062be4ed46897967dcb6f042412a668e2db0b6e6b9dc7f82181edf43e769c62` and acceptance tx `0x9aaa5fc8ea85d0b02077d75d04d75b30d28686c128381fa9a1f48d23e9f0ad4c`. Live proof: Studionet-bound policy `pol_network_release_20260818` (tx `0xed5eb036574fb555ec3dd559e3b597d70d017c619f669b5f9ede18e025c9d73c`), claim `clm_network_failclosed_20260818` (tx `0xdc20a1386f8d32b17b044d2ea9d5359f1359331f33e530d55f65736ae24a0af7`), claimant evidence tx `0x6ba1ea28bcb64a4c0b20f3516ad81b72dba4b90e13617d4579eddfa239db56e9`. Result: `state=AWAITING_FINALITY`, `underlying_finality=PENDING`, review absent, payout `0`. Full historical dossier remains in `SUBMISSION_READINESS.md`.
- `0x8B1Db5604D2dDDa6741fB9C7168EC7fA468FD440`, tx `0xa9faac339e157bf428633d807906a033d830f2e17a4050c52f6b1b1832ef477a`
- `0xAcf34B0F9d40f7060E370577689AF5935a215dD6`, tx `0xde7e9cfe607c4c2a3b7f19bb3f018c8e45736a32c3377e60676182b16cbe931c`
- `0xadF6812B3e124BaFAfE1b17C22c4530a9D95F4C4`, tx `0x19a6f65f318d24e5e848df93f34202d8aec79e4ce4491171b5eed9f10bb0b18c`
- `0x3d19d355EC07b9cCFB5FACc367449A5e3B52DaD7`, tx `0xd95466efefee7df2b295e71e353f7ea8ee498d34bde19bffb9326786d7596b38`
- `0x6361B95A2AaD2b42CF2299b01123c301Ac6e5A1D`, tx `0xab035af3f463e7296111a8649fabccca88ee1b7d7a7e474fd597d1d437758d77`
