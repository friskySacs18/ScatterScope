import assert from 'node:assert/strict';
import {assessCopyCall,spendForMarketCap,normalizedBands} from '../worker/copy-rules.js';

const bands=[{belowUsd:100000,spendSol:1},{belowUsd:1000000,spendSol:2},{belowUsd:null,spendSol:10}];
assert.equal(spendForMarketCap(bands,40000),1);
assert.equal(spendForMarketCap(bands,100000),2);
assert.equal(spendForMarketCap(bands,1000000),10);
assert.equal(spendForMarketCap([{belowUsd:null,spendSol:0.125}],40000),0.125);
assert.throws(()=>normalizedBands([]),/one amount/);
assert.throws(()=>normalizedBands([{belowUsd:1000000,spendSol:1},{belowUsd:100000,spendSol:2},{belowUsd:null,spendSol:10}]),/increase/);
const now=Date.now(),call={id:'first-call',caller:'caller-wallet',mint:'token-mint'},quote={mint:call.mint,marketCapUsd:1000000,observedAt:now-1000},history={complete:true,firstCalloutId:call.id};
const input={call,quote,history,bands,now,priorPurchase:false};
assert.deepEqual(assessCopyCall(input),{eligible:true,spendSol:10,marketCapUsd:1000000});
assert.equal(assessCopyCall({...input,history:{complete:false,firstCalloutId:call.id}}).reason,'caller_history_unverified');
assert.equal(assessCopyCall({...input,call:{...call,id:'repeat-call'}}).reason,'repeat_caller_mint');
assert.equal(assessCopyCall({...input,priorPurchase:true}).reason,'mint_already_purchased');
assert.equal(assessCopyCall({...input,quote:{...quote,observedAt:now-10000}}).reason,'market_cap_quote_unavailable_or_stale');
assert.equal(assessCopyCall({...input,quote:{...quote,marketCapUsd:null}}).reason,'market_cap_rules_invalid');
console.log('Editable market-cap bands and first-call/one-purchase eligibility verified');
