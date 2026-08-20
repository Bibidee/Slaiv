# Operations checklist

1. There is no protocol-authority keystore in the permissionless release. Do not create or distribute a privileged finality key.
2. Anyone testing protocol finality should use an ordinary funded GenLayer wallet and submit only a candidate event ID plus its official explorer record.
3. Use `npm run verify:finality -- --claim-id ... --event-id ... --dry-run` to validate candidate shape/routing. A dry run does **not** certify finality.
4. Submit the candidate without `--dry-run` only when the referenced official record is genuine. GenLayer consensus, not the submitter, decides whether it proves the required protocol fact.
5. Record transaction hashes for candidate verification, judgment, appeal judgment, and finalization so reviewers can reproduce the lifecycle.
6. Before a release, run frontend tests/lint/typecheck/build, Direct Mode contract tests, GenVM lint/schema validation, source matching, and preflight.
7. Deploy the new contract before updating the public frontend contract address. Never point the permissionless frontend at the historical authority-gated contract.
8. After deployment, run a fresh live fail-closed test and, only if a genuine official protocol event exists, a positive end-to-end lifecycle.

Permissionless triggering does not remove claimant identity boundaries or deterministic settlement rules. The caller may trigger work but cannot set finality, eligibility, eligible loss, or payout.
