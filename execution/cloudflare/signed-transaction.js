import {VersionedTransaction} from '@solana/web3.js';
import bs58 from 'bs58';

export function decodeTransaction(encoded){
  if(typeof encoded!=='string'||encoded.length>1800||!/^[A-Za-z0-9+/]+={0,2}$/.test(encoded))throw Error('Invalid transaction encoding');
  const bytes=Buffer.from(encoded,'base64');
  if(bytes.length>1232||bytes.length<100||bytes.toString('base64')!==encoded)throw Error('Invalid transaction size');
  const tx=VersionedTransaction.deserialize(bytes);
  if(tx.message.version!==0||tx.message.addressTableLookups.length||tx.signatures.length!==1||tx.message.header.numRequiredSignatures!==1)throw Error('Unsupported transaction signers or lookup tables');
  return tx;
}

// The signer is not a transaction builder. It must return exactly the message
// we prepared, signed by the expected wallet, including the same blockhash.
export async function verifySignedTransaction({unsigned,signed,wallet}){
  const original=decodeTransaction(unsigned),result=decodeTransaction(signed);
  if(!original.signatures[0].every(x=>x===0))throw Error('Expected unsigned preparation');
  if(original.message.staticAccountKeys[0].toBase58()!==wallet||result.message.staticAccountKeys[0].toBase58()!==wallet)throw Error('Wrong signing wallet');
  const message=original.message.serialize();
  if(!Buffer.from(message).equals(Buffer.from(result.message.serialize())))throw Error('Signer changed the transaction');
  const key=await crypto.subtle.importKey('raw',original.message.staticAccountKeys[0].toBytes(),'Ed25519',false,['verify']);
  if(!await crypto.subtle.verify('Ed25519',key,result.signatures[0],message))throw Error('Invalid wallet signature');
  return {signature:bs58.encode(result.signatures[0]),signedTransaction:signed};
}
