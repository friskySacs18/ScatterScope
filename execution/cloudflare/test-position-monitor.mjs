import assert from 'node:assert/strict';
import {inspectOpenPositions} from './position-monitor.js';

const now=Date.now(),mint='mint-1',wallet='wallet-1',data=new Map();
const storage={get:async k=>data.get(k),put:async(k,v)=>data.set(k,v),
  list:async({prefix})=>new Map([...data].filter(([key])=>key.startsWith(prefix)))};
data.set('position:'+mint,{state:'open',buyOrderId:'buy-1',wallet,mint,amountRaw:'1000',costLamports:'2000000',
  rules:{profitPercent:25,stopPercent:25}});
const args={storage,rpcUrl:'https://rpc.example',connectionFactory:()=>({}),now:()=>now,
  quote:async()=>({wallet,mint,amountRaw:'1000',observedAt:now,expectedSolOutLamports:'2500000',venue:'pump-curve'})};
assert.deepEqual(await inspectOpenPositions(args),{checked:1,triggered:1});
assert.equal(data.get('exit-intent:'+mint).reason,'profit');
const original=data.get('exit-intent:'+mint);
assert.deepEqual(await inspectOpenPositions(args),{checked:1,triggered:1});
assert.equal(data.get('exit-intent:'+mint),original);
assert.equal(data.get('exit-observation:'+mint).expectedSolOutLamports,'2500000');
await inspectOpenPositions({...args,quote:async()=>{throw Error('migrated_pool_requires_pumpswap_exit')}});
assert.equal(data.get('exit-observation:'+mint).reason,'migrated_pool_requires_pumpswap_exit');
data.set('position:'+mint,{...data.get('position:'+mint),state:'closed'});
assert.deepEqual(await inspectOpenPositions(args),{checked:0,triggered:0});
console.log('Read-only exit observations persist one intent, report migration, and skip closed positions');
