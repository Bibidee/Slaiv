# Slaiv

Slaiv is a GenLayer-native, evidence-driven slashing coverage adjudication MVP. Native protocol evidence establishes an event, immutable policy terms establish coverage, GenLayer judges ambiguous evidence, and deterministic code produces a payout instruction.

## What it is not

Slaiv is not insurance, a promise of reimbursement, a validator slashing mechanism, a generic uptime monitor, or a centralized oracle. The current browser experience is explicitly **DEMO / FIXTURE MODE**: it has no deployed contract, connected wallet, or configured authoritative protocol endpoint.

## Architecture and boundary

See [architecture](docs/ARCHITECTURE.md). The contract’s non-deterministic review must produce structured eligibility and `eligible_loss`; deterministic integer arithmetic then applies `eligible_loss - floor(eligible_loss * deductible_bps / 10000)`, capped by coverage limit. The UI never authoritatively calculates from documented loss.

## Contract API

`contracts/SlaivClaims.py` exposes `create_policy`, `submit_claim`, `append_evidence`, `review_slashing_claim`, `record_appeal`, `finalize_claim`, and policy/claim/review/stat getters. It uses GenLayer’s Equivalence Principle boundary for review and does not transfer arbitrary value from free-form text.

## Provenance and finality

Records are labelled PROTOCOL FACT, MONITOR OBSERVATION, CLAIMANT ASSERTION, GENLAYER JUDGMENT, or DEMO FIXTURE. Fixture records never masquerade as protocol facts and contain no made-up block, transaction, hash, or retrieval timestamp. Underlying slash finality is distinct from GenLayer transaction finality; pending underlying finality blocks review and payout.

## State machine and appeals

Claims follow explicit states: DRAFT → SUBMITTED → EVIDENCE_PENDING/AWAITING_FINALITY/UNDER_REVIEW → APPROVED/PARTIALLY_APPROVED/DENIED/UNRESOLVED → APPEALED/FINAL. Appeals require the claimant and material new evidence. See [demo guide](docs/DEMO.md).

## Security

See [security boundaries](docs/SECURITY.md). Slaiv validates bounded schemas with Zod, canonicalizes structured input, enforces authorization/duplicate/transition checks in its deterministic reference engine, and uses integer units for payouts.

## Local setup and validation

```bash
npm install
npm run lint
npm run typecheck
npm test
npm run build
npm run dev
```

Configure only public deployment values in `.env` based on `.env.example`. No CI workflow is included by design.

## Deployment limitation

N/A — external blocker: this environment has no GenLayer SDK/runtime, funded deployment wallet, configured network/RPC, authoritative slashing endpoint, or deployed contract address. The repository therefore deliberately remains fail-closed and labels all UI data as fixtures.
