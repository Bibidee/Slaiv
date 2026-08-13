# Slaiv

Stake risk, judged in context. Slaiv is a **demo/testnet operations console** for slashing-coverage claims. It is not insurance, does not prevent or reverse native protocol slashing, and never guarantees reimbursement.

## What is implemented

- Operational dark-console UI: Overview, Validators, Monitor, Policies and Claims.
- Clearly marked demo fixtures—no simulated observation is presented as live protocol data.
- Validator search and covered-only filter.
- Claim workflow states and a three-panel claim adjudication surface.
- Provenance labels and inspection drawer: protocol fact, claimant assertion, GenLayer judgment, and demo fixture are intentionally kept separate.
- Offline adapter state rather than decorative live logs.
- Locked-policy manifest and deterministic payout display: `min(eligible_loss * (1 - deductible_bps / 10000), coverage_limit)`.

## Architecture boundary

```text
native protocol evidence -> evidence packet -> GenLayer eligibility verdict
locked policy terms + eligible loss -> deterministic payout instruction
```

The browser demo does not make a blockchain call. It is structured around the required `ProtocolAdapter` functions (`getValidatorStatus`, `getValidatorHistory`, `getSlashEvents`, `getFinalityStatus`, and `getDelegationReference`) and shows an honest offline state until an authoritative adapter is connected.

## Policy shape

```json
{
  "policy_id": "pol_001",
  "holder": "0x...",
  "validator": "0x...",
  "coverage_start": "2026-07-01T00:00:00Z",
  "coverage_end": "2026-10-01T00:00:00Z",
  "coverage_limit": "500",
  "covered_events": ["MISSED_EXECUTION_WINDOW"],
  "exclusions": ["holder-caused event", "non-final slash"],
  "deductible_bps": 500
}
```

## Run locally

```bash
npm install
npm run dev
```

Production verification:

```bash
npm run build
```

## Required production work

Before live deployment, add a GenLayer `SlaivClaims` intelligent contract, wallet authorization, canonical JSON hashing, Zod schemas, authoritative protocol adapter and finality retrieval, evidence-size/URL controls, contract and integration tests, and a real appeal submission flow. GenLayer review must return eligibility only; a deterministic contract method must calculate and finalize any payout exactly once.
