# Architecture

```text
Wallet → Frontend → SlaivClaims Intelligent Contract
                         ├─ deterministic policy/state rules
                         ├─ bounded evidence references
                         ├─ GenLayer equivalence judgment
                         └─ deterministic integer payout instruction
```

```text
authoritative protocol source → bounded extraction → leader verdict
→ independent validator verification → accepted structured verdict
→ eligible_loss → deductible/cap calculation → payout instruction
```

The browser reference engine is test-only and not an authority. `contracts/SlaivClaims.py` is the deployable-contract starting point; deployment requires the current GenLayer SDK, funded wallet and testnet configuration. The adapter fails closed when no verified authoritative endpoint is configured.
