# Callout follower audit — 2026-09-23

## Scope and result

Public Pump.fun Callout pages reveal the caller, mint and publication timestamp. Their displayed position P&L belongs to the **caller**, not to a follower who first learns of the call later. The current 505-launch tape lacks callout publication times. No tested caller can be recommended as consistently delivering +50% *follower* gains; no real delayed follower fill was measured in this audit.

The three user-provided app shares resolved to TheMisterTurtle, untaxxable and mitch. They are research subjects, not endorsed default settings. We inspected three publicly indexed TheMisterTurtle calls as a limited interface and sanity check, deliberately including a loss. This convenience sample cannot estimate a hit rate or compare callers.

| Public callout | Publication UTC | Caller position displayed on inspection | Follower outcome |
| --- | --- | --- | --- |
| [FROG](https://pump.fun/callouts/AhQhyh4jq8QnNA6ohQrDf8fyzMHsyjLTrr5CFm2Spump/46b8e3a0-f137-4b99-aa2e-3de93c3f3b30) | 2026-09-16 21:02:06.455 | +49.7%, +$145.28; closed | Not measured |
| [CHILLS](https://pump.fun/callouts/HMeTjDyqnTik6P5pEEP6FYur1QN9rsom773HALGXpump/237bf064-6c29-46e5-ab83-4de70b814d3a) | 2026-08-06 05:49:40.875 | −85.7%, −$125.41; closed | Not measured |
| [MAKEIT](https://pump.fun/callouts/68GpHP3M6VSArzpRzqX3MMV9VnLcadZhrpKENo85pump/85a30cb8-5659-4351-9979-b086801b7c5f) | 2026-08-29 21:40:45.600 | +22.1%, +$114.73; closed | Not measured |

These are observed page values at audit time and can change if Pump revises presentation. A caller position could include buys before publication and exits at different times and sizes. A public call gives an auditable claim; it does not guarantee an obtainable entry.

## Source gap

Pump documents Callouts as published posts with follower notifications. PumpPortal's documented WebSocket subscriptions cover token and account *trades*, not publication of Callouts. A reverse-engineered third-party description of an undocumented Pump callouts endpoint exists, but has no verified service contract, latency, allowed use, or availability suitable for routing customer funds. Do not turn wallet trade events into purported Callout events.

## Prospective test contract

1. Use an authorized source that preserves caller identity, immutable call ID, mint, published time and first observation time. Record every call prospectively, including deleted, edited and duplicate posts.
2. For each selected caller, capture an executable quote at detection plus realistic processing and transaction latency, with a price ceiling and expiry. Count missed or rejected entries rather than excluding them.
3. Capture sell quotes at fixed horizons and stop/target rules. Charge all venue fees, network fees, failed transactions, slippage and unresolved exits. Report return on deployed capital and on allocated 0.5 SOL separately.
4. Freeze comparison rules before collection. Require enough independent calls and complete exits for uncertainty bands and time-split results; do not pick a winner from the top of a leaderboard or this three-call spot-check.
5. Run in paper mode until the feed, signer isolation, burn entitlement, per-wallet limits, reconciliation and kill switch are independently verified. Live spending is currently zero.

## Product access

Caller setup and mock research are free. A **proposed** 25,000-token burn would be required only for future live copy trading; the amount may be explicitly revised. No token mint, burn verifier or live entitlement exists. A user should not burn anything expecting access today.
