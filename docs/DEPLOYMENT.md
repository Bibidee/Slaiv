# Deployment record

## Current Studionet deployment

- Network: Studionet (`https://studio.genlayer.com/api`)
- Contract: `0x3d19d355EC07b9cCFB5FACc367449A5e3B52DaD7`
- Transaction: `0xd95466efefee7df2b295e71e353f7ea8ee498d34bde19bffb9326786d7596b38`
- Deployer / protocol authority: `0x79b3ecbe6a65bee93b2fcda78e6909892671507f`
- CLI: 0.39.2
- Verification: `get_protocol_stats()` returned `{"policy_count": 0, "claim_count": 0}` after deployment; Direct Mode passed 2/2 in WSL/Linux with `genlayer-test==0.29.2`.

The current deployment initializes the narrow protocol-authority adapter role to the deployer. It is an authority boundary for normalized protocol facts, not an adjudication or payout override.

## Historical deployment

- Network: Studionet
- Contract: `0x6361B95A2AaD2b42CF2299b01123c301Ac6e5A1D`
- Transaction: `0xab035af3f463e7296111a8649fabccca88ee1b7d7a7e474fd597d1d437758d77`
- Deployer: `0x79b3ecbe6a65bee93b2fcda78e6909892671507f`
- CLI: 0.39.2

This address is superseded and must not be configured.
