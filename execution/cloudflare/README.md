# Scope order service — implementation and remaining integration

## Current release: executor-foundation-v6

Live trading is **not yet enabled or verified**. This update implements a private order pipeline, not a completed production integration.

Implemented and locally tested:

- Service-authenticated `/orders/buy` and `/orders/sell` accept only an account ID and signal ID. Request-supplied evidence or transaction bytes are rejected.
- Context can use a private `ORDER_CONTEXT` binding or a credential shared with Scope's fixed HTTPS account endpoint. The website's private lookup now reads the live account, saved callers, observed call and first-call history, but deliberately refuses admission while account permission, complete history and USD quote verification remain absent.
- One account Durable Object serializes jobs. Mint/signal deduplication and daily budgets are persisted. An unresolved transaction blocks further orders from spending the same balance.
- Official Pump SDK unsigned SOL-curve buy and full-position sell preparation, expected instructions, budget, balance, rent and simulation checks.
- A Privy signing adapter rechecks the user's exact embedded wallet ID and address, the live delegated signer and the live two-rule policy for the exact `signTransaction` method. Existing `signAndSendTransaction` policies fail closed and require owner review/update in Privy. It signs without broadcasting. Its integration with actual credentials and wallet consent has **not** been verified.
- A verified wallet signature must cover exactly the prepared message. Signed bytes and signature are durably stored before RPC submission.
- Finalized transaction receipts must match the recorded bytes and expected token/SOL changes before a buy can support a sell. Unknown outcomes stay locked; alarms perform reconciliation without rebuilding or re-signing.
- `/status` reports missing/invalid configuration by name, never secret values. Missing or invalid `CANARY_PREPARE_TOKEN` now returns an explicit configuration error instead of blaming the token typed into the checker.

`npm test` runs the meaningful regression suite, including a 200-request duplicate-order burst with synthetic wallets and mocked external services. This is **not** a production login capacity test or a live buy/sell test. `npm run check:deploy` validates the Cloudflare bundle.

## Runtime configuration

Use the order Worker's runtime **Settings → Variables and Secrets**, not its build variables. Never put private keys or app secrets into source control or chat.

| Name | Purpose |
| --- | --- |
| `RPC_URL` | Approved HTTPS Solana mainnet RPC. Already present in the last live check. |
| `CANARY_PREPARE_TOKEN` | Optional operator-only unsigned checker/reconciliation credential, 32–256 printable non-space characters. Not a wallet key, Helius API key or Cloudflare build token. |
| `ORDER_SERVICE_TOKEN` | Separate server-to-server order admission credential, 32–256 printable non-space characters. Never expose in the website bundle. |
| `ORDER_CONTEXT_TOKEN` | Separate matching 32–256 character runtime secret on **both** Scope's Site and the order Worker. It authenticates the fixed server-to-server account lookup. Never put it in a browser or GitHub build variable. |
| `PRIVY_APP_SECRET` | Scope's existing Privy app secret. |
| `SCOPE_PRIVY_SIGNER_PRIVATE_KEY_PEM` | Existing authorization private key for the registered signer; not the user's Solana seed phrase. |
| `SCOPE_PRIVY_SIGNER_QUORUM_ID` | Registered signer quorum ID. |
| `SCOPE_PRIVY_POLICY_ID` | Scope policy ID; its live rules must explicitly allow the signing method used by the order service. |
| `SCOPE_EXECUTION_ENABLED` | Defaults off. Must remain off until context, policy, authority and actual transaction checks pass. |
| `SCOPE_ORDER_KILL_SWITCH` | Defaults on; only the literal `false` permits admission when the other prerequisites pass. |

`ACCOUNT_ORDERS` is created by Wrangler. `ORDER_CONTEXT` may be a separately deployed private binding. Alternatively `ORDER_CONTEXT_TOKEN` uses only the compiled-in `https://scopetrade.live/api/automation/order-context` origin and returns no account details until the backend verifies all trading controls. Untrusted context URLs and browser-provided evidence are never accepted.

### Required context contract

A context provider receives `POST /buy` or `POST /sell` with `{accountId,signalId}`. It must authenticate its source records and return `{allowed:true,accountId,signalId,walletId,revision,evidence}` only after independently verifying them. `revision` must change whenever rules, wallet consent, policy approval or account controls change. Evidence fields follow `order-controls.js` and `reserveFullSell` in `order-journal.js`. The order service re-fetches context and checks the block height before signing. The provider must not claim `historyComplete` from an incomplete global feed.

Current operational blockers: the shared server credential is not installed; the Scope context provider correctly denies orders because wallet consent and USD quotes are not verified; Cloudflare signer credentials and policy ownership are not verified; wallet delegation is not granted; caller history is incomplete; and no funded buy and sell have been verified. A deployment success cannot clear these blockers.


The current site policy check previously accepted `signAndSendTransaction`, whereas the new executor calls `signTransaction` to persist the signed bytes before broadcast. Both services now reject that mismatch. Review and update the policy in Privy before requesting wallet delegation. Changing the policy or copying signer credentials alone does not enable trading; fresh source history, user consent, quote validation and a funded canary remain pending.
