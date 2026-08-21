# Permissionless protocol finality verification

SLAIV v3 has no privileged protocol-finality adapter or authority key. The browser and CLI submit only a **candidate** GenLayer transaction hash. The Intelligent Contract determines the official source itself and is the verifier.

## Candidate input

`verify_protocol_finality(claim_id, event_id)` accepts:

- `claim_id`: an existing SLAIV claim in `AWAITING_FINALITY`;
- `event_id`: a 32-byte hexadecimal GenLayer transaction hash.

The caller does **not** submit a source URL, a trusted `PROTOCOL_FACT`, `FINAL` flag, validator, network, incident class, timestamp, eligibility, loss, or payout. Earlier revisions of this contract accepted a caller-supplied `reference` explorer URL; that parameter has been removed. SLAIV now resolves the official source itself from the policy's `subject_network`, so a caller can no longer influence which source is queried at all.

## Official source resolution

The contract maps each network to the documented, standard `eth_getTransactionByHash` JSON-RPC method on GenLayer's own node infrastructure:

| Network | RPC endpoint | Status |
|---|---|---|
| `studionet` | `https://studio.genlayer.com/api` | Verified: confirmed `eth_getTransactionByHash` returns GenLayer's enriched consensus/timeout fields (`status`, `consensus_data`, `leader_timeout_validators`, `appeal_leader_timeout`, `appeal_validators_timeout`, `appeal_failed`, `timestamp_awaiting_finalization`), identical to the explorer's own internal data. Only `leader_timeout_validators` is used for settlement -- see "Unsupported: MISSED_APPEAL_WINDOW" below for why the appeal-timeout fields are read but never trusted for classification. |
| `testnetAsimov` | `https://rpc-asimov.genlayer.com` | **Not verified.** The RPC URL is real (from GenLayer's own published `genlayer-js` SDK chain config) and responds to `eth_getTransactionByHash`, but this codebase has not confirmed a real Asimov transaction returns the same enriched consensus fields Studio's node does — the one sample checked returned only a bare hash with every consensus field null. `verify_protocol_finality` **fails closed** for this network (`"network verification source not available"`) rather than assume the shape matches. |
| `testnetBradbury` | `https://rpc-bradbury.genlayer.com` | **Not verified**, same reasoning as Asimov. Fails closed. |

Policies may still be created for all three networks in `SUBJECT_NETWORKS` (a policyholder can insure against an Asimov or Bradbury validator today), but claims against those policies cannot currently reach `UNDER_REVIEW` until the RPC response shape for that network is confirmed and added to `RPC_ENDPOINTS`.

## Consensus verification

Inside the Intelligent Contract:

1. deterministic checks reject a malformed `event_id`, a network without a verified RPC mapping, and replayed events (see Replay scope below);
2. the GenLayer leader POSTs a `eth_getTransactionByHash` JSON-RPC request to the network's official RPC endpoint via `gl.nondet.web.post` and parses the response as JSON;
3. the leader deterministically derives settlement facts from that response's structured fields — no LLM is involved in this step. Specifically:
   - `event_final` is `true` only when `status == "FINALIZED"`;
   - `incident_class` is `MISSED_EXECUTION_WINDOW` only when the policy's specific validator address appears in `leader_timeout_validators`;
   - any other combination yields incident_class `""`, which is rejected (not the one supported class) — this is a deliberate fail-closed default, not an inferred guess;
   - `rotation_count > 0` alone, and `appeal_failed > 0` alone, are never sufficient to establish an incident: rotation can be caused by validator disagreement rather than a timeout, and a failed appeal can simply mean the appellant lost on the merits;
4. validators independently re-run the same RPC request and independently derive the same fields;
5. validator address, network, transaction hash, incident class, event timestamp, and finality must agree exactly between leader and validator, and the transaction hash returned by the RPC must match the requested `event_id`;
6. deterministic checks additionally bind the result to the policy's validator and coverage window;
7. only then does the contract construct and store a `PROTOCOL_FACT`, mark it `verified_by=GENLAYER_CONSENSUS`, consume the event against replay, and move the claim to `UNDER_REVIEW`.

If the RPC is unavailable, returns a JSON-RPC error object, returns a null/missing transaction, or the transaction's fields are ambiguous or mismatched, state does not advance and `AWAITING_FINALITY` is preserved.

## Browser

While a claim is `AWAITING_FINALITY`, any connected wallet sees **Verify protocol event**. The form asks only for the GenLayer transaction hash. This is deliberately permissionless: the transaction sender pays to trigger verification but does not determine the result, and no longer supplies a source URL at all.

## CLI

Any configured funded GenLayer wallet may submit the same candidate:

```bash
npm run verify:finality -- --claim-id clm_example --event-id 0x<64-hex transaction hash>
```

A dry run validates only candidate shape and routing (including whether the policy's network has a verified RPC mapping); it does not claim the source is verified:

```bash
npm run verify:finality -- --claim-id clm_example --event-id 0x<64-hex> --dry-run
```

## Unsupported: MISSED_APPEAL_WINDOW

Earlier revisions of this contract also supported `MISSED_APPEAL_WINDOW`, classified when `appeal_leader_timeout` or `appeal_validators_timeout` was `true`. A live-transaction audit found that neither field is validator-scoped: `eth_getTransactionByHash` exposes them only as transaction-wide booleans, with no equivalent to `leader_timeout_validators` naming which validator's appeal round actually timed out. GenLayer's own consensus/fee-accounting model (each round has an explicit `leader` and per-validator votes, and a `LEADER_TIMEOUT` vote is tied to that round's specific leader address) confirms the underlying protocol *does* attribute these timeouts to individual validators -- but that attribution is not exposed in the public RPC response SLAIV queries, only a same-round snapshot (`last_round`) with no proof it corresponds to the round where any given timeout boolean was set. Accepting the bare booleans would let an appeal timeout on an unrelated validator settle a claim against a policy insuring a different one. Rather than ship that gap, `MISSED_APPEAL_WINDOW` was removed from `EVENTS` entirely; policies can no longer be created advertising coverage for it, and the contract never classifies an incident that way. See `docs/DEPLOYMENT.md` for the deployment this was found on and superseded.

## Network boundary and replay scope

A policy's `subject_network` is immutable, and only networks with a verified RPC mapping (currently `studionet` only) can reach `UNDER_REVIEW`. Replay protection is scoped **per policy**, not globally: `consumed_protocol_events` is keyed by `policy_id + network + validator + event_id`, so the same genuine slash event can legitimately settle independent claims on two different policies that both cover the affected validator, while a single policy cannot reuse the same event across two of its own claims.

## Live-test caveat

Permissionlessness does not mean fabricating events. A positive live path still requires an actual official GenLayer transaction whose RPC record genuinely names the policy's validator in `leader_timeout_validators`. As of this writing, **no genuine live Studionet transaction exhibiting that condition has been captured or reproduced** — sampling roughly 1,000 real Studionet transactions via the RPC found none. Direct Mode tests instead mirror the real RPC schema (confirmed field names and value shapes) with synthetic values in that field. Until a real example is captured, treat the "valid incident" path as schema-verified but not yet incident-verified end-to-end against a live event.

The negative (non-incident) path, in contrast, **has** been live-verified end-to-end: a signed `verify_protocol_finality` call reached `gl.nondet.web.post()`, queried the official Studionet RPC for a real finalized transaction, and every consensus node independently derived `incident_class: ""` and correctly raised `protocol finality not verified`, leaving the claim at `AWAITING_FINALITY`. See `docs/DEPLOYMENT.md`, "verify_protocol_finality live RPC path: verified".
