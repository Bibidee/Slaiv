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

Configure only public deployment values in `.env` based on `.env.example`. GitHub Actions runs ESLint, TypeScript compilation, unit tests and a production build on every push and pull request.

## Deployment limitation

Studionet contract deployment: `0xAe8CF653b9a2138759429440CadF2D7c30F6a048`; deployment transaction `0xfdcb5f4cee86b4721b7248e79bb79baad07e9056ab7161fef6880041313e60bd`. It was deployed with Python 3.12.10 and GenLayer CLI 0.39.2 after `genvm-lint check`, `typecheck`, and `schema` completed. The browser remains in demo mode until a public RPC URL is configured.
