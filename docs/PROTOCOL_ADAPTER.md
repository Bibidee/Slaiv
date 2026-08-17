# Protocol finality adapter

The browser never decides finality. An operator runs the adapter only after an independent authoritative HTTPS source has produced a JSON record with `claim_id`, `validator`, `finality: "FINAL"`, `observed_at_ts`, and a stable HTTPS `reference`.

Configure the operator shell (not the browser build) with:

```bash
VITE_SLAIV_CLAIMS_ADDRESS=0x...
PROTOCOL_FINALITY_SOURCE_URL='https://authority.example/finality/{claimId}'
PROTOCOL_FINALITY_ALLOWED_ORIGINS='https://authority.example'
npm run adapter:finality -- --claim-id clm_example
```

The command reads the on-chain claim, rejects a source not on the allowlist, verifies that its claim and validator match, canonicalizes the JSON record, creates a SHA-256 record fingerprint, and sends `record_protocol_finality` using the active GenLayer CLI account. The contract rejects claimant-supplied protocol facts and requires its rotated `protocol_authority` wallet.

The SHA-256 fingerprint identifies the exact normalized source response; it is not a signature or a substitute for securing the authority wallet. Use a dedicated authority account, retain source records off-chain, and rotate the authority with `propose_protocol_authority` followed by `accept_protocol_authority` from the new account.
