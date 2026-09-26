# Scope order service — implementation and remaining integration

## Current release: executor-foundation-v5

Live trading is **not yet enabled or verified**. This update implements a private order pipeline, not a completed production integration.

Implemented and locally tested:

- Service-authenticated `/orders/buy` and `/orders/sell` accept only an account ID and signal ID. Request-supplied evidence or transaction bytes are rejected.
- A required private `ORDER_CONTEXT` service binding provides account ownership, saved rules, explicit consent, complete caller history and current market-cap evidence. **This binding and provider are not configured or implemented in the deployed system yet.** Do not substitute unverified browser or feed fields.
- One account Durable Object serializes jobs. Mint/signal deduplication and daily budgets are persisted. An unresolved transaction blocks further orders from spending the same balance.
- Official Pump SDK unsigned SOL-curve buy and full-position sell preparation, expected instructions, budget, balance, rent and simulation checks.
- A Privy signing adapter rechecks the user's exact embedded wallet ID and address and the live delegated signer/policy attachment. It signs without broadcasting. Its integration with actual credentials and wallet consent has **not** been verified.
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
| `PRIVY_APP_SECRET` | Scope's existing Privy app secret. |
| `SCOPE_PRIVY_SIGNER_PRIVATE_KEY_PEM` | Existing authorization private key for the registered signer; not the user's Solana seed phrase. |
| `SCOPE_PRIVY_SIGNER_QUORUM_ID` | Registered signer quorum ID. |
| `SCOPE_PRIVY_POLICY_ID` | Independently reviewed policy ID that the user explicitly delegates. |
| `SCOPE_EXECUTION_ENABLED` | Defaults off. Must remain off until context, policy, authority and actual transaction checks pass. |
| `SCOPE_ORDER_KILL_SWITCH` | Defaults on; only the literal `false` permits admission when the other prerequisites pass. |

`ACCOUNT_ORDERS` is created by the checked-in Wrangler configuration. `ORDER_CONTEXT` must be a separately deployed private service binding. No public URL fallback exists.

### Required context contract

A context provider receives `POST /buy` or `POST /sell` with `{accountId,signalId}`. It must authenticate its source records and return `{allowed:true,accountId,signalId,walletId,revision,evidence}` only after independently verifying them. `revision` must change whenever rules, wallet consent, policy approval or account controls change. Evidence fields follow `order-controls.js` and `reserveFullSell` in `order-journal.js`. The order service re-fetches context and checks the block height before signing. The provider must not claim `historyComplete` from an incomplete global feed.

Current operational blockers: no context provider connecting the website database to this Worker; Cloudflare signer credentials and policy ownership not verified; wallet delegation not granted; caller history incomplete; no actual funded buy and sell verified. A deployment success cannot clear these blockers.

## Earlier design notes (historical)

### Original migration notes

**Release state: locked.** `order-controls.js` and `order-journal.js` are tested building blocks, not a deployed executor. `worker.js` and `wrangler.jsonc` provide a separately named, deployable bootstrap with per-account Durable Object namespace. Every buy, sell, reconcile and `/canary` route returns 423; it has no route that signs or broadcasts a transaction. The existing `scope-background-monitor` must keep its monitor-only secrets and must never receive wallet authority.

`POST /canary/prepare` is an operator-authenticated read-only preflight. Set `CANARY_PREPARE_TOKEN` (a distinct random secret of at least 32 characters) and `RPC_URL` (an approved production HTTPS Solana RPC, currently a public Solana endpoint or `https://mainnet.helius-rpc.com/?api-key=<key>`) as **runtime secrets on the order Worker**, never as GitHub build variables or monitor secrets. It accepts only `{"wallet":"<Solana address>","mint":"<Solana address>"}` with `Authorization: Bearer <token>`. It requests live chain state, checks balance and the 0.002 SOL maximum, builds an *unsigned* Pump buy and simulates it. It does not establish wallet consent or execute a transaction. Do not paste the token, RPC credential, or transaction into a chat. The operator must select a real SOL-paired Pump mint, and a successful response does not enable `/orders/buy`.

For a mobile check, `GET /canary/ui` serves a minimal form on the order Worker's own origin. The operator types the token locally; the page sends it only to `/canary/prepare` and clears the token field. It displays the spend cap, raw token quantity, and simulation units without displaying transaction bytes. A passing simulation is a prerequisite only, never evidence of a completed or authorized trade.

`inspect-pump-v2.js` is a further offline prerequisite: it rejects wrong signer/mint/amount/limit and unexpected instructions for SOL-paired Pump `buy_v2` and `sell_v2`. A buy can now include one idempotent token-account creation, limited to the same wallet, mint and token program; a sell cannot create one. It passes an offline official SDK `buy_v2` fixture; no live-chain builder output has been checked. It does not prove on-chain fee recipients, curve state, current quotes, token account ownership, simulation or wallet delegation. The sell journal now reserves one full-balance exit only after a finalized buy. Neither module is called by the locked HTTP routes.

`pump-canary-build.js` stages an owner-approved 0.002 SOL manual buy using the official Pump SDK. It checks the on-chain SOL quote mint, token program, curve state, wallet balance, conservative token-account rent, user-volume-accumulator rent, additional account-rent allowance, reserve, raw instruction maximum, serialized transaction shape and an unsigned RPC simulation. Even a 0.002 SOL buy can need substantially more than 0.002 SOL in available balance because the first transaction may create accounts. Its SDK instruction shape was tested offline; **no real mint quote, public RPC simulation, Privy signature, submission, or reconciliation has passed**. It is not connected to an HTTP route. The operator must independently verify fee recipient accounts, exact rent and live RPC quote/simulation before connecting it to a signed endpoint. `package.json` declares its dependencies.

The owner selected **first call only**. `history-backfill.js` reads the documented FomoScan wallet pages and rejects malformed pages, duplicates, cursor loops and incomplete pagination. Its result says `paginationExhausted`, deliberately not `historyComplete`: the provider's archive start and coverage must be independently verified before any `caller_mint_history.history_complete` flag is changed. The API requires a separate key and charges 10 credits per wallet page. Nothing in this repository requests a key or spends credits during local tests.

## Production topology

1. Host the full account website and state on a separate Cloudflare Worker and Cloudflare-owned D1 database. ChatGPT Sites is not the production financial-transaction host. Preserve Privy auth subjects and wallet IDs when migrating the existing account data; verify each account's readback and do not merge an email identity with a Phantom identity by wallet-name guess.
2. Deploy an independently named order Worker. Use a service binding to a monitor/observation service, plus a separate account database or Durable Object per account. Never accept a browser's `ownerVerified`, `consentVerified`, quote, balance, callout, instruction or simulation booleans as evidence. The service fetches and verifies all of these itself.
3. Require explicit account-specific delegated wallet consent and a revocation path. Keep the signing authorization key in the order Worker's secrets only; never put it in the public Site or monitor. Confirm that the live Privy wallet policy allows precisely the intended sign method, program and value limits.
4. Verify a fresh Pump Callout from an authorized, capacity-supported feed. Reject missing history, an old feed, duplicate mint, a stale USD market-cap quote, price/slippage outside the saved rule, or insufficient SOL for trade, rent and fees.
5. Build current `buy_v2` / `sell_v2` transactions for the correct SOL-paired mint and token program. Validate every account, PDA, instruction, signer, mint, SOL maximum or minimum output, fees, recent blockhash and transaction bytes independently of the builder; simulate through a production RPC. The older structural buy inspector in the Site is not sufficient.
6. Reserve a single buy and the daily budget atomically in the account's Durable Object. `beginSigning` persists uncertainty before a signing request; a timeout cannot cause another signing attempt for that signal or mint. Keep the exact signed bytes and signature, reconcile with finalized chain evidence, and allow a sell only against a proven settled token balance. Do not automatically release an uncertain lock.
7. Test and alert on feed 429/staleness, RPC disagreement, provider timeout, transaction expiration, duplicate webhook/alarm, concurrent accounts, out-of-budget attempts, kill-switch toggles and signer revocation. Stage with synthetic accounts, then request a specifically authorized small funded buy and sell canary. The user has not authorized an arbitrary transaction.

Cloudflare needs a *second* Worker and database to host execution. The current GitHub-connected background monitor remains separate. No key, DB ID or deployment setting should be copied from the monitor for wallet signing. Sources: https://docs.privy.io/api-reference/wallets/solana/sign-transaction , https://github.com/pump-fun/pump-public-docs/blob/main/docs/instructions/BUY.md , https://github.com/pump-fun/pump-public-docs/blob/main/docs/instructions/SELL.md , https://developers.cloudflare.com/durable-objects/api/alarms/ .

Local checks: `node scripts/test-cloudflare-order-controls.mjs`, `node scripts/test-cloudflare-order-journal.mjs`, `node execution/cloudflare/test-inspect-pump-v2.mjs`, `node execution/cloudflare/test-history-backfill.mjs`, and `node execution/cloudflare/test-executor-preflight.mjs`.

