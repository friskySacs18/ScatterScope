import assert from 'node:assert/strict';
import {nativeSolLamports} from '../worker/privy-balance.js';

assert.equal(nativeSolLamports({balances:[{chain:'solana',asset:'sol',raw_value:'10000000',raw_value_decimals:9}]}),10000000);
assert.equal(nativeSolLamports({balances:[{chain:'base',asset:'eth',raw_value:'999',raw_value_decimals:18},{chain:'solana',asset:'sol',raw_value:'0',raw_value_decimals:9}]}),0);
for(const balances of [[],[{chain:'solana',asset:'usdc',raw_value:'10000000',raw_value_decimals:6}],[{chain:'solana',asset:'sol',raw_value:'10.5',raw_value_decimals:9}],[{chain:'solana',asset:'sol',raw_value:'10000000',raw_value_decimals:8}]])assert.throws(()=>nativeSolLamports({balances}),/SOL|balance/);
console.log('Native SOL balance parsing and non-SOL rejection verified');
