# Scope launch readiness — 2026-09-23

## Current release

The owner-only Site serves a Caller Field, manual Phantom bonding-curve buy/sell route, Privy-owned Solana account with receive/send SOL, and a manual Privy bonding-curve buy/sell route. The account's Privy wallet requires a user signature for every transfer and trade. Server-side sniping is locked in code; the public Callout list is stored only in each browser. No user-funded deposit/withdrawal or token buy/sell has completed an end-to-end canary in this project.

| Launch dependency | State | Evidence or required step |
| --- | --- | --- |
| Privy client app | Integrated | App ID in browser account page; add Site origin to Privy allowed domains and verify a real sign-in. |
| Per-user deposit wallet | Browser flow built | Confirm wallet creation, address, balance, a small SOL in/out transfer and wallet recovery in a real session. |
| Manual token trading | Browser flow built | PumpPortal transaction builder plus RPC simulation, user approval and signature confirmation; perform funded buy *and* sell canaries. |
| Reliable Solana RPC | Missing | Site currently falls back to public mainnet RPC. Set a dedicated `SOLANA_RPC_URL` as a Site secret, monitor availability and rate limits. |
| Callout publication source | Missing | Obtain a permitted, authenticated source carrying caller identity, exact mint, publication time and first observed time. PumpPortal account trades are not Callout publications. |
| Server authentication and account registration | Missing | Verify Privy access tokens on the Worker, map subject to wallet and enforce idempotent account and order ownership in D1. |
| Protected unattended signer | Missing | Provision a server authorization key and Privy API secret as Site secrets, attach a narrowly scoped signer to each opted-in wallet and enforce program, mint and amount policies. Do not make withdrawals delegable. |
| Order execution and monitoring | Missing | Implement durable signal intake, per-user opt-in, quote checks, buy simulation, idempotent placement, confirmation, fills, positions, stop and limit evaluation, sell route, reconciliation, and a hard kill switch. |
| Token burn for sniping access | Planned | After token launch, specify the mint, required amount, burn period and proof rules. Verify finalized on-chain burn against the authenticated user's wallet. Keep manual portfolio and prelaunch research available. |
| Live capital | Locked | Require successful end-to-end canaries, failure drills, and a staged release with small caps before any user-facing automatic order switch. |

## Current data boundary

`trading_users`, `trading_accounts`, `account_deposits`, `account_withdrawals` and `account_orders` are schema groundwork; account use in the browser does not populate those tables yet. Do not treat them as an active ledger. Privy user wallets are controlled by users until they explicitly delegate a restricted signer. The App ID is public configuration and cannot authorize server signing.

## Product launch sequence

1. Configure allowed origin and dedicated RPC; test login and a small SOL transfer in both directions.
2. Perform one manual buy and sell with both Phantom and Privy accounts; capture the actual signatures and fee outcomes.
3. Secure a legitimate Callout publication source and run it in a durable shadow collector. Measure call-to-detection delays and missed calls.
4. Implement authenticated accounts and risk policies, then a signer that can only execute allowed buys/sells for opted-in wallets. Keep transfer-out under user approval.
5. Run tiny funded canaries with reconciliation, stop exits and kill switch drills. Open sniping in stages only if they pass.
6. Configure the token burn verifier after token mint and access economics are fixed; then apply it to live sniping access.
