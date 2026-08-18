# Current release

- Network: Studionet (`https://studio.genlayer.com/api`)
- Contract: `0x7BCD17b76a9c6e3daA9f12a7b7E50Cfc83AF8eA0`
- Deployment tx: `0x771f5ad3ac3111395761c008d7019ebe91e5f59991635343b3b793a3a1058fd4`
- Frozen source commit: `edb48853c3f4de10c0b2bab2d766763bd8487162`
- Canonical source SHA-256: `d00542cc83511cb595c9459fb74874e18b14908568c3b3b13cfa1a01abd8f943`
- Deployer/admin: `0x79b3ecbe6a65bee93b2fcda78e6909892671507f`
- Protocol authority: `0xe362cf45d3b3dfb38ef78099daba6e3e7c96c792`
- CLI: `genlayer@0.39.2`
- Tests: 67 Direct Mode passed; 24 frontend tests passed
- Source match: local and network SHA equal; `SOURCE MATCH: PASS`

Authority rotation completed through proposal tx `0x2062be4ed46897967dcb6f042412a668e2db0b6e6b9dc7f82181edf43e769c62` and acceptance tx `0x9aaa5fc8ea85d0b02077d75d04d75b30d28686c128381fa9a1f48d23e9f0ad4c`.

# Live release proof

- Studionet-bound policy `pol_network_release_20260818`: `0xed5eb036574fb555ec3dd559e3b597d70d017c619f669b5f9ede18e025c9d73c`
- Claim `clm_network_failclosed_20260818`: `0xdc20a1386f8d32b17b044d2ea9d5359f1359331f33e530d55f65736ae24a0af7`
- Claimant evidence `evd_network_claimant_20260818`: `0x6ba1ea28bcb64a4c0b20f3516ad81b72dba4b90e13617d4579eddfa239db56e9`
- Result: `state=AWAITING_FINALITY`, `underlying_finality=PENDING`, review absent, payout `0`.

The claim supplied `underlying_finality=FINAL`, but the contract overwrote it with `PENDING`. No authentic event exists for the clearly synthetic validator, so no `PROTOCOL_FACT` was created.

# External protocol-finality limitation

Attempted against a genuine active Testnet Asimov validator:

```bash
npx --yes genlayer@0.39.2 staking validator-history 0x1A7633691127bbB7237F3Fb62FDB0914B6dC0452 --network testnet-asimov --epochs 10 --limit 50
```

Result: `client.getSlashingAddress is not a function`. This Asimov query investigated tooling availability only. Asimov was never SLAIV's deployment network and an Asimov fact cannot satisfy a Studionet-bound policy. SLAIV refuses to replace unavailable authoritative Studionet history with synthetic protocol facts.

# Superseded releases

- `0x8B1Db5604D2dDDa6741fB9C7168EC7fA468FD440`, tx `0xa9faac339e157bf428633d807906a033d830f2e17a4050c52f6b1b1832ef477a`
- `0xAcf34B0F9d40f7060E370577689AF5935a215dD6`, tx `0xde7e9cfe607c4c2a3b7f19bb3f018c8e45736a32c3377e60676182b16cbe931c`
- `0xadF6812B3e124BaFAfE1b17C22c4530a9D95F4C4`, tx `0x19a6f65f318d24e5e848df93f34202d8aec79e4ce4491171b5eed9f10bb0b18c`
- `0x3d19d355EC07b9cCFB5FACc367449A5e3B52DaD7`, tx `0xd95466efefee7df2b295e71e353f7ea8ee498d34bde19bffb9326786d7596b38`
- `0x6361B95A2AaD2b42CF2299b01123c301Ac6e5A1D`, tx `0xab035af3f463e7296111a8649fabccca88ee1b7d7a7e474fd597d1d437758d77`
