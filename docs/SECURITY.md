# Security boundary

SLAIV separates **who may trigger work** from **who determines truth or settlement**.

- Policy creation and claim filing are identity-bound: the policy `holder` and claim `claimant` must equal the transaction sender. Another wallet cannot create or file as someone else.
- `CLAIMANT_ASSERTION` evidence remains claimant-only because it represents the claimant's own assertion. `PUBLIC_SOURCE` evidence may be appended by any wallet while evidence is open.
- There is no protocol-authority key in the permissionless design. Any wallet may call `verify_protocol_finality`, but the caller supplies only a candidate 32-byte GenLayer event/transaction ID and matching official explorer record.
- The caller cannot pass `FINAL`, validator identity, network, incident class, or event timestamp as authoritative inputs. The Intelligent Contract fetches the official source inside a GenLayer non-deterministic block; leader and validators independently derive the settlement-critical protocol fields and must agree.
- Protocol verification fails closed when the source is unavailable, ambiguous, non-final, cross-network, bound to another validator/event, outside the policy window, or independently interpreted differently by validators.
- A verified protocol event is single-use for the same network + validator + event ID, preventing replay across claims.
- `review_slashing_claim` and `review_appeal` are permissionless triggers. The caller cannot pass a verdict. GenLayer consensus derives the verdict from immutable policy terms, claim state, and stored evidence; deterministic code revalidates settlement-critical fields before state changes.
- Appeal initiation remains claimant-only because appealing is the claimant's procedural choice. A one-hour appeal window protects denied and partially approved claims from third-party finalization. The claimant may finalize their own terminal result earlier, which acts as a voluntary waiver of that appeal window.
- Finalization is otherwise permissionless when no live appeal right is being destroyed: approved claims, claims after resolved appeal, and denied/partially-approved claims after appeal-window expiry may be finalized by any wallet.
- The finalizer cannot choose payout. Payout consumes the stored effective verdict, uses integer arithmetic, applies the policy deductible and then the coverage cap, and rejects double finalization.
- Fetched pages, public evidence, and claimant text are untrusted data, never instructions. Consensus prompts explicitly treat source content as evidence rather than instructions.
- Underlying protocol finality and GenLayer transaction finality are separate. Pending underlying finality blocks semantic judgment and payout.
- Policies are immutable after activation. Network, validator, coverage window, event membership, exclusions, deductible, and coverage limit are deterministic boundaries.
- SLAIV does not fabricate unsupported protocol events. If an official source cannot prove a candidate event, the correct state is `AWAITING_FINALITY`.
