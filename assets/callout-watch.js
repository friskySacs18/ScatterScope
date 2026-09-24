(() => {
  const status = document.getElementById('calloutMonitorStatus');
  const list = document.getElementById('calloutMonitorList');
  if (!status || !list) return;
  const watchlistKey = 'scope-caller-watchlist-v1';
  const seenKey = 'scope-callout-seen-v1';
  const walletPattern = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
  const seen = new Set();
  let first = true;
  let busy = false;
  let timer;
  let lastChecked = 0;
  let previousCallers = '';
  let observations = [];

  try {
    const saved = JSON.parse(sessionStorage.getItem(seenKey) || '[]');
    if (Array.isArray(saved)) for (const id of saved.slice(-500)) if (typeof id === 'string') seen.add(id);
  } catch { /* Session storage is optional. */ }

  function callers() {
    try {
      const stored = JSON.parse(localStorage.getItem(watchlistKey) || '[]');
      if (!Array.isArray(stored)) return [];
      return stored.slice(0, 12).map(x => typeof x === 'string' ? { wallet: x } : x)
        .filter(x => x && typeof x.wallet === 'string' && walletPattern.test(x.wallet));
    } catch { return []; }
  }

  function render() {
    list.replaceChildren();
    for (const row of observations.slice(0, 12)) {
      const entry = document.createElement('div');
      entry.className = 'paper-line';
      const link = document.createElement('a');
      link.href = row.calloutId ? 'https://pump.fun/callouts/' + encodeURIComponent(row.mint) + '/' + encodeURIComponent(row.calloutId) : 'https://pump.fun/coin/' + encodeURIComponent(row.mint);
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = (row.name ? '@' + row.name : row.caller.slice(0, 8) + '…') + ' called ' + row.mint.slice(0, 8) + '…' + row.mint.slice(-5);
      const meta = document.createElement('small');
      const age = Math.max(0, Math.round((row.observedAt - row.publishedAt) / 1000));
      meta.textContent = new Date(row.publishedAt).toLocaleTimeString() + ' · observed ' + age + 's after publication';
      const label = document.createElement('strong');
      label.textContent = row.fresh ? 'NEW SIGNAL · NO ORDER' : 'RECENT CALL · NO ORDER';
      entry.append(link, meta, label);
      list.append(entry);
    }
  }

  async function poll() {
    if (busy || document.hidden) return;
    const selected = callers();
    const ids = selected.map(x => x.wallet).sort().join(',');
    if (ids !== previousCallers) {
      previousCallers = ids;
      observations = observations.filter(x => selected.some(y => y.wallet === x.caller));
      render();
    }
    if (!selected.length) {
      status.textContent = 'Add a caller to set up your watchlist. The Callout feed is currently unavailable.';
      return;
    }
    busy = true;
    try {
      const response = await fetch('/api/callouts/recent', { cache: 'no-store', signal: AbortSignal.timeout(7500) });
      const data = await response.json();
      if (!response.ok) throw Error(data.error || 'Callout feed unavailable');
      if (!Array.isArray(data.callouts)) throw Error('Unexpected Callout response');
      const now = Date.now();
      const names = new Map(selected.map(x => [x.wallet, x.username || '']));
      const matched = data.callouts.filter(x => names.has(x.caller)).sort((a, b) => a.publishedAt - b.publishedAt);
      for (const call of matched) {
        if (typeof call.id !== 'string' || seen.has(call.id)) continue;
        const fresh = !first && call.publishedAt > lastChecked - 2000 && now - call.publishedAt <= 90000 && now >= call.publishedAt;
        observations.unshift({ ...call, name: names.get(call.caller), fresh });
      }
      for (const call of data.callouts) if (typeof call.id === 'string') seen.add(call.id);
      if (seen.size > 500) for (const id of [...seen].slice(0, seen.size - 500)) seen.delete(id);
      try { sessionStorage.setItem(seenKey, JSON.stringify([...seen])); } catch { /* Still deduplicated in memory. */ }
      observations = observations.slice(0, 12);
      render();
      const oldest = Math.min(...data.callouts.map(x => Number(x.publishedAt) || now));
      const saturated = data.callouts.length >= 20 && oldest > now - 12000;
      status.classList.remove('monitor-error');
      status.textContent = 'Checked ' + new Date(now).toLocaleTimeString() + ' · ' + selected.length + ' caller' + (selected.length === 1 ? '' : 's') +
        ' · every 8s while open' + (saturated ? ' · feed is busy; calls could be missed' : '') + ' · live orders off';
      first = false;
      lastChecked = now;
    } catch (error) {
      status.classList.add('monitor-error');
      status.textContent = (error.message || 'Feed unavailable') + ' No signals or orders are being processed.';
    } finally { busy = false; }
  }

  function tick() { void poll(); timer = window.setTimeout(tick, 8000); }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { clearTimeout(timer); timer = undefined; status.textContent = 'Watch paused while this tab is hidden. Live orders off.'; }
    else if (!timer) { first = true; tick(); }
  });
  tick();
})();
