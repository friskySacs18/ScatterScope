// Read-only measurement of selected Pump.fun Callouts on TweetStream.
// Configure selected callers in the provider dashboard before running.
// TWEETSTREAM_API_KEY=... node scripts/measure-callout-feed.mjs 60

const key = process.env.TWEETSTREAM_API_KEY;
if (!key) {
  console.error('Set TWEETSTREAM_API_KEY in this process environment. No trades are submitted.');
  process.exit(2);
}

const minutes = Number(process.argv[2] || 60);
if (!Number.isFinite(minutes) || minutes < 1 || minutes > 1440) {
  console.error('Duration must be between 1 and 1440 minutes.');
  process.exit(2);
}

const endpoint = process.env.TWEETSTREAM_WS_URL || 'wss://ws-iad.tweetstream.io/ws';
if (!['wss://ws-iad.tweetstream.io/ws', 'wss://ws-global.tweetstream.io/ws'].includes(endpoint)) {
  console.error('Only documented TweetStream WebSocket endpoints are allowed.');
  process.exit(2);
}

const seen = new Set();
const delays = [];
let connections = 0;
let disconnects = 0;
let malformed = 0;
let active;
let stopped = false;
let deadlineTimer;
const startedAt = new Date().toISOString();
const deadline = Date.now() + minutes * 60_000;

function line(data) { console.log(JSON.stringify(data)); }
function percentile(values, fraction) {
  if (!values.length) return null;
  const ordered = [...values].sort((a, b) => a - b);
  return ordered[Math.ceil(fraction * ordered.length) - 1];
}
function finish(reason) {
  if (stopped) return;
  stopped = true;
  clearTimeout(deadlineTimer);
  if (active && active.readyState === WebSocket.OPEN) active.close();
  line({ type: 'summary', reason, startedAt, finishedAt: new Date().toISOString(),
    uniqueCallouts: seen.size, measuredCallouts: delays.length,
    publicationToLocalReceiptMs: { p50: percentile(delays, .5), p95: percentile(delays, .95), max: delays.length ? Math.max(...delays) : null },
    connections, disconnects, malformed,
    note: 'Measures signal delivery only. A small sample or missing calls cannot establish execution speed or complete coverage.' });
}

function connect() {
  if (stopped || Date.now() >= deadline) return finish('deadline');
  const ws = new WebSocket(endpoint, ['tweetstream.v1', `tweetstream.auth.token.${key}`]);
  active = ws;
  ws.addEventListener('open', () => { connections++; line({ type: 'connected', at: new Date().toISOString() }); });
  ws.addEventListener('message', ({ data }) => {
    const localReceipt = Date.now();
    let event;
    try { event = JSON.parse(String(data)); } catch { malformed++; return; }
    if (event?.t !== 'account' || event?.op !== 'callout' || event?.d?.platform !== 'pump_fun') return;
    const id = String(event.id || '');
    if (!id || seen.has(id)) return;
    seen.add(id);
    const call = event.d;
    const publishedAt = Number(call.createdAt);
    const providerReceivedAt = Number(call.receivedAt);
    const validPublication = Number.isFinite(publishedAt) && publishedAt > 0 && publishedAt < 8.64e15;
    const validProviderReceipt = Number.isFinite(providerReceivedAt) && providerReceivedAt > 0 && providerReceivedAt < 8.64e15;
    const lag = validPublication ? localReceipt - publishedAt : null;
    if (lag !== null && lag >= 0) delays.push(lag);
    line({ type: 'callout', id, caller: call.caller?.username || null,
      token: call.token?.address || null, calloutId: call.calloutId || null,
      publishedAt: validPublication ? new Date(publishedAt).toISOString() : null,
      providerReceivedAt: validProviderReceipt ? new Date(providerReceivedAt).toISOString() : null,
      localReceivedAt: new Date(localReceipt).toISOString(), publicationToLocalReceiptMs: lag,
      providerToLocalReceiptMs: validProviderReceipt ? localReceipt - providerReceivedAt : null });
  });
  ws.addEventListener('error', () => { line({ type: 'connection_error', at: new Date().toISOString() }); });
  ws.addEventListener('close', ({ code }) => {
    disconnects++;
    line({ type: 'disconnected', at: new Date().toISOString(), code });
    if (stopped) return;
    if ([1008, 4001, 4003, 4401, 4403].includes(code)) return finish('authentication_or_subscription_rejected');
    setTimeout(connect, 3000).unref();
  });
}

line({ type: 'start', startedAt, minutes, endpoint, mode: 'read-only' });
connect();
deadlineTimer = setTimeout(() => finish('deadline'), minutes * 60_000);
process.on('SIGINT', () => finish('interrupted'));
