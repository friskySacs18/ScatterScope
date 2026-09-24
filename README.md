# Scope

Scope's main page resolves Pump usernames, profile links, join links, and wallet addresses. The browser checks selected callers every eight seconds while the page is visible. A signed `/api/automation/monitor-tick` endpoint and `scripts/pump-monitor.mjs` can observe saved account callers on an external always-on host; that host is not deployed. A separate `/launch-research` page studies observed launches. **Automatic callout trading is disabled.** The execution interlock rejects canary requests and never signs an unattended order.

`/account` uses Privy authentication and gives each signed-in user a Solana wallet for receiving SOL. Its withdrawal and manual Pump trade flows require the user's Privy approval; neither has been verified with a funded end-to-end transaction. `/portfolio` offers direct Phantom with per-trade approval. Both manual paths use PumpPortal's Local API and Solana RPC; they do not implement automated exits. The public RPC may rate-limit requests; set a dedicated `SOLANA_RPC_URL` before broad release.

Users can edit three market-cap ranges and SOL spends, two profit targets, and a stop loss without preset strategy amounts. Account drafts authenticate with Privy's public verification key, fetched from authenticated app settings using the existing app credential and cached; an optional `PRIVY_ACCESS_TOKEN_VERIFICATION_KEY` overrides it. The first-call and one-purchase rules fail closed when caller history or a current USD market-cap quote is unavailable. The monitor records observations, but does not place orders; wallet consent, an order service, reconciliation, and a funded canary are still missing. Do not advertise unattended trades or log-off monitoring as live.

The original project and repository name is ScatterScope. The product name is Scope.

## Current evidence

- 505 launches and 17,231 observed trades in the stored campaign.
- 5,616 Generation 2 and 3 policies explored in total: 4,320 curated systems and 1,296 acceleration and pullback systems.
- No candidate has earned approval for live capital. The displayed rankings are research results, not a profitable trading claim.
- The forward sample uses frozen candidate parameters. Paper fills and adverse cost assumptions remain simulations and do not establish executable profit.
- Three public Callout pages were spot-checked; their displayed caller positions are not delayed follower returns. No caller has been verified as consistently yielding 50% follower gains.
- Caller setup and research are free. Token burn access is planned for after launch, not enforced during prelaunch. No complete caller history, automatic buy/sell route, continuously hosted monitor, or funded end-to-end transaction has been verified. Paper replay stake ceilings are unrelated to user-configured copy-trade amounts.

## Run and verify

```sh
npm ci
npm run build
npm run validate
```

The Worker lives in `worker/index.js`. The build embeds optical assets and the shader into `dist/server/index.js`. Database schema and migrations are in `db/` and `drizzle/`. `research/latest.json` contains a stored test snapshot; the Site's database supplies the live campaign state.

Production has a D1 binding, PumpPortal credential, Privy app credential, and restricted signer policy. The container recipe in `monitor/` prepares a continuously hosted eight-second observer but requires a permanent host, matching `SCOPE_MONITOR_SECRET`, and a publicly reachable Site. It still needs a reliable Solana RPC, complete caller history and USD quote sources, consent and guarded execution with reconciliation. Never commit an API key, wallet seed, or private key. The autonomous route remains hard locked.
