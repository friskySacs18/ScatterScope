import BN from 'bn.js';
import {PublicKey} from '@solana/web3.js';
import {OnlinePumpAmmSdk,canonicalPumpPoolPda,sellBaseInput,PUMP_AMM_PROGRAM_ID} from '@pump-fun/pump-swap-sdk';

const WSOL='So11111111111111111111111111111111111111112';
const TOKEN='TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
const TOKEN_2022='TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb';
const ADDRESS=/^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

// Use the canonical Pump migration pool, not a pool address supplied by a
// callout. Both pool state and the wallet's full token balance come from RPC.
export async function verifiedPumpAmmPoolState({connection,wallet,mint,
  onlineSdk=new OnlinePumpAmmSdk(connection)}={}){
  if(!ADDRESS.test(wallet||'')||!ADDRESS.test(mint||''))throw Error('Invalid migrated pool identity');
  const user=new PublicKey(wallet),coin=new PublicKey(mint),poolKey=canonicalPumpPoolPda(coin);
  const state=await onlineSdk.swapSolanaState(poolKey,user);
  const pool=state?.pool;
  if(state.poolKey?.toBase58()!==poolKey.toBase58()||state.user?.toBase58()!==wallet||
    state.baseMint?.toBase58()!==mint||pool?.baseMint?.toBase58()!==mint||
    pool?.quoteMint?.toBase58()!==WSOL||state.quoteTokenProgram?.toBase58()!==TOKEN||
    ![TOKEN,TOKEN_2022].includes(state.baseTokenProgram?.toBase58())||
    pool.index!==0||state.poolAccountInfo?.owner?.toBase58()!==PUMP_AMM_PROGRAM_ID.toBase58()||!state.userBaseTokenAccount||
    !state.poolBaseAmount?.gt(new BN(0))||!state.poolQuoteAmount?.gt(new BN(0)))throw Error('Canonical migration pool unverified');
  return state;
}

export async function verifiedPumpAmmSellState({connection,wallet,mint,amountRaw,
  onlineSdk=new OnlinePumpAmmSdk(connection)}={}){
  if(!/^[1-9]\d{0,19}$/.test(amountRaw||'')||BigInt(amountRaw)>18446744073709551615n)
    throw Error('Invalid migrated exit amount');
  const state=await verifiedPumpAmmPoolState({connection,wallet,mint,onlineSdk});
  const parsed=await connection.getParsedAccountInfo(state.userBaseTokenAccount,'confirmed');
  const info=parsed?.value?.data?.parsed?.info;
  if(parsed?.value?.owner?.toBase58()!==state.baseTokenProgram.toBase58()||info?.owner!==wallet||
    info?.mint!==mint||info?.state!=='initialized'||info?.tokenAmount?.amount!==amountRaw)
    throw Error('Migrated exit full balance unverified');
  return state;
}

export async function quotePumpAmmFullSell({connection,wallet,mint,amountRaw,
  onlineSdk=new OnlinePumpAmmSdk(connection),quote=sellBaseInput,now=Date.now}={}){
  const state=await verifiedPumpAmmSellState({connection,wallet,mint,amountRaw,onlineSdk});
  const coin=new PublicKey(mint),pool=state.pool,poolKey=state.poolKey;
  const estimate=quote({base:new BN(amountRaw),slippage:5,baseReserve:state.poolBaseAmount,
    quoteReserve:state.poolQuoteAmount,virtualQuoteReserves:pool.virtualQuoteReserves,
    globalConfig:state.globalConfig,baseMintAccount:state.baseMintAccount,baseMint:coin,
    coinCreator:pool.coinCreator,creator:pool.creator,feeConfig:state.feeConfig,
    quoteMint:pool.quoteMint,isMayhemMode:pool.isMayhemMode,creatorFeeBps:pool.creatorFeeBps});
  const expected=estimate?.uiQuote?.toString();
  if(!/^[1-9]\d{0,19}$/.test(expected||'')||BigInt(expected)>18446744073709551615n)
    throw Error('Migrated exit quote unavailable');
  return {wallet,mint,amountRaw,tokenDecimals:state.baseMintAccount.decimals,observedAt:now(),expectedSolOutLamports:expected,venue:'pump-amm',pool:poolKey.toBase58()};
}
