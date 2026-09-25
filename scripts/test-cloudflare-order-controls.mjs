import assert from 'node:assert/strict';
import {evaluateBuy} from '../execution/cloudflare/order-controls.js';

const now=1790374650000;
const good={killSwitch:false,executionEnabled:true,accountStatus:'active',ownerVerified:true,delegationVerified:true,consentVerified:true,
 accountId:'account-1',signalId:'call-1',wallet:'11111111111111111111111111111111',caller:'11111111111111111111111111111111',mint:'So11111111111111111111111111111111111111112',
 selectedCaller:true,signalVerified:true,historyComplete:true,firstCall:true,mintAlreadyHeld:false,publishedAt:now-5000,observedAt:now-3000,monitorHeartbeatAt:now-1000,feedHealthy:true,
 quoteAt:now-1000,marketCapUsd:25000,marketCapAllowed:true,rpcHealthy:true,signerPolicyVerified:true,fullTransactionVerified:true,simulationPassed:true,
 maxLamports:'2000000',dailyCapLamports:'10000000',dailyReservedLamports:'7000000',balanceLamports:'4000000',maxFeeLamports:'1000000'};
assert.deepEqual(evaluateBuy(good,now),{allowed:true,reason:null,reservationLamports:'2000000'});
for(const [key,value] of Object.entries({killSwitch:true,executionEnabled:false,consentVerified:false,delegationVerified:false,selectedCaller:false,historyComplete:false,mintAlreadyHeld:true,
 publishedAt:now-31000,observedAt:now-25000,monitorHeartbeatAt:now-26000,feedHealthy:false,quoteAt:now-6000,marketCapAllowed:false,
 rpcHealthy:false,signerPolicyVerified:false,fullTransactionVerified:false,simulationPassed:false,dailyReservedLamports:'9000000',balanceLamports:'2000000',maxLamports:'NaN'})){
 const result=evaluateBuy({...good,[key]:value},now);assert.equal(result.allowed,false,key);
}
assert.equal(evaluateBuy({...good,killSwitch:undefined},now).allowed,false);
assert.equal(evaluateBuy({...good,publishedAt:now+1},now).allowed,false);
assert.equal(evaluateBuy({...good,accountId:'../other'},now).allowed,false);
console.log('Order admission fails closed for stale feeds, consent, instruction integrity, budgets and kill switch');
