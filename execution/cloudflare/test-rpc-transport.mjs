import assert from 'node:assert/strict';
import bs58 from 'bs58';
import {Keypair,TransactionMessage,VersionedTransaction,SystemProgram} from '@solana/web3.js';
import {broadcastRecordedTransaction,finalizedStatus} from './rpc-transport.js';

const signer=Keypair.fromSeed(Uint8Array.from({length:32},(_,i)=>i+1));
const tx=new VersionedTransaction(new TransactionMessage({payerKey:signer.publicKey,recentBlockhash:signer.publicKey.toBase58(),
  instructions:[SystemProgram.transfer({fromPubkey:signer.publicKey,toPubkey:signer.publicKey,lamports:1})]}).compileToV0Message());
tx.sign([signer]);
const encoded=Buffer.from(tx.serialize()).toString('base64'),signature=bs58.encode(tx.signatures[0]),rpcUrl='https://api.mainnet-beta.solana.com/';
let calls=0;
const ok=async(url,init)=>{calls++;assert.equal(url,rpcUrl);const body=JSON.parse(init.body);assert.equal(body.params[0],encoded);assert.equal(body.params[1].skipPreflight,false);return Response.json({jsonrpc:'2.0',id:1,result:signature})};
assert.equal((await broadcastRecordedTransaction({encoded,recordedSignature:signature,rpcUrl,fetcher:ok})).state,'submitted');
await assert.rejects(broadcastRecordedTransaction({encoded,recordedSignature:'2'.repeat(88),rpcUrl,fetcher:ok}),/mismatch/);
assert.equal(calls,1,'A mismatched signature must never reach RPC');
assert.equal((await broadcastRecordedTransaction({encoded,recordedSignature:signature,rpcUrl,fetcher:async()=>{throw Error('timeout')}})).state,'unknown');
await assert.rejects(broadcastRecordedTransaction({encoded,recordedSignature:signature,rpcUrl:'https://evil.example/',fetcher:ok}),/Unapproved/);
const query=async()=>Response.json({jsonrpc:'2.0',id:1,result:{value:[{confirmationStatus:'confirmed',err:null}]}});
assert.equal((await finalizedStatus({signature,rpcUrl,fetcher:query})).state,'pending');
const final=async()=>Response.json({jsonrpc:'2.0',id:1,result:{value:[{confirmationStatus:'finalized',err:null}]}});
assert.equal((await finalizedStatus({signature,rpcUrl,fetcher:final})).state,'confirmed');
console.log('RPC transport verifies recorded signatures, rejects alternate endpoints and preserves uncertain outcomes');
