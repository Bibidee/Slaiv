# Protocol finality adapter

The browser never decides finality. By default, the operator adapter queries official GenLayer `staking validator-history` and requires an exact event ID found in that history. It refuses to infer a slash merely because a validator exists. An optional independent HTTPS source may be configured when it produces a JSON record with `claim_id`, `validator`, `finality: "FINAL"`, `observed_at_ts`, and a stable HTTPS `reference`.

Configure the operator shell (not the browser build) with:

```bash
SLAIV_CLAIMS_ADDRESS=0x8B1Db5604D2dDDa6741fB9C7168EC7fA468FD440
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

The command reads the on-chain claim, verifies the event against official history or rejects a source not on the allowlist, binds it to the claim and validator, canonicalizes the source record, creates a SHA-256 record fingerprint, and sends `record_protocol_finality` using the active GenLayer CLI account. The contract rejects claimant-supplied protocol facts and requires its rotated `protocol_authority` wallet.

The SHA-256 fingerprint identifies the exact normalized source response; it is not a signature or a substitute for securing the authority wallet. Use a dedicated authority account, retain source records off-chain, and rotate the authority with `propose_protocol_authority` followed by `accept_protocol_authority` from the new account.
