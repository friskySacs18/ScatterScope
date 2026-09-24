# Scope signer policy pilot

`scope-signer-policy.json` is a proposed Privy Solana policy, owned by the Scope signer quorum. It allows the Pump bonding curve and common transaction setup programs; direct System Program transfers are limited to 0.01 SOL. Verify every program used by the actual PumpPortal transaction before registering it.

**This policy does not enforce the SOL spent inside a Pump buy instruction.** Privy's `Transfer.lamports` condition applies to direct System Program transfers, while Pump `buy` has its own `max_sol_cost`. A separate server-side decoder, user budget ledger, simulation, idempotent order service, and transaction reconciliation must enforce buy caps before the consent gate or execution is enabled. A program allowlist by itself cannot meet the spend guarantee.

After registering and testing the policy in Privy, configure its ID as `SCOPE_PRIVY_POLICY_ID` in Site secrets. `/api/automation/signer-setup` only returns the ID to the browser after checking that Privy reports the expected chain, owner, and rules. `SCOPE_DELEGATION_READY` is deliberately unset, so users cannot grant the signer yet.
