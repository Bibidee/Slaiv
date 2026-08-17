# Operations checklist

1. Back up the encrypted `slaiv-protocol-authority` keystore and store its password separately. Never share either.
2. Keep `slaiv-protocol-authority` as the active CLI account only while operating the adapter; lock it when finished with `genlayer account lock`.
3. Run the adapter with `--dry-run` first, inspect the generated evidence hash and exact event ID, then rerun without `--dry-run`.
4. Record the transaction hash and retain the official validator-history output alongside the claim evidence.
5. Before every release run frontend lint/typecheck/tests/build, GenVM validation, and WSL Direct Mode tests.

The current authority is limited to finality evidence. It cannot create policies, adjudicate a claim, or set a payout.
