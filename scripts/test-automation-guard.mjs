import assert from 'node:assert/strict';
import {Keypair,PublicKey,TransactionInstruction,TransactionMessage,VersionedTransaction,ComputeBudgetProgram,SystemProgram} from '@solana/web3.js';
import {inspectAutomatedBuy} from '../worker/automation-guard.js';
import worker from '../worker/index.js';

const wallet=Keypair.generate().publicKey,mint=Keypair.generate().publicKey;
const pump=new PublicKey('6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P');
const system=SystemProgram.programId,token=new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
const random=()=>Keypair.generate().publicKey;
const accounts=[random(),random(),mint,random(),random(),random(),wallet,system,token,random(),random(),pump,random(),random(),random(),random()];
function buy(max=500000000n,mintOverride=mint){
  const data=Buffer.alloc(25);Buffer.from([102,6,61,18,1,218,235,234]).copy(data);data.writeBigUInt64LE(10000n,8);data.writeBigUInt64LE(max,16);
  return new TransactionInstruction({programId:pump,keys:accounts.map((key,index)=>({pubkey:index===2?mintOverride:key,isWritable:index===6||index===2,isSigner:index===6})),data});
}
function transaction(instructions){return new VersionedTransaction(new TransactionMessage({payerKey:wallet,recentBlockhash:random().toBase58(),instructions}).compileToV0Message()).serialize()}
const options={wallet:wallet.toBase58(),mint:mint.toBase58(),maxSpendSol:.5};
const good=transaction([ComputeBudgetProgram.setComputeUnitLimit({units:250000}),ComputeBudgetProgram.setComputeUnitPrice({microLamports:10000}),buy()]);
assert.equal(inspectAutomatedBuy(good,options).maximumLamports,'500000000');
assert.equal(inspectAutomatedBuy(transaction([buy(20000000000n)]),{...options,maxSpendSol:20}).maximumLamports,'20000000000');
assert.throws(()=>inspectAutomatedBuy(transaction([buy(20000000001n)]),{...options,maxSpendSol:20}),/maximum exceeds/);
assert.throws(()=>inspectAutomatedBuy(transaction([buy(500000001n)]),options),/maximum exceeds/);
assert.throws(()=>inspectAutomatedBuy(transaction([buy(500000000n,random())]),options),/Unexpected Pump/);
assert.throws(()=>inspectAutomatedBuy(transaction([buy(),buy()]),options),/Unexpected Pump/);
assert.throws(()=>inspectAutomatedBuy(transaction([SystemProgram.transfer({fromPubkey:wallet,toPubkey:random(),lamports:1}),buy()]),options),/unapproved/);
assert.throws(()=>inspectAutomatedBuy(transaction([ComputeBudgetProgram.setComputeUnitPrice({microLamports:1000001}),buy()]),options),/Priority fee/);
assert.throws(()=>inspectAutomatedBuy(good,{...options,wallet:random().toBase58()}),/payer differs/);
assert.throws(()=>inspectAutomatedBuy(good.slice(0,-1),options),/Truncated|trailing/);
const url='https://example.test/api/automation/inspect-buy';
const response=await worker.fetch(new Request(url,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({transaction:Buffer.from(good).toString('base64'),...options})}),{});
assert.equal(response.status,200);assert.equal((await response.json()).executionEnabled,false);
const rejected=await worker.fetch(new Request(url,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({transaction:Buffer.from(transaction([buy(999999999n)])).toString('base64'),...options})}),{});
assert.equal(rejected.status,422);
console.log('Pump buy envelope, SOL ceiling, mint, payer, extra instructions and priority fee verified');
