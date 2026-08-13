# Security boundary

- A wallet caller—not an input address—must authorize policy, claim, evidence, appeal and finalization writes on-chain.
- Policy terms are immutable after activation. The deterministic reference engine freezes policy terms and tests ownership/duplicates.
- Evidence URLs require allowlisting and bounded extraction in the deployed adapter; fixture records contain no fabricated blocks, hashes, transaction IDs or retrieval times.
- Fetched pages and claimant text are untrusted data, never instructions. The contract review prompt states this explicitly.
- Underlying protocol finality and GenLayer transaction finality are separate. Pending underlying finality blocks review and payout.
- Payout consumes validated `eligible_loss`, uses integer units, applies deductible then cap, and finalization rejects replays.
- Slaiv cannot prove an unsupported source, private operator intent, or guarantee compensation.
