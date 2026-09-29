import assert from 'node:assert/strict';
import {inspectOpenPositions} from './position-monitor.js';
import {AccountOrderJournal} from './worker.js';

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
let armedAt=null;
const failingJournal=new AccountOrderJournal({storage:{get:async()=>{throw Error('temporary storage failure')},
  getAlarm:async()=>null,setAlarm:async timestamp=>{armedAt=timestamp}}},{RPC_URL:'https://rpc.example'});
const before=Date.now();
await assert.rejects(failingJournal.alarm(),/temporary storage failure/);
assert.ok(armedAt>=before+7000&&armedAt<=Date.now()+9000,'A failed exit alarm is scheduled again');
console.log('Read-only exit observations persist one intent, report migration, and skip closed positions');
// Exercise both price triggers through the production monitor and account
 // executor. The builder sentinel stops before reservation, signing or RPC.
 const {runAccountOrder}=await import('./account-executor.js');
 for(const [reason,value] of [['profit','2500000'],['stop','1500000']]){
   const rows=new Map(),job={accountId:'did:privy:account123',signalId:'callout-12345'};
   const position={state:'open',buyOrderId:crypto.randomUUID(),...job,wallet,mint,
     amountRaw:'1000',costLamports:'2000000',rules:{profitPercent:25,stopPercent:25}};
   rows.set('position:'+mint,position);
   const store={get:async k=>rows.get(k),put:async(k,v)=>rows.set(k,v),
     list:async({prefix})=>new Map([...rows].filter(([k])=>k.startsWith(prefix)))};
   const snapshot={wallet,mint,amountRaw:'1000',observedAt:Date.now(),expectedSolOutLamports:value,venue:'pump-curve'};
   assert.equal((await inspectOpenPositions({storage:store,rpcUrl:'https://rpc.example',connectionFactory:()=>({}),quote:async()=>snapshot})).triggered,1);
   assert.equal(rows.get('exit-intent:'+mint).reason,reason);
   let built=0;
   const input={storage:store,env:{SCOPE_EXECUTION_ENABLED:'true',SCOPE_ORDER_KILL_SWITCH:'false'},
     job,side:'sell',connection:{},contextReader:async()=>({walletId:'a'.repeat(24),revision:'revision',
       evidence:{...job,wallet,mint}}),quoteSell:async()=>({...snapshot,observedAt:Date.now()}),
     prepareSell:async args=>{built++;assert.equal(args.amountRaw,'1000');assert.equal(args.wallet,wallet);assert.equal(args.mint,mint);throw Error('verified_sell_builder_reached')}};
   await assert.rejects(runAccountOrder(input),/verified_sell_builder_reached/);
   assert.equal(built,1,reason+' reaches the normal full-sell builder');
   assert.equal((await runAccountOrder({...input,quoteSell:async()=>({...snapshot,observedAt:Date.now(),expectedSolOutLamports:'2000000'})})).reason,'exit_target_not_currently_met');
   assert.equal(built,1,'A recovered price is rechecked before building');
   assert.equal((await runAccountOrder({...input,quoteSell:async()=>({...snapshot,observedAt:Date.now()-6000})})).reason,'exit_target_not_currently_met');
   assert.equal(built,1,'Stale quotes never reach the builder');
 }
 console.log('PASS: profit and stop -> persisted intent -> fresh recheck -> exact full-sell builder; recovered and stale prices blocked');
