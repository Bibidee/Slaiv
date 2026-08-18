# Current release

- Network: Studionet (`https://studio.genlayer.com/api`)
- Contract: `0x8B1Db5604D2dDDa6741fB9C7168EC7fA468FD440`
- Deployment tx: `0xa9faac339e157bf428633d807906a033d830f2e17a4050c52f6b1b1832ef477a`
- Frozen source commit: `4e53e9ba210db7b0bd90635cd6ae037d9e574da5`
- Canonical source SHA-256: `afde26ecf341664241c76d9d6ade399beb6365b4c17a70b6a1f37ae111032e96`
- Deployer/admin: `0x79b3ecbe6a65bee93b2fcda78e6909892671507f`
- Protocol authority: `0xe362cf45d3b3dfb38ef78099daba6e3e7c96c792`
- CLI: `genlayer@0.39.2`
- Tests: 60 Direct Mode passed; 22 frontend tests passed
- Source match: local and network SHA equal; `SOURCE MATCH: PASS`

Authority rotation completed through proposal tx `0x21253dca33a0b83cd844640ca5602b06a504858860e81b84fb5ab9980682cf8f` and acceptance tx `0x1c0b030a209d95ba49510e2ca51f19d75ceed03124802c4f123fc703b98c0896`.

# Live release proof

- Policy `pol_release_20260818`: `0xa7c647fab5de0a66dc711cfead1b6bf38ed443626c8aebc6f1172d8afb7b3ca8`
- Claim `clm_failclosed_20260818`: `0x5d15341383f62380baff4535c01406f5d362608d0c25849ba5a306b3c759e5f5`
- Claimant evidence `evd_claimant_20260818`: `0xa67ac9ab1e62eba7e7665009893e4e6aec5853b60467679ba7be43e80ff2793b`
- Result: `state=AWAITING_FINALITY`, `underlying_finality=PENDING`, review absent, payout `0`.

The claim supplied `underlying_finality=FINAL`, but the contract overwrote it with `PENDING`. No authentic event exists for the clearly synthetic validator, so no `PROTOCOL_FACT` was created.

# External protocol-finality limitation

Attempted against a genuine active Testnet Asimov validator:

```bash
npx --yes genlayer@0.39.2 staking validator-history 0x1A7633691127bbB7237F3Fb62FDB0914B6dC0452 --network testnet-asimov --epochs 10 --limit 50
```

Result: `client.getSlashingAddress is not a function`. SLAIV refuses to replace unavailable authoritative history with synthetic protocol facts.

# Superseded releases

- `0xAcf34B0F9d40f7060E370577689AF5935a215dD6`, tx `0xde7e9cfe607c4c2a3b7f19bb3f018c8e45736a32c3377e60676182b16cbe931c`
- `0xadF6812B3e124BaFAfE1b17C22c4530a9D95F4C4`, tx `0x19a6f65f318d24e5e848df93f34202d8aec79e4ce4491171b5eed9f10bb0b18c`
- `0x3d19d355EC07b9cCFB5FACc367449A5e3B52DaD7`, tx `0xd95466efefee7df2b295e71e353f7ea8ee498d34bde19bffb9326786d7596b38`
- `0x6361B95A2AaD2b42CF2299b01123c301Ac6e5A1D`, tx `0xab035af3f463e7296111a8649fabccca88ee1b7d7a7e474fd597d1d437758d77`
