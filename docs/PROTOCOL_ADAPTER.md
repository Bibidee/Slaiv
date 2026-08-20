# Permissionless protocol finality verification

SLAIV v3 has no privileged protocol-finality adapter or authority key. The browser and CLI submit only a **candidate** official GenLayer event. The Intelligent Contract is the verifier.

## Candidate input

`verify_protocol_finality(claim_id, event_id, reference)` accepts:

- `claim_id`: an existing SLAIV claim in `AWAITING_FINALITY`;
- `event_id`: a 32-byte hexadecimal GenLayer event/transaction identifier;
- `reference`: the matching official explorer record for the policy's immutable `subject_network`.

The caller does **not** submit a trusted `PROTOCOL_FACT`, `FINAL` flag, validator, network, incident class, timestamp, eligibility, loss, or payout.

## Consensus verification

Inside the Intelligent Contract:

1. deterministic checks reject malformed IDs, wrong explorer domains, cross-network references, and replayed events;
2. the GenLayer leader fetches the official explorer record using `gl.nondet.web.get`;
3. the leader derives structured protocol facts from that source while treating the page as untrusted evidence, never instructions;
4. validators independently refetch the same source and independently derive the same settlement-critical fields;
5. validator, network, event ID, incident class, event timestamp, and finality must agree exactly;
6. deterministic checks bind the verified result to the policy validator and coverage window;
7. only then does the contract construct and store a `PROTOCOL_FACT`, mark it `verified_by=GENLAYER_CONSENSUS`, consume the event against replay, and move the claim to `UNDER_REVIEW`.

If the source is unavailable, ambiguous, non-final, mismatched, or validators disagree, state does not advance.

## Browser

While a claim is `AWAITING_FINALITY`, any connected wallet sees **Verify protocol event**. The form asks only for the event ID and official explorer record. This is deliberately permissionless: the transaction sender pays to trigger verification but does not determine the result.

## CLI

Any configured funded GenLayer wallet may submit the same candidate:

```bash
npm run verify:finality -- --claim-id clm_example --event-id 0x<64-hex>
```

The script derives the official explorer URL from the claim's policy network. An exact reference may also be supplied:

```bash
npm run verify:finality -- --claim-id clm_example --event-id 0x<64-hex> --reference https://explorer-studio.genlayer.com/tx/0x<64-hex>
```

A dry run validates only candidate shape and routing; it does not claim the source is verified:

```bash
npm run verify:finality -- --claim-id clm_example --event-id 0x<64-hex> --dry-run
```

## Network boundary

A policy's `subject_network` is immutable. A Studionet policy accepts only the configured official Studionet explorer origin; Asimov and Bradbury references cannot unlock it. The same protocol event is single-use for the same network and validator.

## Live-test caveat

Permissionlessness does not mean fabricating events. A positive live path still requires an actual official protocol event whose record exposes enough stable information for independent validators to prove the required facts. Otherwise SLAIV correctly remains `AWAITING_FINALITY`.
