import assert from 'node:assert/strict';
import {fullExitRules,confirmedPosition,fullExitTrigger} from './position-exit.js';
const rules={profit1Percent:25,profit1Sell:100,profit2Percent:null,profit2Sell:null,stopPercent:25};
assert.deepEqual(fullExitRules(rules),{profitPercent:25,stopPercent:25});
for(const invalid of [{...rules,profit1Sell:50},{...rules,profit2Percent:50,profit2Sell:100},{}])
  assert.throws(()=>fullExitRules(invalid),/Full-balance/);
const now=Date.now();
const buy={id:'buy-1',state:'confirmed',wallet:'wallet-1',mint:'mint-1',amountLamports:'2000000',settledAt:now-1000,
  prepared:{reservedRentLamports:'2500000'},receipt:{state:'confirmed',tokenDeltaRaw:'123000',solDeltaLamports:'-2100000',feeLamports:'5000'}};
const position=confirmedPosition({buyOrder:buy,rules,now});
assert.equal(position.costLamports,'2100000');
const quote=amount=>({expectedSolOutLamports:String(amount),observedAt:now-100,wallet:'wallet-1',mint:'mint-1',amountRaw:'123000'});
assert.equal(fullExitTrigger(position,quote('2625000'),{now}).reason,'profit');
assert.equal(fullExitTrigger(position,quote('1575000'),{now}).reason,'stop');
assert.equal(fullExitTrigger(position,quote('2100000'),{now}).reason,'target_not_reached');
assert.equal(fullExitTrigger(position,{...quote('9999999'),amountRaw:'100000'},{now}).triggered,false);
assert.equal(fullExitTrigger(position,{...quote('9999999'),observedAt:now-6000},{now}).triggered,false);
assert.throws(()=>confirmedPosition({buyOrder:{...buy,state:'broadcast'},rules,now}),/Confirmed buy/);
assert.throws(()=>confirmedPosition({buyOrder:{...buy,receipt:{...buy.receipt,solDeltaLamports:'-9999999'}},rules,now}),/exceeds/);
console.log('Confirmed cash basis, full-balance rules, exact thresholds, quote freshness and identity verified');
