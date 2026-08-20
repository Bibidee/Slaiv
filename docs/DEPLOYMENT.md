# Current release

- Network: Studionet (`https://studio.genlayer.com/api`)
- Contract: `0x5E90423450c1a571f0434014aA03A3958887E437`
- Deployment tx: `0x26267d45384a2879226f55951c8b8c43ebe9b5876f59799f72cadea1eecaf833`
- Frozen source commit: `6312fdb8f8c225747835feaa7340b270ddb23447` (`permissionless-v3`)
- Canonical source SHA-256: `694721a37a9790673e88bfb45f3c6d98c8535c323a6f0be0080d30c17d793274`
- Deployer: `0x79b3ecbe6a65bee93b2fcda78e6909892671507f`
- Protocol authority: none. This is the permissionless v3 release; there is no privileged finality role.
- CLI: `genlayer@0.39.2`
- Tests: 44 Direct Mode passed; 35 frontend tests passed
- Source match: local and network SHA equal; `SOURCE MATCH: PASS`
- Preflight: `PREFLIGHT: PASS`

This release has not been merged to `main` and the public frontend has not been switched to it. It is pending review on draft PR #5.

# Live release proof (v3, permissionless)

Manual multi-wallet lifecycle test performed against the live Studionet deployment above, using two independent CLI-managed wallets (`faultline-dev` as policy holder/claimant, `recallshield-studio-test` as an unrelated outsider wallet):

- Policy `pol_v3_manual_20260820`, holder `0x79b3ecbe6a65bee93b2fcda78e6909892671507f`: created successfully by its own holder.
- Impersonation attempt: outsider wallet tried `create_policy` naming the holder wallet as `holder` -- rejected (`contract_error`, holder mismatch). No record created.
- Claim `clm_v3_manual_20260820`: filed successfully by the policy holder against its own policy.
- Outsider `CLAIMANT_ASSERTION` evidence attempt: rejected (`contract_error`, unauthorized evidence).
- Outsider `PUBLIC_SOURCE` evidence: accepted permissionlessly.
- Outsider-triggered `verify_protocol_finality` against a real, finalized, non-incident Studionet transaction (this deployment's own tx `0x26267d45384a2879226f59...caf833`, txs `0x956f6a0f...6edbfceb` and retry `0x4e89ef82...db78e1`): rejected (`contract_error`). **Correction (2026-08-21 live-transaction audit):** an earlier version of this note claimed this proved fail-closed rejection of a genuine non-incident. It did not. The explorer's decoded calldata shows `event_id` arrived as the decimal integer `17255893019083365422223124959272975130536380754561951960972769562471330150451` -- exactly `int(tx_hash_hex, 16)` -- not the hash string. Execution reverted at the contract's very first check, `_event_id()` ("invalid protocol candidate"), before ever reaching `gl.nondet.web.post()`. The RPC was never queried and no fail-closed-on-non-incident behavior was exercised live. Root cause: a caller-side bug in `genlayer@0.39.2`'s `write --args` positional parser, which coerces any bare `0x`-prefixed hex string other than a 40-hex-char address into a `BigInt`. Fixed in `scripts/verify-protocol-finality.mjs` (now calls `genlayer-js` directly, bypassing that parser); a corrected live re-run requires a funded signer key supplied via `SLAIV_SIGNER_PRIVATE_KEY` and has not yet been completed. The frontend was never affected -- `genlayer-js`'s `writeContract` takes native JS values with no such heuristic.
- `review_slashing_claim`, `finalize_claim`, and `record_appeal`/`review_appeal` were each attempted at this (non-advanced) claim state and correctly rejected by their state guards, confirming those permissionless triggers cannot be invoked out of sequence.
- `get_protocol_stats` after the run: `{"policy_count": 1, "claim_count": 1, "permissionless": true}` -- only the two legitimate records exist; no impersonation or duplicate records were created. Confirmed again after the live-transaction audit above (including the extra retry transaction): state is still exactly one policy, one claim, one evidence entry, `state=AWAITING_FINALITY`.

No genuine validator-timeout incident was available during this test, so the positive settlement path (`UNDER_REVIEW` -> judgment -> appeal -> finalize) was not exercised end-to-end on-chain. This mirrors the same limitation recorded for the historical v2 release below and is not a new gap. Separately, and unlike the v2 record, the fail-closed-on-non-incident path for `verify_protocol_finality` specifically also remains unexercised live, per the correction above -- it is proven only by Direct Mode's synthetic fixtures.

# External protocol-finality limitation

Attempted against a genuine active Testnet Asimov validator:

```bash
npx --yes genlayer@0.39.2 staking validator-history 0x1A7633691127bbB7237F3Fb62FDB0914B6dC0452 --network testnet-asimov --epochs 10 --limit 50
```

Result: `client.getSlashingAddress is not a function`. This Asimov query investigated tooling availability only. Asimov was never SLAIV's deployment network and an Asimov fact cannot satisfy a Studionet-bound policy. SLAIV refuses to replace unavailable authoritative Studionet history with synthetic protocol facts.

# Superseded releases

- `0x7BCD17b76a9c6e3daA9f12a7b7E50Cfc83AF8eA0` (historical v2, authority-gated), tx `0x771f5ad3ac3111395761c008d7019ebe91e5f59991635343b3b793a3a1058fd4`, frozen source commit `edb48853c3f4de10c0b2bab2d766763bd8487162`, source SHA-256 `d00542cc83511cb595c9459fb74874e18b14908568c3b3b13cfa1a01abd8f943`, protocol authority `0xe362cf45d3b3dfb38ef78099daba6e3e7c96c792`. Authority rotation completed through proposal tx `0x2062be4ed46897967dcb6f042412a668e2db0b6e6b9dc7f82181edf43e769c62` and acceptance tx `0x9aaa5fc8ea85d0b02077d75d04d75b30d28686c128381fa9a1f48d23e9f0ad4c`. Live proof: Studionet-bound policy `pol_network_release_20260818` (tx `0xed5eb036574fb555ec3dd559e3b597d70d017c619f669b5f9ede18e025c9d73c`), claim `clm_network_failclosed_20260818` (tx `0xdc20a1386f8d32b17b044d2ea9d5359f1359331f33e530d55f65736ae24a0af7`), claimant evidence tx `0x6ba1ea28bcb64a4c0b20f3516ad81b72dba4b90e13617d4579eddfa239db56e9`. Result: `state=AWAITING_FINALITY`, `underlying_finality=PENDING`, review absent, payout `0`. Full historical dossier remains in `SUBMISSION_READINESS.md`.
- `0x8B1Db5604D2dDDa6741fB9C7168EC7fA468FD440`, tx `0xa9faac339e157bf428633d807906a033d830f2e17a4050c52f6b1b1832ef477a`
- `0xAcf34B0F9d40f7060E370577689AF5935a215dD6`, tx `0xde7e9cfe607c4c2a3b7f19bb3f018c8e45736a32c3377e60676182b16cbe931c`
- `0xadF6812B3e124BaFAfE1b17C22c4530a9D95F4C4`, tx `0x19a6f65f318d24e5e848df93f34202d8aec79e4ce4491171b5eed9f10bb0b18c`
- `0x3d19d355EC07b9cCFB5FACc367449A5e3B52DaD7`, tx `0xd95466efefee7df2b295e71e353f7ea8ee498d34bde19bffb9326786d7596b38`
- `0x6361B95A2AaD2b42CF2299b01123c301Ac6e5A1D`, tx `0xab035af3f463e7296111a8649fabccca88ee1b7d7a7e474fd597d1d437758d77`
