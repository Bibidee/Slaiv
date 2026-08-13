# Demo guide — DEMO / FIXTURE MODE

1. Run `npm run dev` and open `/`.
2. Inspect a provenance tag: its drawer identifies the record as a fixture and states there is no cryptographic commitment.
3. Open `/claims/clm_pending`: payout is unavailable while underlying finality is pending.
4. Open `/claims/clm_approved`: eligible loss is shown before deterministic deductible/cap calculation.
5. Open `/claims/clm_denied`, `/claims/clm_unresolved`, and `/claims/clm_partial` to verify distinct outcomes.
6. Open `/claims/clm_appeal` to inspect the appeal path.
7. Open `/monitor`: the authoritative adapter reports unavailable rather than producing logs.

This guide contains no live testnet claim. Configure environment values only after deploying and verifying a GenLayer contract.
