import assert from 'node:assert/strict';
import BN from 'bn.js';
import {Keypair,PublicKey,TransactionMessage,VersionedTransaction} from '@solana/web3.js';
import {PUMP_SDK} from '@pump-fun/pump-sdk';
import {inspectPumpV2Transaction} from './inspect-pump-v2.js';

const wallet=Keypair.fromSeed(Uint8Array.from({length:32},(_,i)=>i+1)).publicKey;
const mint=Keypair.fromSeed(Uint8Array.from({length:32},(_,i)=>i+41)).publicKey;
const arbitrary=i=>Keypair.fromSeed(Uint8Array.from({length:32},(_,j)=>(i+j+91)%256)).publicKey;
const ix=await PUMP_SDK.getBuyV2InstructionRaw({user:wallet,mint,creator:arbitrary(3),amount:new BN('1000000'),
  quoteAmount:new BN('1900000'),tokenProgram:new PublicKey('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb'),
  quoteMint:new PublicKey('So11111111111111111111111111111111111111112'),
  quoteTokenProgram:new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
  feeRecipient:arbitrary(4),buybackFeeRecipient:arbitrary(5)});
const transaction=new VersionedTransaction(new TransactionMessage({payerKey:wallet,recentBlockhash:arbitrary(6).toBase58(),instructions:[ix]}).compileToV0Message());
const result=inspectPumpV2Transaction(Buffer.from(transaction.serialize()).toString('base64'),{
  wallet:wallet.toBase58(),mint:mint.toBase58(),side:'buy',amountRaw:'1000000',limitLamports:'1900000'});
assert.equal(result.valid,true,JSON.stringify(result));
console.log('Official Pump SDK buy_v2 transaction passes the staged structural inspector');
