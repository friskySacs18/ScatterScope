// A reservation is permanent until an operator proves the prior attempt cannot
// settle. An uncertain broadcast must never lead to a second automatic buy.
const solanaAddress = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const solanaSignature = /^[1-9A-HJ-NP-Za-km-z]{80,90}$/;

export async function reserveAutomatedBuy(db, { accountId, signalId, mint, maxLamports, now = Date.now() }) {
  if (!db || typeof db.prepare !== 'function') throw new TypeError('Database required');
  if (!/^[\w:-]{1,128}$/.test(accountId) || !/^[\w:-]{1,128}$/.test(signalId)
    || !solanaAddress.test(mint) || !/^[1-9]\d*$/.test(String(maxLamports))
    || BigInt(maxLamports) > 18446744073709551615n || !Number.isSafeInteger(now) || now <= 0) {
    throw new TypeError('Invalid order reservation');
  }
  const lockId = crypto.randomUUID();
  const result = await db.prepare(`INSERT OR IGNORE INTO account_mint_locks
    (id, account_id, mint, signal_id, state, created_at)
    SELECT ?, id, ?, ?, 'reserved', ? FROM trading_accounts
    WHERE id = ? AND status = 'active' RETURNING id`)
    .bind(lockId, mint, signalId, now, accountId).first();
  if (!result) return { reserved: false, reason: 'locked_or_inactive' };

  // The lock is deliberately retained if writing the order fails. This fails
  // closed and requires reconciliation rather than risking another purchase.
  const orderId = crypto.randomUUID();
  await db.prepare(`INSERT INTO account_orders
    (id, account_id, signal_id, mint, side, max_lamports, state, created_at)
    VALUES (?, ?, ?, ?, 'buy', ?, 'queued', ?)`)
    .bind(orderId, accountId, signalId, mint, String(maxLamports), now).run();
  return { reserved: true, orderId, lockId };
}

// Transitions use compare-and-set: a duplicate callback or stale worker cannot
// overwrite a confirmed order or replace its transaction signature.
export async function markBuyBroadcast(db, { orderId, signature }) {
  if (!/^[0-9a-f-]{36}$/.test(orderId) || !solanaSignature.test(signature)) {
    throw new TypeError('Invalid broadcast identity');
  }
  const result = await db.prepare(`UPDATE account_orders SET state = 'broadcast', signature = ?
    WHERE id = ? AND side = 'buy' AND state = 'queued' AND signature IS NULL RETURNING id`)
    .bind(signature, orderId).first();
  return Boolean(result);
}

export async function markBuyConfirmed(db, { orderId, signature }) {
  if (!/^[0-9a-f-]{36}$/.test(orderId) || !solanaSignature.test(signature)) {
    throw new TypeError('Invalid confirmation identity');
  }
  const result = await db.prepare(`UPDATE account_orders SET state = 'confirmed'
    WHERE id = ? AND side = 'buy' AND state = 'broadcast' AND signature = ? RETURNING id`)
    .bind(orderId, signature).first();
  return Boolean(result);
}
