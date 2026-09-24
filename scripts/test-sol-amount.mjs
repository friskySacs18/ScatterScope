import assert from 'node:assert/strict';
import {lamportsOf} from '../assets/sol-amount.js';

for(const input of ['.005','0.005','0,005',' .005 '])assert.equal(lamportsOf(input),5000000n);
assert.equal(lamportsOf('0.01'),10000000n);
assert.equal(lamportsOf('0.000000001'),1n);
for(const input of ['0','0.0000000001','-0.005','0.005.1','1,000.5',''])assert.equal(lamportsOf(input),null);
console.log('Valid decimal SOL amounts parse to exact lamports.');
