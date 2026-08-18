# Deployment record

## Current Studionet deployment

- Network: Studionet (`https://studio.genlayer.com/api`)
- Contract: `0xadF6812B3e124BaFAfE1b17C22c4530a9D95F4C4`
- Transaction: `0x19a6f65f318d24e5e848df93f34202d8aec79e4ce4491171b5eed9f10bb0b18c`
- Authority admin: `0x79b3ecbe6a65bee93b2fcda78e6909892671507f`
- Active protocol authority: `0xe362cf45d3b3dfb38ef78099daba6e3e7c96c792`
- CLI: 0.39.2
- Verification: after the two-step rotation, `get_protocol_authority()` returned the separate active authority `0xe362cf45d3b3dfb38ef78099daba6e3e7c96c792`. A labelled live test policy, claim and claimant-evidence record were read back successfully; the claim remains `AWAITING_FINALITY`. Direct Mode passed 4/4 in WSL/Linux with `genlayer-test==0.29.2`.

The current deployment adds a two-step authority rotation (`propose_protocol_authority`, then `accept_protocol_authority`). The rotation to the separate secured operator wallet is complete. The authority is limited to normalized protocol facts, not adjudication or payout.

## Superseded deployment

- Contract: `0x3d19d355EC07b9cCFB5FACc367449A5e3B52DaD7`
- Transaction: `0xd95466efefee7df2b295e71e353f7ea8ee498d34bde19bffb9326786d7596b38`
- Reason: superseded by the authority rotation and evidence-fingerprint release.

## Historical deployment

- Network: Studionet
- Contract: `0x6361B95A2AaD2b42CF2299b01123c301Ac6e5A1D`
- Transaction: `0xab035af3f463e7296111a8649fabccca88ee1b7d7a7e474fd597d1d437758d77`
- Deployer: `0x79b3ecbe6a65bee93b2fcda78e6909892671507f`
- CLI: 0.39.2

This address is superseded and must not be configured.
