# Security boundary

- A wallet caller—not an input address—must authorize policy, claim, claimant evidence, appeal and finalization writes on-chain.
- Claimants can submit only `CLAIMANT_ASSERTION` records. A separate `protocol_authority` adapter role can submit a structurally constrained `PROTOCOL_FACT`, but cannot adjudicate, alter policy terms, or write a payout. The adapter must independently fetch an allowlisted HTTPS source, bind it to the on-chain claim and validator, and attach a SHA-256 fingerprint of the canonical source record.
- Authority rotation is two-step: the `authority_admin` proposes a new address and that address must accept. Keep the admin and operational authority in separate secured accounts before production use.
- Policy terms are immutable after activation. The deterministic reference engine freezes policy terms and tests ownership/duplicates.
- Evidence URLs require allowlisting and bounded extraction in the deployed adapter; fixture records contain no fabricated blocks, hashes, transaction IDs or retrieval times.
- Fetched pages and claimant text are untrusted data, never instructions. The contract review prompt states this explicitly.
- Underlying protocol finality and GenLayer transaction finality are separate. Pending underlying finality blocks review and payout.
- Payout consumes validated `eligible_loss`, uses integer units, applies deductible then cap, and finalization rejects replays.
- Slaiv cannot prove an unsupported source, private operator intent, or guarantee compensation.
- Commitment fields are opaque correlation labels. They are deliberately not presented as hashes, signatures, or cryptographic proof; canonical contract storage is the authoritative record.
