import assert from 'node:assert/strict';
import {Keypair,SystemProgram,TransactionMessage,VersionedTransaction} from '@solana/web3.js';
import {validateSignedWithdrawal} from '../worker/withdrawal.js';

const sender=Keypair.generate(),recipient=Keypair.generate().publicKey;
const transfer=new VersionedTransaction(new TransactionMessage({payerKey:sender.publicKey,recentBlockhash:Keypair.generate().publicKey.toBase58(),instructions:[SystemProgram.transfer({fromPubkey:sender.publicKey,toPubkey:recipient,lamports:5000000})]}).compileToV0Message());
transfer.sign([sender]);
const encoded=Buffer.from(transfer.serialize()).toString('base64');
const fields={wallet:sender.publicKey.toBase58(),destination:recipient.toBase58(),lamports:5000000};
assert.equal((await validateSignedWithdrawal(encoded,fields)).signature.length>=80,true);
await assert.rejects(validateSignedWithdrawal(encoded,{...fields,lamports:6000000}),/amount differs/);
await assert.rejects(validateSignedWithdrawal(encoded,{...fields,destination:Keypair.generate().publicKey.toBase58()}),/accounts differ/);
const tampered=Buffer.from(transfer.serialize());tampered[tampered.length-1]^=1;
await assert.rejects(validateSignedWithdrawal(tampered.toString('base64'),fields),/Unexpected transfer data|signature invalid/);
const extra=new VersionedTransaction(new TransactionMessage({payerKey:sender.publicKey,recentBlockhash:Keypair.generate().publicKey.toBase58(),instructions:[SystemProgram.transfer({fromPubkey:sender.publicKey,toPubkey:recipient,lamports:5000000}),SystemProgram.transfer({fromPubkey:sender.publicKey,toPubkey:recipient,lamports:1})]}).compileToV0Message());extra.sign([sender]);
await assert.rejects(validateSignedWithdrawal(Buffer.from(extra.serialize()).toString('base64'),fields),/Unexpected transfer instruction/);
console.log('Signed withdrawal and transfer-only constraints verified.');
