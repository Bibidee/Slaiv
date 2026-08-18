# Protocol finality adapter

The browser never decides finality. By default, the operator adapter queries official GenLayer `staking validator-history` and requires an exact event ID found in that history. It refuses to infer a slash merely because a validator exists. An optional independent HTTPS source may be configured when it produces a JSON record with `claim_id`, `validator`, `finality: "FINAL"`, `observed_at_ts`, and a stable HTTPS `reference`.

Configure the operator shell (not the browser build) with:

```bash
SLAIV_CLAIMS_ADDRESS=0x7BCD17b76a9c6e3daA9f12a7b7E50Cfc83AF8eA0
GENLAYER_NETWORK=studionet
GENLAYER_RPC_URL=https://studio.genlayer.com/api
// Official GenLayer CLI mode
npm run adapter:finality -- --claim-id clm_example --event-id authoritative-event-id --dry-run
npm run adapter:finality -- --claim-id clm_example --event-id authoritative-event-id

// Optional independent HTTPS source mode
PROTOCOL_FINALITY_SOURCE_URL='https://authority.example/finality/{claimId}'
PROTOCOL_FINALITY_ALLOWED_ORIGINS='https://authority.example'
npm run adapter:finality -- --claim-id clm_example
```

The command reads the on-chain claim and policy, verifies the event against official history or rejects a source not on the allowlist, and requires the source network to equal the immutable policy `subject_network`. It then binds the record to the claim and validator, canonicalizes it, creates a SHA-256 record fingerprint, and sends `record_protocol_finality` using the active GenLayer CLI account. The contract independently enforces the same network equality, rejects claimant-supplied protocol facts and requires its rotated `protocol_authority` wallet.

An Asimov or Bradbury event can never satisfy a Studionet policy. Asimov validator-history commands documented elsewhere are tooling investigations only, not SLAIV release evidence.

The SHA-256 fingerprint identifies the exact normalized source response; it is not a signature or a substitute for securing the authority wallet. Use a dedicated authority account, retain source records off-chain, and rotate the authority with `propose_protocol_authority` followed by `accept_protocol_authority` from the new account.
