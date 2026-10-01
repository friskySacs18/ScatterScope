import assert from 'node:assert/strict';
import {Keypair,VersionedTransaction,ComputeBudgetProgram,TransactionMessage} from '@solana/web3.js';
import BN from 'bn.js';
import {PUMP_SDK} from '@pump-fun/pump-sdk';
import {diagnoseSigning} from './signing-diagnostic.js';
import {signerRequestFailure} from './privy-signer.js';
const wallet=Keypair.generate(),accountId='did:privy:account123';
const order={id:crypto.randomUUID(),accountId,wallet:wallet.publicKey.toBase58(),walletId:'a'.repeat(24),state:'not_submitted',failureHttpStatus:400,createdAt:Date.now()};
const data=new Map([['order:'+order.id,order]]);
const storage={get:async key=>data.get(key),put:async(key,value)=>data.set(key,value),list:async({prefix})=>new Map([...data].filter(([key])=>key.startsWith(prefix)))};
let signs=0;
const args={storage,env:{},accountId,connection:{getLatestBlockhash:async()=>({blockhash:Keypair.generate().publicKey.toBase58()})},signerFactory:()=>async({transaction,order:diagnostic})=>{
  signs++;assert.notEqual(diagnostic.id,order.id);
  const wire=VersionedTransaction.deserialize(Buffer.from(transaction,'base64'));
  assert.equal(wire.message.compiledInstructions.length,1);
  const ix=wire.message.compiledInstructions[0];
  assert.equal(wire.message.staticAccountKeys[ix.programIdIndex].toBase58(),ComputeBudgetProgram.programId.toBase58());
  wire.sign([wallet]);return Buffer.from(wire.serialize()).toString('base64');
}};
assert.equal((await diagnoseSigning(args)).state,'passed');
assert.equal((await diagnoseSigning(args)).state,'passed');
assert.equal(signs,1,'A rejected order gets one cached check, never repeated financial execution');
assert.equal(JSON.stringify([...data.values()]).includes('signedTransaction'),false);
assert.equal((await diagnoseSigning({...args,accountId:'did:privy:someoneelse'})).state,'not_needed');
data.delete('signing-diagnostic:'+order.id);
const failure=signerRequestFailure({status:400,error:{message:'Invalid request expiry. Secret secret-for-test. Bearer abcdef. https://example.test/private\n'+'Q'.repeat(90)}},{secrets:['secret-for-test']});
assert.equal(failure.code,'signer_request_expired');
for(const secret of ['secret-for-test','abcdef','https://example.test','Q'.repeat(90)])assert.equal(failure.providerMessage.includes(secret),false);
assert.ok(failure.providerMessage.includes('Invalid request expiry'));
const rejected=await diagnoseSigning({...args,signerFactory:()=>async()=>{throw failure}});
assert.equal(rejected.state,'failed');assert.equal(rejected.httpStatus,400);
assert.equal(rejected.providerMessage,failure.providerMessage);
assert.equal(data.get('order:'+order.id).state,'not_submitted','A health check never reopens the original trade');
const mint=Keypair.generate().publicKey;
data.set('order:'+order.id,{...order,mint:mint.toBase58(),amountLamports:'2000000'});
const ix=await PUMP_SDK.getBuyV2InstructionRaw({user:wallet.publicKey,mint,creator:wallet.publicKey,
  amount:new BN(1000),quoteAmount:new BN(2000000),feeRecipient:wallet.publicKey,buybackFeeRecipient:wallet.publicKey});
const unsigned=new VersionedTransaction(new TransactionMessage({payerKey:wallet.publicKey,recentBlockhash:mint.toBase58(),instructions:[ix]}).compileToV0Message());
let tradeSigns=0;
const networkFetch=globalThis.fetch;globalThis.fetch=async()=>Response.json({id:order.walletId,address:order.wallet,policy_ids:[],additional_signers:[]});
const trade=await diagnoseSigning({...args,kind:'trade',prepareBuy:async input=>{
  assert.equal(input.budgetLamports,'2000000');return {transaction:Buffer.from(unsigned.serialize()).toString('base64'),wallet:order.wallet,
    mint:mint.toBase58(),side:'buy',tokenAmountRaw:'1000',maximumSpendLamports:'2000000'};},
  signerFactory:()=>async()=>{tradeSigns++;throw signerRequestFailure({status:400,error:{message:'Unsupported instruction data'}})}});
assert.equal(trade.state,'failed');assert.equal(trade.kind,'trade');assert.equal(tradeSigns,1);
assert.equal(trade.providerMessage,'Unsupported instruction data');
assert.equal([...data.keys()].filter(key=>key.startsWith('order:')).length,1);
assert.equal(data.get('order:'+order.id).state,'not_submitted');
assert.equal(Object.hasOwn(trade,'transaction'),false);assert.equal(Object.hasOwn(trade,'signedTransaction'),false);
data.delete('signing-diagnostic:'+order.id+':trade-wallet-funding-v5');
const successfulTrade=await diagnoseSigning({...args,kind:'trade',prepareBuy:async()=>({transaction:Buffer.from(unsigned.serialize()).toString('base64'),
  wallet:order.wallet,mint:mint.toBase58(),side:'buy',tokenAmountRaw:'1000',maximumSpendLamports:'2000000'}),
  signerFactory:()=>async({transaction})=>{const wire=VersionedTransaction.deserialize(Buffer.from(transaction,'base64'));wire.sign([wallet]);return Buffer.from(wire.serialize()).toString('base64')}});
assert.equal(successfulTrade.state,'passed');
for(const value of data.values()){assert.equal(Object.hasOwn(value,'transaction'),false);assert.equal(Object.hasOwn(value,'signedTransaction'),false)}
assert.equal(data.get('order:'+order.id).state,'not_submitted');
globalThis.fetch=networkFetch;
console.log('PASS: compute-only signing check, cached result, account isolation, provider detail redaction, no broadcast or trade mutation');
