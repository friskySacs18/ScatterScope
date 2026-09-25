# Scope: free-tier background monitor candidate

This is a separate Cloudflare Worker with one SQLite-backed Durable Object. Its alarms target a six-second interval with no browser open. A once-a-minute watchdog repairs missing alarms; it never starts a stopped monitor. Start, stop and health routes require a separate administrator token. Redirects are rejected, secrets are never placed in URLs, and no wallet key or order submission code is present.

**Status: built and tested locally; not deployed or verified on Cloudflare.** It is an observation scheduler, not a completed live trading engine. Timing is a target, not a guaranteed execution deadline.

## Account and deployment

Create a free account at https://dash.cloudflare.com/sign-up . There is no personal server to buy or administer. Use the Workers Free plan for an initial observation test, not an unverified public money launch. Do not enable a paid plan without the owner's approval.

After connecting the account, an engineer can deploy with Wrangler using `monitor/cloudflare/wrangler.jsonc`. Configure `SCOPE_MONITOR_SECRET` through Wrangler's secure secret prompt and configure the identical value as a Site secret. Configure a distinct random 32+ character `MONITOR_CONTROL_TOKEN` the same way. Never put these values in source, command arguments, logs, or chat.

```sh
npx wrangler login
npx wrangler deploy --config monitor/cloudflare/wrangler.jsonc
npx wrangler secret put SCOPE_MONITOR_SECRET --config monitor/cloudflare/wrangler.jsonc
npx wrangler secret put MONITOR_CONTROL_TOKEN --config monitor/cloudflare/wrangler.jsonc
```

Deployment is stopped by default. The cron watchdog does not activate it. An authenticated POST to `/start` schedules checks; POST `/stop` persists the stopped state; GET `/health` returns recent success/failure. Administrative clients must supply `Authorization: Bearer <control token>` securely. Never expose the control token to the public website.

## Required service access

The current Scope Site is owner-private. The external monitor cannot use the owner's browser login as service access. The current connector exposes no permanent machine-access credential. This must be resolved through a supported service-access mechanism or an explicitly approved public Site release before start. Do not make the Site public as a side effect of deploying the monitor. A public Site still requires HMAC verification on monitor ticks and Privy authentication/ownership checks on account routes. Review public research/resource endpoints before opening the Site.

## Free-tier estimate, checked 25 September 2026

For one six-second scheduler:

- 14,400 alarm invocations/day plus 1,440 watchdog calls/day and occasional administrator requests.
- About 28,800 application writes/day for the next alarm and the health record, plus platform metadata/administrative writes.
- A conservative continuously-active single-object calculation is 0.128 GB × 86,400 seconds = 11,059.2 GB-seconds/day. Actual platform accounting must be measured.

Published Durable Object free allowances are 100,000 requests/day, 13,000 GB-seconds/day and 100,000 SQLite rows written/day. These estimates suggest a **single observation scheduler could fit**, not that the full Scope app or hundreds of active users will be free. Other objects, control traffic, retries, Site database reads/writes, Pump provider traffic, wallet login and Solana RPC have separate usage. Free limits stop operations when exhausted. Alarms are at-least-once and can be delayed/retried.

Cloudflare Workers Paid currently starts at $5/month plus applicable usage. No plan was purchased or account provisioned by creating this code.

## Acceptance before relying on it

1. Validate deployment with the actual Cloudflare runtime and supported Site access.
2. Configure secrets securely, start explicitly, and close every Scope browser.
3. Observe at least 30 minutes of successful database heartbeats. Measure check interval distribution and observation latency.
4. Restart/redeploy; verify recovery, deduplication, persistent stop, provider timeout/429 behavior and stale-health alarms.
5. Measure real request, duration, CPU and storage consumption over 24 hours. Alert before free quotas are exhausted.
6. Keep trading off until complete history, quotes, budget controls, signed-transaction integrity, consent, execution and reconciliation are verified, followed by an explicitly authorized funded canary.

Local logic test: `node scripts/test-cloudflare-monitor.mjs`. The test uses mocked storage/fetch; it does not certify Cloudflare timing, quotas, availability or production behavior.

Sources:
- https://developers.cloudflare.com/durable-objects/platform/pricing/
- https://developers.cloudflare.com/durable-objects/api/alarms/
- https://developers.cloudflare.com/workers/platform/pricing/
