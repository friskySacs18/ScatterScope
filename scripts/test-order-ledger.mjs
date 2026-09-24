import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { reserveAutomatedBuy, markBuyBroadcast, markBuyConfirmed } from '../worker/order-ledger.js';

const sqlite = new DatabaseSync(':memory:');
sqlite.exec(`CREATE TABLE trading_accounts(id TEXT PRIMARY KEY,status TEXT NOT NULL);
CREATE TABLE account_mint_locks(id TEXT PRIMARY KEY,account_id TEXT,mint TEXT,signal_id TEXT,state TEXT,created_at INTEGER, UNIQUE(account_id,mint));
CREATE TABLE account_orders(id TEXT PRIMARY KEY,account_id TEXT,signal_id TEXT,mint TEXT,side TEXT,max_lamports TEXT,state TEXT,signature TEXT,created_at INTEGER, UNIQUE(account_id,signal_id,side));
INSERT INTO trading_accounts VALUES ('active','active'), ('pending','pending');`);
const db = { prepare(sql) { return { bind(...args) { return {
  async first() { return sqlite.prepare(sql).get(...args) ?? null; },
  async run() { return sqlite.prepare(sql).run(...args); },
}; } }; } };
const mint = '11111111111111111111111111111111';
const signalId = 'call-1';
const common = { accountId: 'active', signalId, mint, maxLamports: '1000000000' };
assert.equal((await reserveAutomatedBuy(db, { ...common, accountId: 'pending' })).reserved, false);
const first = await reserveAutomatedBuy(db, common);
assert.equal(first.reserved, true);
assert.equal((await reserveAutomatedBuy(db, { ...common, signalId: 'another-caller' })).reserved, false);
assert.equal(sqlite.prepare('SELECT count(*) AS n FROM account_orders').get().n, 1);
const signature = '2'.repeat(88);
assert.equal(await markBuyConfirmed(db, { orderId: first.orderId, signature }), false);
assert.equal(await markBuyBroadcast(db, { orderId: first.orderId, signature }), true);
assert.equal(await markBuyBroadcast(db, { orderId: first.orderId, signature: '3'.repeat(88) }), false);
assert.equal(await markBuyConfirmed(db, { orderId: first.orderId, signature: '3'.repeat(88) }), false);
assert.equal(await markBuyConfirmed(db, { orderId: first.orderId, signature }), true);
assert.equal(await markBuyConfirmed(db, { orderId: first.orderId, signature }), false);
assert.equal((await reserveAutomatedBuy(db, common)).reserved, false);
await assert.rejects(reserveAutomatedBuy(db, { ...common, maxLamports: '0' }), /Invalid/);
console.log('Order reservation, duplicate prevention, and signature-bound transitions verified');
