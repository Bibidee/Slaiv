# SLAIV permissionless reviewer testing

This guide describes the current v3 flow, live at Studionet contract `0x283ae69159d7eE8b2c05981139cF493d8fD730D8` (see `docs/DEPLOYMENT.md` for the full deployment record and live-transaction proof).

## Core invariant

**Triggering an action does not determine its outcome.** Any wallet may pay to trigger source verification, GenLayer judgment, appeal judgment, and eligible finalization. Settlement-critical facts and decisions come from GenLayer consensus plus deterministic contract checks.

Identity-bound choices remain owner-specific: a wallet can create its own policy, the policy holder files its own claim, claimant assertions are attributed to the claimant, and only the claimant may initiate an appeal.

## Browser flow

1. Connect any supported injected wallet on Studionet.
2. Create a policy for a real Studionet validator.
3. File a claim as the policy holder.
4. Optionally add claimant evidence.
5. While the claim is `AWAITING_FINALITY`, connect **any** funded wallet. Open **Verify protocol event** and provide only the GenLayer transaction hash (`0x` + 64 hex) -- there is no source URL field; SLAIV resolves the official RPC endpoint for the policy's network itself.
6. Sign `verify_protocol_finality`. The caller does not provide `FINAL`, the validator address, network, event class, or event timestamp. The contract queries the official GenLayer node RPC (`eth_getTransactionByHash`) for the policy's network inside GenLayer execution; leader and validators independently re-query it and deterministically derive and compare those fields from its structured response.
7. If verification succeeds, the claim becomes `UNDER_REVIEW` and a contract-generated `PROTOCOL_FACT` is stored with `verified_by=GENLAYER_CONSENSUS`.
8. Connect any wallet and trigger **Run GenLayer judgment**.
9. If the result is `DENIED`, `PARTIALLY_APPROVED`, or `UNRESOLVED`, only the claimant may choose to appeal during the one-hour appeal window. Any wallet may trigger the appeal judgment after an appeal exists.
10. Finalization is permissionless when it cannot erase a live appeal right: `APPROVED` may finalize immediately; a resolved appeal may finalize immediately; `DENIED`/`PARTIALLY_APPROVED` may be finalized by the claimant as a waiver or by anyone after the appeal window expires.

## Fail-closed tests

Reviewers should deliberately try incorrect candidates. The contract should remain `AWAITING_FINALITY` when:

- the event ID is not a 32-byte hex identifier;
- the policy's network has no verified official RPC mapping (currently only `studionet`);
- the RPC is unavailable, returns a JSON-RPC error, or returns a null/missing transaction;
- the returned transaction hash does not match the candidate, or the source does not prove finality;
- validator, network, event ID, or coverage timestamp do not match;
- the incident signal is ambiguous (e.g. a leader rotation with no validator named in `leader_timeout_validators`, or a failed appeal with no timeout flag set) -- classification is deterministic and never guesses;
- independent GenLayer validators derive different settlement-critical fields from their own re-query;
- the same protocol event was already consumed by the same policy (a different policy covering the same validator may still use it).

Likewise, judgment cannot run without a consensus-verified `PROTOCOL_FACT`, and a caller cannot pass an eligibility or payout as an argument.

## Direct Mode

```bash
pytest tests/direct -v
```

The direct suite mocks web and LLM nondeterminism to test permissionless triggering, source mismatch rejection, validator disagreement, event replay protection, permissionless judgment, claimant-only appeal initiation, permissionless appeal review, appeal-window protection, and deterministic payout finalization.

## Frontend checks

```bash
npm install
npm test
npm run lint
npm run typecheck
npm run build
```

The frontend tests assert that the browser submits only a candidate transaction hash (no source URL), does not expose the removed authority path, and maps permissionless actions without granting another wallet the claimant's identity-bound rights.

## CLI trigger

Any configured funded wallet may submit a candidate:

```bash
npm run verify:finality -- --claim-id clm_... --event-id 0x<64-hex>
```

This command is not an oracle and does not certify the event. It submits the candidate to `verify_protocol_finality`; GenLayer consensus is the verifier.

## Live positive-path limitation

A real positive live test requires an actual official GenLayer transaction whose RPC record (`leader_timeout_validators` or `appeal_leader_timeout`/`appeal_validators_timeout`) genuinely names the selected validator. **As of this writing, no such live Studionet transaction has been captured or reproduced** -- roughly 1,000 real transactions were sampled via the official RPC and none exhibited either condition (see `docs/PROTOCOL_ADAPTER.md`). If no such event exists for the selected validator, the correct result is to remain `AWAITING_FINALITY`, not to fabricate one.
