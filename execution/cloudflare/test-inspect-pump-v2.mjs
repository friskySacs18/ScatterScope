import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {Keypair,PublicKey,TransactionInstruction,TransactionMessage,VersionedTransaction,SystemProgram} from '@solana/web3.js';
import {inspectPumpV2Transaction} from './inspect-pump-v2.js';

const pump=new PublicKey('6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P');
const ata=new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');
const token=new PublicKey('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb');
const spl=new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
const wallet=Keypair.fromSeed(Uint8Array.from({length:32},(_,i)=>i+1)).publicKey;
const mint=Keypair.fromSeed(Uint8Array.from({length:32},(_,i)=>i+33)).publicKey;
const arbitrary=i=>Keypair.fromSeed(Uint8Array.from({length:32},(_,j)=>(i+j+67)%256)).publicKey;
const derived=(seeds,program)=>PublicKey.findProgramAddressSync(seeds,program)[0];
const keys=side=>{
  const n=side==='buy'?27:26;
  const list=Array.from({length:n},(_,i)=>arbitrary(i+1));
  list[0]=derived([Buffer.from('global')],pump);
  list[1]=mint;list[2]=new PublicKey('So11111111111111111111111111111111111111112');
  list[3]=token;list[4]=spl;list[5]=ata;
  list[10]=derived([Buffer.from('bonding-curve'),mint.toBuffer()],pump);
  list[13]=wallet;
  list[14]=derived([wallet.toBuffer(),token.toBuffer(),mint.toBuffer()],ata);
  list[n-3]=SystemProgram.programId;
  list[n-1]=pump;
  return list;
};
function transaction(side,{amount=1200000n,limit=3000000n,extra=false,createAta=false,ataOwner=wallet,ataMint=mint,ataToken=token,duplicateAta=false}={}){
  const data=Buffer.alloc(24);
  createHash('sha256').update('global:'+side+'_v2').digest().copy(data,0,0,8);
  data.writeBigUInt64LE(amount,8);data.writeBigUInt64LE(limit,16);
  const trade=new TransactionInstruction({programId:pump,keys:keys(side).map(pubkey=>({pubkey,isSigner:pubkey.equals(wallet),isWritable:true})),data});
  const destination=derived([ataOwner.toBuffer(),ataToken.toBuffer(),ataMint.toBuffer()],ata);
  const create=new TransactionInstruction({programId:ata,keys:[wallet,destination,ataOwner,ataMint,SystemProgram.programId,ataToken].map(pubkey=>({pubkey,isSigner:pubkey.equals(wallet),isWritable:true})),data:Buffer.from([1])});
  const instructions=[...(createAta?[create]:[]),...(duplicateAta?[create]:[]),trade,...(extra?[SystemProgram.transfer({fromPubkey:wallet,toPubkey:arbitrary(30),lamports:1})]:[])];
  const message=new TransactionMessage({payerKey:wallet,recentBlockhash:arbitrary(31).toBase58(),instructions}).compileToV0Message();
  return Buffer.from(new VersionedTransaction(message).serialize()).toString('base64');
}
for(const side of ['buy','sell']){
  const encoded=transaction(side),evidence={wallet:wallet.toBase58(),mint:mint.toBase58(),side,amountRaw:'1200000',limitLamports:'3000000'};
  assert.equal(inspectPumpV2Transaction(encoded,evidence).valid,true,side);
  assert.equal(inspectPumpV2Transaction(encoded,{...evidence,mint:arbitrary(99).toBase58()}).valid,false);
  assert.equal(inspectPumpV2Transaction(encoded,{...evidence,limitLamports:'3000001'}).valid,false);
  assert.equal(inspectPumpV2Transaction(transaction(side,{extra:true}),evidence).reason,'unexpected_program');
  if(side==='buy'){
    assert.equal(inspectPumpV2Transaction(transaction(side,{createAta:true}),evidence).valid,true);
    assert.equal(inspectPumpV2Transaction(transaction(side,{createAta:true,ataOwner:arbitrary(77)}),evidence).reason,'unexpected_ata_accounts');
    assert.equal(inspectPumpV2Transaction(transaction(side,{createAta:true,ataMint:arbitrary(78)}),evidence).reason,'unexpected_ata_accounts');
    assert.equal(inspectPumpV2Transaction(transaction(side,{createAta:true,ataToken:spl}),evidence).reason,'ata_trade_mismatch');
    assert.equal(inspectPumpV2Transaction(transaction(side,{createAta:true,duplicateAta:true}),evidence).reason,'unexpected_ata_instruction');
  }else assert.equal(inspectPumpV2Transaction(transaction(side,{createAta:true}),evidence).reason,'unexpected_ata_instruction');
}
console.log('Pump v2 inspection verifies signer, mint, trade limits and one matching token-account create; extra transfers and mismatched accounts are rejected');
