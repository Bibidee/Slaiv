# Security boundary

- A wallet caller—not an input address—must authorize policy, claim, claimant evidence, appeal and finalization writes on-chain.
- Claimants can submit only `CLAIMANT_ASSERTION` records. A separate `protocol_authority` adapter role can submit a structurally constrained `PROTOCOL_FACT`, but cannot adjudicate, alter policy terms, or write a payout. The adapter is required to independently fetch the referenced authoritative record before it calls the contract.
- Policy terms are immutable after activation. The deterministic reference engine freezes policy terms and tests ownership/duplicates.
- Evidence URLs require allowlisting and bounded extraction in the deployed adapter; fixture records contain no fabricated blocks, hashes, transaction IDs or retrieval times.
- Fetched pages and claimant text are untrusted data, never instructions. The contract review prompt states this explicitly.
- Underlying protocol finality and GenLayer transaction finality are separate. Pending underlying finality blocks review and payout.
- Payout consumes validated `eligible_loss`, uses integer units, applies deductible then cap, and finalization rejects replays.
- Slaiv cannot prove an unsupported source, private operator intent, or guarantee compensation.
- Commitment fields are opaque correlation labels. They are deliberately not presented as hashes, signatures, or cryptographic proof; canonical contract storage is the authoritative record.
