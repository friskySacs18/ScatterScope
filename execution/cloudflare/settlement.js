import {decodeTransaction} from './signed-transaction.js';
import {PublicKey} from '@solana/web3.js';
import {userVolumeAccumulatorPda} from '@pump-fun/pump-sdk';
import {canonicalPumpPoolPda} from '@pump-fun/pump-swap-sdk';

const ASSOCIATED=new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');
const TOKEN_PROGRAMS=['TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
  'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb'];

function verifiedAccountRent(tx,meta,wallet,mint,venue){
  const keys=tx.message.staticAccountKeys;
  if(meta.preBalances?.length!==keys.length||meta.postBalances?.length!==keys.length)
    throw Error('Incomplete account balance evidence');
  const user=new PublicKey(wallet),coin=new PublicKey(mint);
  const possible=new Set([userVolumeAccumulatorPda(user).toBase58(),...TOKEN_PROGRAMS.map(id=>{
    const token=new PublicKey(id);
    return PublicKey.findProgramAddressSync([user.toBuffer(),token.toBuffer(),coin.toBuffer()],ASSOCIATED)[0].toBase58();
  })]);
  const pool=venue==='pump-amm'?canonicalPumpPoolPda(coin).toBase58():null;
  let paid=0n;
  for(let i=1;i<keys.length;i++){
    const before=meta.preBalances[i],after=meta.postBalances[i];
    if(!Number.isSafeInteger(before)||before<0||!Number.isSafeInteger(after)||after<0)
      throw Error('Invalid account balance evidence');
    if(possible.has(keys[i].toBase58())&&before===0&&after>0)paid+=BigInt(after);
    if(pool===keys[i].toBase58()&&after>before)paid+=BigInt(after-before);
  }
  return paid;
}

function rawTokenTotal(entries,wallet,mint){
  if(!Array.isArray(entries))throw Error('Missing token balance evidence');
  let total=0n;const seen=new Set();
  for(const entry of entries){
    if(entry.mint!==mint)continue;
    if(typeof entry.owner!=='string')throw Error('Missing token owner');
    if(entry.owner!==wallet)continue;
    if(!Number.isSafeInteger(entry.accountIndex)||seen.has(entry.accountIndex)||!/^(0|[1-9]\d*)$/.test(entry.uiTokenAmount?.amount))throw Error('Invalid token balance evidence');
    seen.add(entry.accountIndex);total+=BigInt(entry.uiTokenAmount.amount);
  }
  return total;
}

export function verifySettlement(order,result){
  if(!result||!Number.isSafeInteger(result.slot)||result.slot<1||!result.meta||!Object.hasOwn(result.meta,'err')||
    !Array.isArray(result.transaction)||result.transaction[1]!=='base64'||result.transaction[0]!==order.signedTransaction)throw Error('Transaction receipt mismatch');
  const tx=decodeTransaction(result.transaction[0]),meta=result.meta;
  if(tx.message.staticAccountKeys[0]?.toBase58()!==order.wallet||!Number.isSafeInteger(meta.fee)||meta.fee<0||
    !Number.isSafeInteger(meta.preBalances?.[0])||!Number.isSafeInteger(meta.postBalances?.[0])||meta.preBalances[0]<0||meta.postBalances[0]<0)throw Error('Invalid payer settlement');
  if(meta.err!==null)return {state:'failed',slot:result.slot,feeLamports:String(meta.fee)};
  const tokenDelta=rawTokenTotal(meta.postTokenBalances,order.wallet,order.mint)-rawTokenTotal(meta.preTokenBalances,order.wallet,order.mint);
  const solDelta=BigInt(meta.postBalances[0])-BigInt(meta.preBalances[0]);
  const prepared=order.prepared;
  const rent=verifiedAccountRent(tx,meta,order.wallet,order.mint,prepared.venue);
  if((order.side||'buy')==='buy'){
    const tradeCost=-solDelta-BigInt(meta.fee)-rent;
    if(tokenDelta!==BigInt(prepared.tokenAmountRaw)||solDelta>=0n||rent>BigInt(prepared.reservedRentLamports)||
      tradeCost<=0n||tradeCost>BigInt(prepared.maximumSpendLamports)||
      -solDelta>BigInt(prepared.maximumSpendLamports)+BigInt(prepared.reservedRentLamports)+BigInt(meta.fee))
      throw Error('Buy settlement exceeds expected amounts');
    return {state:'confirmed',slot:result.slot,feeLamports:String(meta.fee),tokenDeltaRaw:tokenDelta.toString(),
      solDeltaLamports:solDelta.toString(),tradeCostLamports:tradeCost.toString(),rentPaidLamports:rent.toString()};
  }else{
    if(tokenDelta!==-BigInt(order.amountRaw)||rent>BigInt(prepared.reservedRentLamports)||
      solDelta+BigInt(meta.fee)+rent<BigInt(prepared.minimumReceiveLamports))
      throw Error('Sell settlement does not meet expected amounts');
  }
  return {state:'confirmed',slot:result.slot,feeLamports:String(meta.fee),tokenDeltaRaw:tokenDelta.toString(),solDeltaLamports:solDelta.toString(),rentPaidLamports:rent.toString()};
}
