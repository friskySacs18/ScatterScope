import assert from 'node:assert/strict';
import BN from 'bn.js';
import {Keypair,PublicKey,VersionedTransaction,TransactionMessage} from '@solana/web3.js';
import {PUMP_SDK} from '@pump-fun/pump-sdk';
import {executeReservedOrder,reconcileOrder} from './execution-pipeline.js';
import {verifySignedTransaction} from './signed-transaction.js';
import {verifySettlement} from './settlement.js';
import {createPrivySigner,verifiedSigningPolicy} from './privy-signer.js';

const pair=Keypair.fromSeed(Uint8Array.from({length:32},(_,i)=>i+1));
const wallet=pair.publicKey.toBase58(),mint=Keypair.fromSeed(Uint8Array.from({length:32},(_,i)=>i+33)).publicKey.toBase58();
const accountId='did:privy:account123',walletId='a'.repeat(24),orderId=crypto.randomUUID(),rpcUrl='https://api.mainnet-beta.solana.com/';
const ix=await PUMP_SDK.getBuyV2InstructionRaw({user:pair.publicKey,mint:new PublicKey(mint),creator:pair.publicKey,amount:new BN(1000),quoteAmount:new BN(2000000),feeRecipient:pair.publicKey,buybackFeeRecipient:pair.publicKey});
const tx=new VersionedTransaction(new TransactionMessage({payerKey:pair.publicKey,recentBlockhash:mint,instructions:[ix]}).compileToV0Message());
const unsigned=Buffer.from(tx.serialize()).toString('base64');tx.sign([pair]);const signed=Buffer.from(tx.serialize()).toString('base64');
const identity=await verifySignedTransaction({unsigned,signed,wallet});
await assert.rejects(verifySignedTransaction({unsigned,signed:unsigned,wallet}),/Invalid wallet signature/);
await assert.rejects(verifySignedTransaction({unsigned,signed,wallet:mint}),/Wrong signing wallet/);
const changed=VersionedTransaction.deserialize(Buffer.from(signed,'base64'));changed.message.recentBlockhash=wallet;changed.sign([pair]);
await assert.rejects(verifySignedTransaction({unsigned,signed:Buffer.from(changed.serialize()).toString('base64'),wallet}),/changed/);
const badSig=VersionedTransaction.deserialize(Buffer.from(signed,'base64'));badSig.signatures[0][5]^=1;
await assert.rejects(verifySignedTransaction({unsigned,signed:Buffer.from(badSig.serialize()).toString('base64'),wallet}),/Invalid wallet signature/);

const now=Date.now();
const prepared={transaction:unsigned,wallet,mint,side:'buy',quoteAt:now,tokenAmountRaw:'1000',maximumSpendLamports:'2000000',reservedRentLamports:'2000000',lastValidBlockHeight:900};
function store(){const map=new Map([['order:'+orderId,{id:orderId,accountId,walletId,wallet,mint,amountLamports:'2000000',state:'reserved',signature:null}]]);let lock=Promise.resolve();return {map,get:async key=>map.get(key),transaction(fn){const result=lock.then(async()=>{const staged=new Map(map);const value=await fn({get:async k=>staged.get(k),put:async(k,v)=>staged.set(k,v)});map.clear();for(const [k,v]of staged)map.set(k,v);return value});lock=result.catch(()=>{});return result}}}
const storage=store();let signs=0,sends=0;
const args={storage,orderId,prepared,authorize:async()=>true,sign:async()=>{signs++;return signed},rpcUrl,now:()=>now,fetcher:async(url,init)=>{sends++;const journal=await storage.get('order:'+orderId);assert.equal(journal.signedTransaction,signed,'Signed bytes durable BEFORE submission');assert.equal(journal.signature,identity.signature);assert.equal(JSON.parse(init.body).method,'sendTransaction');throw Error('RPC accepted but response lost')}};
const outcomes=await Promise.all(Array.from({length:200},()=>executeReservedOrder(args)));
assert.equal(signs,1);assert.equal(sends,1);assert.equal(outcomes.filter(x=>x.state==='unknown').length,1);
assert.equal((await executeReservedOrder(args)).state,'broadcast');assert.equal(signs,1);
const final={slot:123,transaction:[signed,'base64'],meta:{err:null,fee:5000,preBalances:[10000000],postBalances:[7995000],preTokenBalances:[],postTokenBalances:[{accountIndex:1,mint,owner:wallet,uiTokenAmount:{amount:'1000'}}]}};
const fetcher=async(url,init)=>{const method=JSON.parse(init.body).method;return Response.json({jsonrpc:'2.0',id:1,result:method==='getSignatureStatuses'?{value:[{confirmationStatus:'finalized',err:null}]}:final})};
const result=await reconcileOrder({storage,orderId,rpcUrl,fetcher});assert.equal(result.state,'confirmed');assert.equal(result.receipt.tokenDeltaRaw,'1000');
assert.equal((await storage.get('order:'+orderId)).state,'confirmed');
await reconcileOrder({storage,orderId,rpcUrl,fetcher:()=>{throw Error('Should not requery settled order')}});
const order=await storage.get('order:'+orderId);
assert.throws(()=>verifySettlement(order,{...final,transaction:[unsigned,'base64']}),/mismatch/);
assert.throws(()=>verifySettlement(order,{...final,meta:{...final.meta,postTokenBalances:[]}}),/Buy settlement/);
assert.throws(()=>verifySettlement(order,{...final,meta:{...final.meta,postBalances:[1000]}}),/Buy settlement/);
assert.throws(()=>verifySettlement(order,{...final,meta:{...final.meta,postTokenBalances:[{accountIndex:1,mint,uiTokenAmount:{amount:'1000'}}]}}),/Missing token owner/);
const noReceipt=store();await executeReservedOrder({...args,storage:noReceipt});
assert.equal((await reconcileOrder({storage:noReceipt,orderId,rpcUrl,fetcher:async(url,init)=>Response.json({jsonrpc:'2.0',id:1,result:JSON.parse(init.body).method==='getSignatureStatuses'?{value:[{confirmationStatus:'finalized',err:null}]}:null})})).state,'reconciliation_pending');
const revoked=store();let revokedSign=0;await assert.rejects(executeReservedOrder({...args,storage:revoked,authorize:async()=>false,sign:async()=>{revokedSign++;return signed}}),/revoked/);assert.equal(revokedSign,0);
const uncertain=store();let attempts=0;const failed={...args,storage:uncertain,sign:async()=>{attempts++;throw Error('Signer timeout')}};
assert.equal((await executeReservedOrder(failed)).state,'signing_unknown');await executeReservedOrder(failed);assert.equal(attempts,1);
await assert.rejects(executeReservedOrder({...args,storage:store(),prepared:{...prepared,quoteAt:now-6000}}),/freshness/);

const env={PRIVY_APP_SECRET:'test-only',SCOPE_PRIVY_SIGNER_PRIVATE_KEY_PEM:'-----BEGIN PRIVATE KEY-----test',SCOPE_PRIVY_SIGNER_QUORUM_ID:'kzp9n6z4hxygbdqs4sf3dprc',SCOPE_PRIVY_POLICY_ID:'tnfa7qf8t1i0s5hsqmw5yexy'};
let delegated=true,signRequests=0;
const client={wallets:()=>({get:async()=>({id:walletId,address:wallet,chain_type:'solana',archived_at:null,additional_signers:delegated?[{signer_id:env.SCOPE_PRIVY_SIGNER_QUORUM_ID,override_policy_ids:[env.SCOPE_PRIVY_POLICY_ID]}]:[]}),solana:()=>({signTransaction:async(id,input)=>{signRequests++;assert.equal(id,walletId);assert.equal(input.idempotency_key,orderId);assert.equal(input.transaction,unsigned);return {encoding:'base64',signed_transaction:signed}}})})};
const goodPolicy={id:env.SCOPE_PRIVY_POLICY_ID,chain_type:'solana',owner_id:env.SCOPE_PRIVY_SIGNER_QUORUM_ID,rules:[
  {action:'ALLOW',method:'signTransaction',conditions:[{field_source:'solana_program_instruction',field:'programId',operator:'in',value:['6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P','ComputeBudget111111111111111111111111111111','ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL']}]},
  {action:'ALLOW',method:'signTransaction',conditions:[{field_source:'solana_system_program_instruction',field:'Transfer.lamports',operator:'lte',value:'10000000'}]}]};
assert.equal(verifiedSigningPolicy(goodPolicy),true);
assert.equal(verifiedSigningPolicy({...goodPolicy,rules:goodPolicy.rules.map(x=>({...x,method:'signAndSendTransaction'}))}),false);
assert.equal(verifiedSigningPolicy({...goodPolicy,rules:[...goodPolicy.rules,{action:'ALLOW',method:'*',conditions:[]}]}),false);
const ownerFetch=async url=>Response.json(url.includes('/policies/')?goodPolicy:{id:accountId,linked_accounts:[{type:'wallet',chain_type:'solana',wallet_client_type:'privy',id:walletId,address:wallet}]});
const sign=createPrivySigner(env,{client,fetcher:ownerFetch});
assert.equal(await sign({order,transaction:unsigned}),signed);delegated=false;
await assert.rejects(sign({order,transaction:unsigned}),/revoked/);assert.equal(signRequests,1);
const wrongOwner=createPrivySigner(env,{client,fetcher:async()=>Response.json({id:accountId,linked_accounts:[]})});
await assert.rejects(wrongOwner({order,transaction:unsigned}),/owner mismatch/);assert.equal(signRequests,1);
delegated=true;
const wrongPolicy=createPrivySigner(env,{client,fetcher:async url=>Response.json(url.includes('/policies/')?{...goodPolicy,rules:goodPolicy.rules.map(x=>({...x,method:'signAndSendTransaction'}))}:{id:accountId,linked_accounts:[{type:'wallet',chain_type:'solana',wallet_client_type:'privy',id:walletId,address:wallet}]})});
await assert.rejects(wrongPolicy({order,transaction:unsigned}),/policy incompatible/);assert.equal(signRequests,1);
console.log('PASS: 200 duplicate requests, durable-before-send, signer uncertainty, altered bytes/signatures, expiry, revocation, account ownership, finalized balance reconciliation');
