import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {registerPendingAccount} from '../worker/account-registry.js';

const sqlite=new DatabaseSync(':memory:');
sqlite.exec(`CREATE TABLE trading_users (id TEXT PRIMARY KEY,auth_subject TEXT UNIQUE,created_at INTEGER);
CREATE TABLE trading_accounts(id TEXT PRIMARY KEY,user_id TEXT UNIQUE,provider_wallet_id TEXT UNIQUE,deposit_address TEXT UNIQUE,status TEXT,created_at INTEGER);`);
const db={prepare(sql){return{bind(...args){return{
  async run(){return sqlite.prepare(sql).run(...args)},
  async first(){return sqlite.prepare(sql).get(...args)??null},
}}}}};
const base={subject:'did:privy:cm3np4u9j001rc8b73seqmqqk',address:'11111111111111111111111111111111',walletId:'id2tptkqrxd39qo9j423etij'};
const first=await registerPendingAccount(db,base);
assert.equal(first.status,'pending');
assert.deepEqual(await registerPendingAccount(db,base),first);
await assert.rejects(registerPendingAccount(db,{...base,address:'22222222222222222222222222222222',walletId:'anotherwalletid000000000'}),/different Scope wallet/);
await assert.rejects(registerPendingAccount(db,{...base,subject:'did:privy:another_user',address:'22222222222222222222222222222222'}),/different Scope wallet/);
assert.equal(sqlite.prepare('SELECT COUNT(*) AS total FROM trading_accounts').get().total,1);
console.log('Verified wallet registration is pending, idempotent, and single-wallet');
