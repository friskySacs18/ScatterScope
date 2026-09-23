# Scope

Scope's main page lets visitors choose public Pump caller profiles for research. Choices are saved in the visitor's browser and are not yet actively monitored. A separate `/launch-research` page studies newly launched Solana tokens and compares complete entry and exit policies against observed market events. The research API can replay supplied Callout observations; no verified real-time Callout feed is connected. **Live SOL trading is disabled.** The execution interlock has no signer or transaction route and rejects canary requests.

`/portfolio` connects a Phantom wallet to read its SOL and SPL token balances through Solana RPC. The receive panel displays that wallet's own address; it is not a deposit into Scope custody. Users can save a device-local draft for spend per call, maximum entry price and stop-loss percentage. Those rules do not create orders. A Jupiter link opens an external venue for manual trades; Scope does not send signed transactions. The public RPC may rate-limit requests; a dedicated `SOLANA_RPC_URL` runtime setting can supply a private provider. Never put an RPC API token or signing key in source control.

The original project and repository name is ScatterScope. The product name is Scope.

## Current evidence

- 505 launches and 17,231 observed trades in the stored campaign.
- 5,616 Generation 2 and 3 policies explored in total: 4,320 curated systems and 1,296 acceleration and pullback systems.
- No candidate has earned approval for live capital. The displayed rankings are research results, not a profitable trading claim.
- The forward sample uses frozen candidate parameters. Paper fills and adverse cost assumptions remain simulations and do not establish executable profit.
- Three public Callout pages were spot-checked; their displayed caller positions are not delayed follower returns. No caller has been verified as consistently yielding 50% follower gains.
- Caller setup and mock research are free. No token burn is required during prelaunch. There is no funded wallet, verified Callout feed, signer, quote path, or buy/sell transaction route yet. The offline replay accepts a paper stake up to 5 SOL per call and a paper session ceiling up to 50 SOL; these are not live limits.

## Run and verify

```sh
npm ci
npm run build
npm run validate
```

The Worker lives in `worker/index.js`. The build embeds optical assets and the shader into `dist/server/index.js`. Database schema and migrations are in `db/` and `drizzle/`. `research/latest.json` contains a stored test snapshot; the Site's database supplies the live campaign state.

Production requires a Site configured with a D1 binding and a `PUMPPORTAL_API_KEY` secret. Never commit an API key, wallet seed, or private key. The relay and research endpoints may incur metered market-data charges; no endpoint submits a buy or sell transaction.
