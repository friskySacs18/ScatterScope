import assert from 'node:assert/strict';
import {Keypair,PublicKey,SystemProgram,TransactionInstruction,TransactionMessage,VersionedTransaction} from '@solana/web3.js';
import {canonicalPumpPoolPda,PUMP_AMM_PROGRAM_ID} from '@pump-fun/pump-swap-sdk';
import {inspectPumpAmmSellTransaction,inspectPumpAmmBuyTransaction} from './inspect-pump-amm.js';
const wallet=Keypair.generate().publicKey,mint=Keypair.generate().publicKey;
const token=new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
const wsol=new PublicKey('So11111111111111111111111111111111111111112');
const ata=new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');
const wsolAta=PublicKey.findProgramAddressSync([wallet.toBuffer(),token.toBuffer(),wsol.toBuffer()],ata)[0];
const key=()=>Keypair.generate().publicKey;
const baseAta=PublicKey.findProgramAddressSync([wallet.toBuffer(),token.toBuffer(),mint.toBuffer()],ata)[0];
const accounts=[canonicalPumpPoolPda(mint),wallet,key(),mint,wsol,baseAta,wsolAta,key(),key(),key(),key(),key(),token,token,
  new PublicKey('11111111111111111111111111111111'),ata,key(),PUMP_AMM_PROGRAM_ID].map((pubkey,i)=>({pubkey,isSigner:i===1,isWritable:true}));
// The IDL's fixed account prefix is checked; remaining fee accounts are
// supplied by the SDK and separately simulated against current RPC state.
const data=Buffer.alloc(24);Buffer.from('33e685a4017f83ad','hex').copy(data);data.writeBigUInt64LE(1000n,8);data.writeBigUInt64LE(1900000n,16);
const trade=new TransactionInstruction({programId:PUMP_AMM_PROGRAM_ID,keys:accounts,data});
const close=new TransactionInstruction({programId:token,keys:[{pubkey:wsolAta,isSigner:false,isWritable:true},
  {pubkey:wallet,isSigner:false,isWritable:true},{pubkey:wallet,isSigner:true,isWritable:false}],data:Buffer.from([9])});
const tx=new VersionedTransaction(new TransactionMessage({payerKey:wallet,recentBlockhash:key().toBase58(),instructions:[trade,close]}).compileToV0Message());
const encoded=Buffer.from(tx.serialize()).toString('base64');
const input={wallet:wallet.toBase58(),mint:mint.toBase58(),amountRaw:'1000',limitLamports:'1900000'};
assert.equal(inspectPumpAmmSellTransaction(encoded,input).valid,true);
assert.equal(inspectPumpAmmSellTransaction(encoded,{...input,amountRaw:'1001'}).valid,false);
assert.equal(inspectPumpAmmSellTransaction(encoded,{...input,mint:key().toBase58()}).valid,false);
assert.equal(inspectPumpAmmSellTransaction(encoded,{...input,wallet:key().toBase58()}).valid,false);
const extra=new TransactionInstruction({programId:new PublicKey('11111111111111111111111111111111'),keys:[],data:Buffer.alloc(0)});
const unexpected=new VersionedTransaction(new TransactionMessage({payerKey:wallet,recentBlockhash:key().toBase58(),instructions:[trade,extra,close]}).compileToV0Message());
assert.equal(inspectPumpAmmSellTransaction(Buffer.from(unexpected.serialize()).toString('base64'),input).valid,false);
const buyData=Buffer.alloc(25);Buffer.from('66063d1201daebea','hex').copy(buyData);buyData.writeBigUInt64LE(1000n,8);buyData.writeBigUInt64LE(2000000n,16);buyData[24]=1;
const buyAccounts=accounts.map((a,i)=>i===5?{...a,pubkey:baseAta}:a);
const buyIx=new TransactionInstruction({programId:PUMP_AMM_PROGRAM_ID,keys:buyAccounts,data:buyData});
const transfer=SystemProgram.transfer({fromPubkey:wallet,toPubkey:wsolAta,lamports:2000000n});
const sync=new TransactionInstruction({programId:token,keys:[{pubkey:wsolAta,isSigner:false,isWritable:true}],data:Buffer.from([17])});
const buyTx=new VersionedTransaction(new TransactionMessage({payerKey:wallet,recentBlockhash:key().toBase58(),instructions:[transfer,sync,buyIx,close]}).compileToV0Message());
const buyEncoded=Buffer.from(buyTx.serialize()).toString('base64');
const buyInput={...input,limitLamports:'2000000',tokenProgram:token.toBase58()};
assert.equal(inspectPumpAmmBuyTransaction(buyEncoded,buyInput).valid,true);
assert.equal(inspectPumpAmmBuyTransaction(buyEncoded,{...buyInput,limitLamports:'1999999'}).valid,false);
const buyWithExtra=new VersionedTransaction(new TransactionMessage({payerKey:wallet,recentBlockhash:key().toBase58(),instructions:[transfer,sync,buyIx,extra,close]}).compileToV0Message());
assert.equal(inspectPumpAmmBuyTransaction(Buffer.from(buyWithExtra.serialize()).toString('base64'),buyInput).valid,false);
console.log('PumpSwap sell inspector rejects changed signer, mint, amount and extra transfer');
