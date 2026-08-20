# Architecture

```text
Claimant wallet → policy / claim / claimant assertion
                         │
Any wallet ──────────────┼→ verify protocol candidate
                         │        ↓
                         │  official GenLayer source
                         │        ↓
                         │  leader + independent validators
                         │        ↓
                         │  consensus-verified PROTOCOL_FACT
                         │        ↓
Any wallet ──────────────┼→ GenLayer judgment
                         │        ↓
                         │  deterministic verdict checks
                         │        ↓
Claimant ────────────────┼→ optional appeal
                         │        ↓
Any wallet ──────────────┼→ appeal judgment / eligible finalization
                                  ↓
                         deterministic payout instruction
```

## Trigger versus authority

Permissionless means that no privileged wallet controls protocol progress. A caller may trigger work but does not supply the truth that the contract stores:

- `verify_protocol_finality` accepts only a candidate event ID and official explorer reference;
- GenLayer consensus derives validator, network, event class, event timestamp and finality from the official source;
- `review_slashing_claim` accepts only a claim ID, not an eligibility or payout;
- `review_appeal` accepts only a claim ID, not a replacement verdict;
- `finalize_claim` accepts only a claim ID and computes payout from stored state.

The deterministic contract layer enforces policy membership, network/validator binding, coverage dates, replay protection, appeal rights, settlement bounds and payout arithmetic. GenLayer nondeterministic consensus is used where external protocol evidence or semantic policy interpretation is required.

`contracts/SlaivClaims.py` is the deployable Intelligent Contract. The browser never creates a `PROTOCOL_FACT`; that record is constructed by the contract only after GenLayer consensus verifies the candidate official source.
