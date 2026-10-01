import assert from 'node:assert/strict';
import BN from 'bn.js';
import bs58 from 'bs58';
import {Keypair,PublicKey,TransactionMessage,VersionedTransaction} from '@solana/web3.js';
import {PUMP_SDK} from '@pump-fun/pump-sdk';
import {reviewManualSell,confirmManualSell} from './manual-sell.js';
import {runAccountOrder} from './account-executor.js';
const pair=Keypair.generate(),wallet=pair.publicKey.toBase58(),mint=Keypair.generate().publicKey.toBase58();
const accountId='did:privy:account123',buyOrderId=crypto.randomUUID(),signalId='callout-12345';
const position={state:'open',accountId,wallet,mint,buyOrderId,signalId,amountRaw:'1000',costLamports:'2000000',rules:{profitPercent:25,stopPercent:25}};
const buy={id:buyOrderId,state:'confirmed',accountId,wallet,mint,walletId:'a'.repeat(24),receipt:{state:'confirmed',tokenDeltaRaw:'1000'}};
const env={SCOPE_EXECUTION_ENABLED:'true',SCOPE_ORDER_KILL_SWITCH:'false',RPC_URL:'https://api.mainnet-beta.solana.com/'};
function makeStore(){const map=new Map([['position:'+mint,position],['order:'+buyOrderId,buy]]);let lock=Promise.resolve();
  const storage={get:async key=>map.get(key),put:async(k,v)=>map.set(k,v),delete:async k=>map.delete(k),setAlarm:async()=>{},
    transaction(fn){const result=lock.then(()=>fn(storage));lock=result.catch(()=>{});return result}};return {map,storage};}
const contextReader=async(_env,job,side)=>{assert.equal(side,'sell');assert.equal(job.accountId,accountId);
  return {walletId:buy.walletId,revision:'stable-sell',evidence:{accountId,signalId,wallet,mint,ownerVerified:true,consentVerified:true,delegationVerified:true,signerPolicyVerified:true}}};
const quoteSell=async()=>({wallet,mint,amountRaw:'1000',tokenDecimals:6,venue:'pump-curve',observedAt:Date.now(),expectedSolOutLamports:'2000000'});
const {storage,map}=makeStore();
const args={storage,env,accountId,mint,connection:{},contextReader,quoteSell};
const review=await reviewManualSell(args);assert.equal(review.state,'review');assert.equal(review.minimumReceiveLamports,'1900000');assert.equal(review.tokenAmount,'0.001000');
assert.equal([...map.keys()].filter(k=>k.startsWith('order:')).length,1,'Review never places a sell');
assert.equal((await reviewManualSell({...args,accountId:'did:privy:someoneelse'})).reason,'open_position_required');
let signs=0,sends=0;
const execute=options=>runAccountOrder({...options,contextReader,quoteSell,connection:{getBlockHeight:async()=>100},
  prepareSell:async({minimumReceiveLamportsFloor})=>{
    assert.equal(minimumReceiveLamportsFloor,'1900000');
    const ix=await PUMP_SDK.getSellV2InstructionRaw({user:pair.publicKey,mint:new PublicKey(mint),creator:pair.publicKey,
      amount:new BN(1000),quoteAmount:new BN(minimumReceiveLamportsFloor),feeRecipient:pair.publicKey,buybackFeeRecipient:pair.publicKey});
    const wire=new VersionedTransaction(new TransactionMessage({payerKey:pair.publicKey,recentBlockhash:mint,instructions:[ix]}).compileToV0Message());
    return {transaction:Buffer.from(wire.serialize()).toString('base64'),wallet,mint,side:'sell',quoteAt:Date.now(),tokenAmountRaw:'1000',
      minimumReceiveLamports:minimumReceiveLamportsFloor,lastValidBlockHeight:900,balanceLamports:'10000000',reservedRentLamports:'0'};
  },signerFactory:()=>async({transaction})=>{signs++;const wire=VersionedTransaction.deserialize(Buffer.from(transaction,'base64'));wire.sign([pair]);return Buffer.from(wire.serialize()).toString('base64')},
  fetcher:async(_url,init)=>{sends++;const body=JSON.parse(init.body);assert.equal(body.method,'sendTransaction');
    const wire=VersionedTransaction.deserialize(Buffer.from(body.params[0],'base64'));
    return Response.json({jsonrpc:'2.0',id:1,result:bs58.encode(wire.signatures[0])});}});
assert.equal((await confirmManualSell({...args,reviewId:crypto.randomUUID(),execute})).reason,'manual_sell_review_required');
assert.equal((await confirmManualSell({...args,reviewId:review.reviewId,now:()=>review.expiresAt+1,execute})).reason,'manual_sell_review_expired');
const result=await confirmManualSell({...args,reviewId:review.reviewId,execute});
assert.ok(result.signature);assert.equal(signs,1);assert.equal(sends,1,'A reviewed manual sell reaches the existing verified pipeline once');
const repeated=await confirmManualSell({...args,reviewId:review.reviewId,execute});assert.equal(repeated.orderId,result.orderId);
assert.equal(signs,1);assert.equal(sends,1,'Repeated confirmation returns the existing order');
assert.equal(map.get('order:'+result.orderId).manual,true);
assert.equal((await reviewManualSell(args)).reason,'prior_order_unresolved','An uncertain broadcast blocks another sell');
const fresh=makeStore(),freshArgs={...args,storage:fresh.storage};
const second=await reviewManualSell(freshArgs);
assert.equal((await runAccountOrder({storage:fresh.storage,env,job:{accountId,signalId},side:'sell',manualReviewId:second.reviewId,
  contextReader,connection:{},quoteSell:async()=>({...await quoteSell(),expectedSolOutLamports:'1800000'})})).reason,'manual_sell_quote_changed');
assert.equal((await runAccountOrder({storage:fresh.storage,env,job:{accountId,signalId},side:'sell',contextReader,connection:{}})).reason,'verified_exit_intent_required','Manual review never changes the automatic profit/stop gate');
fresh.map.set('position:'+mint,{...position,amountRaw:'999'});
assert.equal((await confirmManualSell({...freshArgs,reviewId:second.reviewId,execute})).reason,'manual_sell_review_expired');
console.log('PASS: reviewed full sell without target, wallet/position isolation, expiry, minimum return, durable single submission and unchanged automatic exit rules');
