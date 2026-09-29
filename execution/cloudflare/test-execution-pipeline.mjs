import assert from 'node:assert/strict';
import {generateKeyPairSync} from 'node:crypto';
import BN from 'bn.js';
import {Keypair,PublicKey,VersionedTransaction,TransactionMessage,TransactionInstruction} from '@solana/web3.js';
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
const prepared={transaction:unsigned,wallet,mint,side:'buy',quoteAt:now,tokenAmountRaw:'1000',maximumSpendLamports:'2000000',reservedRentLamports:'2500000',lastValidBlockHeight:900};
function store(){const map=new Map([['order:'+orderId,{id:orderId,accountId,walletId,wallet,mint,amountLamports:'2000000',exitRules:{profitPercent:25,stopPercent:25},state:'reserved',signature:null}]]);let lock=Promise.resolve();return {map,get:async key=>map.get(key),transaction(fn){const result=lock.then(async()=>{const staged=new Map(map);const value=await fn({get:async k=>staged.get(k),put:async(k,v)=>staged.set(k,v),delete:async k=>staged.delete(k)});map.clear();for(const [k,v]of staged)map.set(k,v);return value});lock=result.catch(()=>{});return result}}}
const storage=store();await storage.transaction(async txn=>{const order=await txn.get('order:'+orderId);await txn.put('order:'+orderId,{...order,signalId:'callout-12345'})});let signs=0,sends=0;
const args={storage,orderId,prepared,authorize:async()=>true,sign:async()=>{signs++;return signed},rpcUrl,now:()=>now,fetcher:async(url,init)=>{sends++;const journal=await storage.get('order:'+orderId);assert.equal(journal.signedTransaction,signed,'Signed bytes durable BEFORE submission');assert.equal(journal.signature,identity.signature);assert.equal(JSON.parse(init.body).method,'sendTransaction');throw Error('RPC accepted but response lost')}};
const outcomes=await Promise.all(Array.from({length:200},()=>executeReservedOrder(args)));
assert.equal(signs,1);assert.equal(sends,1);assert.equal(outcomes.filter(x=>x.state==='unknown').length,1);
assert.equal((await executeReservedOrder(args)).state,'broadcast');assert.equal(signs,1);
const preBalances=Array(tx.message.staticAccountKeys.length).fill(0),postBalances=[...preBalances];
preBalances[0]=10000000;postBalances[0]=7995000;
const final={slot:123,transaction:[signed,'base64'],meta:{err:null,fee:5000,preBalances,postBalances,preTokenBalances:[],postTokenBalances:[{accountIndex:1,mint,owner:wallet,uiTokenAmount:{amount:'1000'}}]}};
const fetcher=async(url,init)=>{const method=JSON.parse(init.body).method;return Response.json({jsonrpc:'2.0',id:1,result:method==='getSignatureStatuses'?{value:[{confirmationStatus:'finalized',err:null}]}:final})};
const result=await reconcileOrder({storage,orderId,rpcUrl,fetcher});assert.equal(result.state,'confirmed');assert.equal(result.receipt.tokenDeltaRaw,'1000');
assert.equal((await storage.get('order:'+orderId)).state,'confirmed');
assert.equal((await storage.get('position:'+mint)).costLamports,'2000000');
assert.equal((await storage.get('position:'+mint)).amountRaw,'1000');
await reconcileOrder({storage,orderId,rpcUrl,fetcher:()=>{throw Error('Should not requery settled order')}});
const failedSellId=crypto.randomUUID();
storage.map.set('order:'+failedSellId,{id:failedSellId,side:'sell',accountId,wallet,mint,buyOrderId:orderId,
  amountRaw:'1000',state:'broadcast',signature:identity.signature,signedTransaction:signed});
storage.map.set('sell:'+mint,failedSellId);
const failedResult={...final,meta:{...final.meta,err:{InstructionError:[0,'Custom']}}};
const failedFetcher=async(url,init)=>Response.json({jsonrpc:'2.0',id:1,result:JSON.parse(init.body).method==='getSignatureStatuses'?{value:[{confirmationStatus:'finalized',err:failedResult.meta.err}]}:failedResult});
assert.equal((await reconcileOrder({storage,orderId:failedSellId,rpcUrl,fetcher:failedFetcher})).state,'failed');
assert.equal(await storage.get('sell:'+mint),undefined,'Finalized failed sell releases only its reservation');
assert.equal(await storage.get('sell-failures:'+mint),1,'Finalized failure counts toward the retry ceiling');
assert.equal((await storage.get('position:'+mint)).state,'open','Failed sell leaves the position open for another exit attempt');
assert.equal((await reconcileOrder({storage,orderId:failedSellId,rpcUrl,fetcher:()=>{throw Error('No repeated chain query')}})).state,'failed');
const order=await storage.get('order:'+orderId);
assert.throws(()=>verifySettlement(order,{...final,transaction:[unsigned,'base64']}),/mismatch/);
assert.throws(()=>verifySettlement(order,{...final,meta:{...final.meta,postTokenBalances:[]}}),/Buy settlement/);
assert.throws(()=>verifySettlement(order,{...final,meta:{...final.meta,postBalances:[1000]}}),/balance evidence/);
const associated=new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');
const token=new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
const ata=PublicKey.findProgramAddressSync([pair.publicKey.toBuffer(),token.toBuffer(),new PublicKey(mint).toBuffer()],associated)[0].toBase58();
const rentTx=new VersionedTransaction(new TransactionMessage({payerKey:pair.publicKey,recentBlockhash:mint,
  instructions:[ix,new TransactionInstruction({programId:associated,keys:[{pubkey:new PublicKey(ata),isSigner:false,isWritable:true}],data:Buffer.alloc(0)})]}).compileToV0Message());
rentTx.sign([pair]);const rentSigned=Buffer.from(rentTx.serialize()).toString('base64');
const rentPre=Array(rentTx.message.staticAccountKeys.length).fill(0),rentPost=[...rentPre];
rentPre[0]=10000000;rentPost[0]=5955720;
const ataIndex=rentTx.message.staticAccountKeys.findIndex(key=>key.toBase58()===ata);
assert.ok(ataIndex>0);rentPost[ataIndex]=2039280;
const rentReceipt=verifySettlement({...order,signedTransaction:rentSigned},{...final,transaction:[rentSigned,'base64'],
  meta:{...final.meta,preBalances:rentPre,postBalances:rentPost}});
assert.equal(rentReceipt.rentPaidLamports,'2039280');
assert.equal(rentReceipt.tradeCostLamports,'2000000');
assert.throws(()=>verifySettlement(order,{...final,meta:{...final.meta,postTokenBalances:[{accountIndex:1,mint,uiTokenAmount:{amount:'1000'}}]}}),/Missing token owner/);
const noReceipt=store();await executeReservedOrder({...args,storage:noReceipt});
assert.equal((await reconcileOrder({storage:noReceipt,orderId,rpcUrl,fetcher:async(url,init)=>Response.json({jsonrpc:'2.0',id:1,result:JSON.parse(init.body).method==='getSignatureStatuses'?{value:[{confirmationStatus:'finalized',err:null}]}:null})})).state,'reconciliation_pending');
const revoked=store();let revokedSign=0;await assert.rejects(executeReservedOrder({...args,storage:revoked,authorize:async()=>false,sign:async()=>{revokedSign++;return signed}}),/revoked/);assert.equal(revokedSign,0);
const uncertain=store();let attempts=0;const failed={...args,storage:uncertain,sign:async()=>{attempts++;throw Error('Signer timeout')}};
assert.equal((await executeReservedOrder(failed)).state,'signing_unknown');await executeReservedOrder(failed);assert.equal(attempts,1);
await assert.rejects(executeReservedOrder({...args,storage:store(),prepared:{...prepared,quoteAt:now-6000}}),/freshness/);

const {privateKey:signerTestKey,publicKey:signerTestPublic}=generateKeyPairSync('ec',{namedCurve:'prime256v1'});
const env={PRIVY_APP_SECRET:'test-only',SCOPE_PRIVY_SIGNER_PRIVATE_KEY_PEM:signerTestKey.export({format:'der',type:'pkcs8'}).toString('base64'),SCOPE_PRIVY_SIGNER_QUORUM_ID:'igsys5hz5fmsly8v2q242jgo',SCOPE_PRIVY_POLICY_ID:'qhtl0rqr7553234g6zb7dna2'};
let delegated=true,signRequests=0;
const client={wallets:()=>({get:async()=>({id:walletId,address:wallet,chain_type:'solana',archived_at:null,additional_signers:delegated?[{signer_id:env.SCOPE_PRIVY_SIGNER_QUORUM_ID,override_policy_ids:[env.SCOPE_PRIVY_POLICY_ID]}]:[]}),solana:()=>({signTransaction:async(id,input)=>{signRequests++;assert.equal(id,walletId);assert.equal(input.idempotency_key,orderId);assert.equal(input.transaction,unsigned);return {encoding:'base64',signed_transaction:signed}}})})};
const goodPolicy={id:env.SCOPE_PRIVY_POLICY_ID,chain_type:'solana',owner_id:env.SCOPE_PRIVY_SIGNER_QUORUM_ID,rules:[
  {action:'ALLOW',method:'signTransaction',conditions:[{field_source:'solana_program_instruction',field:'programId',operator:'in',value:['6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P','ComputeBudget111111111111111111111111111111','ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL']}]},
  {action:'ALLOW',method:'signTransaction',conditions:[{field_source:'solana_system_program_instruction',field:'Transfer.lamports',operator:'lte',value:'10000000'}]}]};
assert.equal(verifiedSigningPolicy(goodPolicy),true);
assert.equal(verifiedSigningPolicy({...goodPolicy,owner_id:null}),true,'Dashboard-created policies may have no resource owner');
assert.equal(verifiedSigningPolicy({...goodPolicy,owner_id:'wrong-quorum'}),false);
assert.equal(verifiedSigningPolicy({...goodPolicy,rules:goodPolicy.rules.map(x=>({...x,method:'signAndSendTransaction'}))}),false);
assert.equal(verifiedSigningPolicy({...goodPolicy,rules:[...goodPolicy.rules,{action:'ALLOW',method:'*',conditions:[]}]}),false);
const tradePolicy={...goodPolicy,id:'abcdefghijklmnopqrstuvwx',rules:[
  {...goodPolicy.rules[0],conditions:[{...goodPolicy.rules[0].conditions[0],value:[...goodPolicy.rules[0].conditions[0].value,
    'pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA','TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA','TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb']}]},
  {...goodPolicy.rules[1],conditions:[{field_source:'solana_system_program_instruction',field:'Transfer.to',operator:'eq',value:'4dWv5mpSYfiw4iMjzgF51fF2eGchByQMTPpWibgZzYMz'}]}]};
assert.equal(verifiedSigningPolicy(tradePolicy,tradePolicy.id),true);
assert.equal(verifiedSigningPolicy({...tradePolicy,rules:[{...tradePolicy.rules[0],conditions:[...tradePolicy.rules[0].conditions,...tradePolicy.rules[1].conditions]}]},tradePolicy.id),false);
assert.equal(verifiedSigningPolicy({...tradePolicy,rules:[tradePolicy.rules[0],goodPolicy.rules[1]]},tradePolicy.id),false);
assert.equal(verifiedSigningPolicy({...tradePolicy,rules:[tradePolicy.rules[0],{...tradePolicy.rules[1],conditions:[{...tradePolicy.rules[1].conditions[0],value:wallet}]}]},tradePolicy.id),false);
const quorum={id:env.SCOPE_PRIVY_SIGNER_QUORUM_ID,authorization_threshold:1,authorization_keys:[{public_key:signerTestPublic.export({format:'der',type:'spki'}).toString('base64')}]};
const ownerFetch=async url=>Response.json(url.includes('/policies/')?goodPolicy:url.includes('/key_quorums/')?quorum:{id:accountId,linked_accounts:[{type:'wallet',chain_type:'solana',wallet_client_type:'privy',id:walletId,address:wallet}]});
const sign=createPrivySigner(env,{client,fetcher:ownerFetch});
assert.equal(await sign({order,transaction:unsigned}),signed);delegated=false;
await assert.rejects(sign({order,transaction:unsigned}),/revoked/);assert.equal(signRequests,1);
const wrongOwner=createPrivySigner(env,{client,fetcher:async()=>Response.json({id:accountId,linked_accounts:[]})});
await assert.rejects(wrongOwner({order,transaction:unsigned}),/owner mismatch/);assert.equal(signRequests,1);
delegated=true;
const wrongPolicy=createPrivySigner(env,{client,fetcher:async url=>Response.json(url.includes('/policies/')?{...goodPolicy,rules:goodPolicy.rules.map(x=>({...x,method:'signAndSendTransaction'}))}:url.includes('/key_quorums/')?quorum:{id:accountId,linked_accounts:[{type:'wallet',chain_type:'solana',wallet_client_type:'privy',id:walletId,address:wallet}]})});
await assert.rejects(wrongPolicy({order,transaction:unsigned}),/policy incompatible/);assert.equal(signRequests,1);
console.log('PASS: 200 duplicate requests, durable-before-send, signer uncertainty, altered bytes/signatures, expiry, revocation, account ownership, finalized balance reconciliation');
