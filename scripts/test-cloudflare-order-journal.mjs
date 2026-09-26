import assert from 'node:assert/strict';
import {reserveBuy,beginSigning,markBroadcast,markFinalized,reserveFullSell} from '../execution/cloudflare/order-journal.js';

const now=1790374650000;
const values=new Map();let chain=Promise.resolve();
const storage={transaction(fn){const result=chain.then(()=>fn({get:key=>values.get(key),put:(key,value)=>{values.set(key,value)}}));chain=result.catch(()=>{});return result}};
const evidence={killSwitch:false,executionEnabled:true,accountStatus:'active',ownerVerified:true,delegationVerified:true,consentVerified:true,
 accountId:'account-1',signalId:'call-1',wallet:'11111111111111111111111111111111',caller:'11111111111111111111111111111111',mint:'So11111111111111111111111111111111111111112',
 selectedCaller:true,signalVerified:true,historyComplete:true,firstCall:true,mintAlreadyHeld:false,publishedAt:now-5000,observedAt:now-3000,monitorHeartbeatAt:now-1000,feedHealthy:true,
 quoteAt:now-1000,marketCapUsd:25000,marketCapAllowed:true,rpcHealthy:true,signerPolicyVerified:true,fullTransactionVerified:true,simulationPassed:true,
 maxLamports:'2000000',dailyCapLamports:'3000000',dailyReservedLamports:'0',balanceLamports:'4000000',maxFeeLamports:'1000000'};
const two=await Promise.all([reserveBuy(storage,evidence,now),reserveBuy(storage,evidence,now)]);
assert.equal(two.filter(x=>x.reserved).length,1);
const id=two.find(x=>x.reserved).orderId;
assert.equal(values.get('daily:2026-09-25'),'2000000');
assert.equal((await reserveBuy(storage,{...evidence,signalId:'call-2'},now)).reason,'duplicate_mint');
assert.equal((await reserveBuy(storage,{...evidence,signalId:'call-3',mint:'11111111111111111111111111111111'},now)).reason,'daily_budget_exceeded');
assert.equal(await beginSigning(storage,id),true);
assert.equal(await beginSigning(storage,id),false,'Ambiguous signer attempt cannot be repeated');
const signature='2'.repeat(88);
assert.equal(await markBroadcast(storage,id,signature),true);
assert.equal(await markBroadcast(storage,id,signature),false);
assert.equal(await markFinalized(storage,id,'3'.repeat(88),{confirmationStatus:'finalized',err:null}),false);
assert.equal(await markFinalized(storage,id,signature,{confirmationStatus:'confirmed',err:null}),false);
assert.equal(await markFinalized(storage,id,signature,{confirmationStatus:'finalized',err:null}),true);
assert.equal(await markFinalized(storage,id,signature,{confirmationStatus:'finalized',err:'different'}),false);
assert.equal(values.get('mint:'+evidence.mint),id,'Finalized orders keep the once-per-mint purchase lock');
const sell={accountId:evidence.accountId,mint:evidence.mint,buyOrderId:id,rawBalance:'1200000',verifiedBalance:true,consentVerified:true,killSwitch:false};
assert.equal((await reserveFullSell(storage,{...sell,verifiedBalance:false},now)).reason,'sell_evidence_unverified');
assert.equal((await reserveFullSell(storage,{...sell,buyOrderId:crypto.randomUUID()},now)).reason,'settled_buy_required');
const exits=await Promise.all([reserveFullSell(storage,sell,now),reserveFullSell(storage,sell,now)]);
assert.equal(exits.filter(x=>x.reserved).length,1,'Concurrent exits cannot double-sell the same balance');
const sellId=exits.find(x=>x.reserved).orderId;
assert.equal(await beginSigning(storage,sellId),true);
assert.equal(await beginSigning(storage,sellId),false);
assert.equal(await markBroadcast(storage,sellId,'4'.repeat(88)),true);
assert.equal(await markFinalized(storage,sellId,'4'.repeat(88),{confirmationStatus:'finalized',err:null}),true);
assert.equal(values.get('sell:'+evidence.mint),sellId,'Sell reservation remains locked after finalization');
console.log('Serialized order reservation, budget, idempotence, signer uncertainty and finalization verified');
