# Slaiv

Slaiv is a GenLayer-native, evidence-driven slashing coverage adjudication MVP. Native protocol evidence establishes an event, immutable policy terms establish coverage, GenLayer judges ambiguous evidence, and deterministic code produces a payout instruction.

## What it is not

Slaiv is not insurance, a promise of reimbursement, a validator slashing mechanism, a generic uptime monitor, or a centralized oracle. The browser begins in **DEMO / FIXTURE MODE** and enables writes only after it can read the configured contract on the selected network.

## Architecture and boundary

See [architecture](docs/ARCHITECTURE.md). The contract’s non-deterministic review must produce structured eligibility and `eligible_loss`; deterministic integer arithmetic then applies `eligible_loss - floor(eligible_loss * deductible_bps / 10000)`, capped by coverage limit. The UI never authoritatively calculates from documented loss.

## Contract API

`contracts/SlaivClaims.py` exposes policy, claim, claimant-evidence, adapter-finality, review, appeal, finalization and read methods. It uses GenLayer’s Equivalence Principle boundary for review and does not transfer arbitrary value from free-form text.

## Provenance and finality

Claimants may add only `CLAIMANT_ASSERTION` evidence. Only the narrowly scoped `protocol_authority` adapter role can append a normalized `PROTOCOL_FACT` and move a claim from `AWAITING_FINALITY` to `UNDER_REVIEW`; it cannot adjudicate or set payout. The adapter must independently fetch and retain the referenced authoritative record before sending that transaction. Underlying slash finality is distinct from GenLayer transaction finality; pending underlying finality blocks review and payout. “Commitment” fields are correlation labels, not cryptographic proof claims.

The operator workflow, required source schema, allowlist and authority rotation are documented in [the protocol adapter guide](docs/PROTOCOL_ADAPTER.md).

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
wsl bash -lc 'cd /home/imani/slaivdirect && .venv/bin/python -m pytest tests/direct -v'
npm run dev
```

Configure only public deployment values in `.env` based on `.env.example`. The project intentionally has no hosted CI workflow; run the validation commands locally before release.

## Deployment limitation

Current Studionet release deployment: `0xE61E6F3544c4e7ae3842C0c2b8A3BF61121fE4B3` (transaction `0x5db1cffd6985e5d286650d5c643745d767163e0331f273b090e4eab1e93515d5`). It was read back successfully after Direct Mode passed on Linux; see [deployment record](docs/DEPLOYMENT.md). Rotate the protocol authority to a separate secured wallet before submitting real finality evidence.
