# SLAIV permissionless reviewer testing

This guide describes the intended v3 flow. Until a new v3 contract is deployed and the frontend address is updated, the historical production deployment still implements the previous authority-gated design.

## Core invariant

**Triggering an action does not determine its outcome.** Any wallet may pay to trigger source verification, GenLayer judgment, appeal judgment, and eligible finalization. Settlement-critical facts and decisions come from GenLayer consensus plus deterministic contract checks.

Identity-bound choices remain owner-specific: a wallet can create its own policy, the policy holder files its own claim, claimant assertions are attributed to the claimant, and only the claimant may initiate an appeal.

## Browser flow

1. Connect any supported injected wallet on Studionet.
2. Create a policy for a real Studionet validator.
3. File a claim as the policy holder.
4. Optionally add claimant evidence.
5. While the claim is `AWAITING_FINALITY`, connect **any** funded wallet. Open **Verify protocol event** and provide:
   - the official GenLayer event/transaction ID (`0x` + 64 hex), and
   - the matching official GenLayer explorer URL.
6. Sign `verify_protocol_finality`. The caller does not provide `FINAL`, the validator address, network, event class, or event timestamp. The contract fetches the official source inside GenLayer execution; leader and validators independently derive and compare those fields.
7. If verification succeeds, the claim becomes `UNDER_REVIEW` and a contract-generated `PROTOCOL_FACT` is stored with `verified_by=GENLAYER_CONSENSUS`.
8. Connect any wallet and trigger **Run GenLayer judgment**.
9. If the result is `DENIED`, `PARTIALLY_APPROVED`, or `UNRESOLVED`, only the claimant may choose to appeal during the one-hour appeal window. Any wallet may trigger the appeal judgment after an appeal exists.
10. Finalization is permissionless when it cannot erase a live appeal right: `APPROVED` may finalize immediately; a resolved appeal may finalize immediately; `DENIED`/`PARTIALLY_APPROVED` may be finalized by the claimant as a waiver or by anyone after the appeal window expires.

## Fail-closed tests

Reviewers should deliberately try incorrect candidates. The contract should remain `AWAITING_FINALITY` when:

- the event ID is not a 32-byte hex identifier;
- the URL is not the official explorer for the policy's network;
- the source does not prove finality;
- validator, network, event ID, or coverage timestamp do not match;
- independent GenLayer validators derive different settlement-critical fields;
- the same protocol event was already consumed by another claim.

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

The frontend tests assert that the browser submits only a candidate event ID/reference, does not expose the removed authority path, and maps permissionless actions without granting another wallet the claimant's identity-bound rights.

## CLI trigger

Any configured funded wallet may submit a candidate:

```bash
npm run verify:finality -- --claim-id clm_... --event-id 0x<64-hex>
```

This command is not an oracle and does not certify the event. It submits the candidate to `verify_protocol_finality`; GenLayer consensus is the verifier.

## Live positive-path limitation

A real positive live test requires an actual official GenLayer protocol event whose explorer record exposes enough stable information for independent validators to prove the event. If no such event exists for the selected validator, the correct result is to remain `AWAITING_FINALITY`, not to fabricate one.
