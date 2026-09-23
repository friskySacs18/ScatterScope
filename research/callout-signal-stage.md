# Pump.fun Callouts: signal stage

## Current status

The Callout paper replay is implemented at `POST /api/callouts/replay` as a research API. It accepts bounded, timestamped callout observations and token trade prints, then reports paper entries and exits at 0.002, 0.005 and 0.01 SOL and 2, 5, 10 and 20 second holds. An optional `maxEntryPriceSol` rejects later print proxies above an **absolute SOL per token ceiling**; cumulative entry stakes in each scenario stop at 0.5 SOL. Synthetic checks verify no entry before observed detection plus 350 ms, no invented exit, limit misses, budget skips, stressed fees and an engaged live-capital lock. The public Caller Field lets a visitor choose profiles and stores those choices in their own browser; it does not invoke this replay or monitor Pump.fun. No real Pump.fun Callout has been ingested. The research API does not verify a caller or mint, place a resting limit order, or send a transaction.

Three user-supplied Pump share links were resolved in a browser to public profiles on 2026-09-23:

| Shared account | Profile ID | Research status |
| --- | --- | --- |
| TheMisterTurtle | `51aeb72f-eb24-45ec-a056-1f0ff5bbabc0` | Unmeasured |
| untaxxable | `c262a0de-4e69-4c2b-be93-85b9eef4231e` | Unmeasured |
| mitch | `b8f1ac45-55b5-4704-919a-fb7105e59dc5` | Unmeasured; profile says “do NOT copy trade me” |

These profile links do not carry a sequence of Callout publications or establish the caller's historical follower returns. No accounts have been automatically monitored. A token-specific limit cannot be placed before an unknown Callout identifies the token. After detection, a ceiling can prevent chasing; missing a fill is an acceptable outcome.

The spot-check in `research/caller-audit-2026-09-23.md` records three real public callout pages and their displayed caller positions. It is not a follower backtest. The main page now centers on caller selection; the legacy launch research, litepaper and whitepaper are at `/launch-research`.

Pump.fun documents Callouts as app content that can notify followers. Its published terms do not provide a documented developer stream. PumpPortal documents token and account **trade** subscriptions; neither is a Callout publication feed. Undocumented page endpoints and notification behavior are not an execution-quality source until their timeliness, authenticity, availability and permitted usage are established.

## Required prospective evidence

1. Select the public Pump.fun caller profile, and establish an authorized first-party source for Callout identity, exact mint, publication time and observation time. Reject edited, deleted, repeated and ambiguous calls.
2. Start collecting the call and token's trade prints *before* evaluating any strategy. Measure distribution of publication-to-detection delay, time to a fresh quote, and change in price between the call and possible entry.
3. Record executable quotes and bonding-curve state, including graduation, plus sell quotes and failure reasons. A trade print is only an activity proxy.
4. Freeze a small set of caller, entry-chase and exit rules, then test on new calls without changing them. Account separately for the caller's position and possible incentives from Callout-driven volume.
5. Only consider a tiny live canary after adequate successful and failed exits, positive net evidence after Pump bonding-curve and API fees, and completed signer isolation, spending caps, simulation and the kill switch.

## Open market research with 0.5 SOL

0.5 SOL is the maximum proposed session allocation for future evaluation, not an amount to spend or a target return. The current on-chain spending cap is zero. Compare prospective caller following with lower turnover alternatives on the same timeline: liquid SOL pair trend following, range reversion, and patient maker-limit entries where venue mechanics permit. Collect executable buy and sell quotes, fees, slippage, rejected orders and time-to-fill before choosing a venue. Lock a small rule set, evaluate net returns and drawdowns on future observations, and reject a strategy that fails after realistic costs. An attractive caller's displayed own P&L is not the return achievable by a delayed follower.

The 505-launch historical campaign did not store Callout timestamps, so its results cannot be relabeled as a Callout backtest.
