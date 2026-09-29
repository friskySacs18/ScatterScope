import BN from 'bn.js';
import {ComputeBudgetProgram,PublicKey,TransactionMessage,VersionedTransaction} from '@solana/web3.js';
import {OnlinePumpAmmSdk,PUMP_AMM_SDK,sellBaseInput,buyQuoteInput} from '@pump-fun/pump-swap-sdk';
import {verifiedPumpAmmSellState,verifiedPumpAmmPoolState} from './pump-amm-quote.js';
import {inspectPumpAmmSellTransaction,inspectPumpAmmBuyTransaction} from './inspect-pump-amm.js';
import {simulateUnsignedTrade} from './rpc-transport.js';

const RESERVE=500000n,FEE_ALLOWANCE=100000n;
export async function preparePumpAmmBuy({connection,wallet,mint,budgetLamports,
  onlineSdk=new OnlinePumpAmmSdk(connection),offlineSdk=PUMP_AMM_SDK,
  quote=buyQuoteInput,simulate=simulateUnsignedTrade,fetcher=fetch}={}){
  const quoteAt=Date.now();
  if(!/^[1-9]\d{0,19}$/.test(budgetLamports||'')||BigInt(budgetLamports)<1000000n||
    BigInt(budgetLamports)>18446744073709551615n)throw Error('Invalid graduated buy budget');
  const state=await verifiedPumpAmmPoolState({connection,wallet,mint,onlineSdk});
  if(state.userBaseAccountInfo){
    const held=await connection.getParsedAccountInfo(state.userBaseTokenAccount,'confirmed');
    if(held?.value?.data?.parsed?.info?.tokenAmount?.amount!=='0')throw Error('Token already held by wallet');
  }
  if(state.userQuoteAccountInfo){
    const wrapped=await connection.getParsedAccountInfo(state.userQuoteTokenAccount,'confirmed');
    if(wrapped?.value?.data?.parsed?.info?.tokenAmount?.amount!=='0')throw Error('Existing wrapped SOL requires a separate route');
  }
  const user=new PublicKey(wallet),coin=new PublicKey(mint),pool=state.pool;
  const desired=BigInt(budgetLamports)*9n/10n;
  const estimate=quote({quote:new BN(desired.toString()),slippage:5,
    baseReserve:state.poolBaseAmount,quoteReserve:state.poolQuoteAmount,
    virtualQuoteReserves:pool.virtualQuoteReserves,globalConfig:state.globalConfig,
    baseMintAccount:state.baseMintAccount,baseMint:coin,coinCreator:pool.coinCreator,
    creator:pool.creator,feeConfig:state.feeConfig,quoteMint:pool.quoteMint,
    isMayhemMode:pool.isMayhemMode,creatorFeeBps:pool.creatorFeeBps});
  const amount=estimate?.base?.toString(),maximum=estimate?.maxQuote?.toString();
  if(!/^[1-9]\d{0,19}$/.test(amount||'')||!/^[1-9]\d{0,19}$/.test(maximum||'')||
    BigInt(amount)>18446744073709551615n||BigInt(maximum)>BigInt(budgetLamports))
    throw Error('Graduated buy exceeds saved amount or has no tokens');
  const [balance,blockhash,tokenRent,wsolRent]=await Promise.all([
    connection.getBalance(user,'confirmed'),connection.getLatestBlockhash('confirmed'),
    state.userBaseAccountInfo?Promise.resolve(0):connection.getMinimumBalanceForRentExemption(512,'confirmed'),
    state.userQuoteAccountInfo?Promise.resolve(0):connection.getMinimumBalanceForRentExemption(165,'confirmed')]);
  if(!Number.isSafeInteger(balance)||balance<0||![tokenRent,wsolRent].every(x=>Number.isSafeInteger(x)&&x>=0)||
    BigInt(balance)<BigInt(maximum)+BigInt(tokenRent)+BigInt(wsolRent)+RESERVE+FEE_ALLOWANCE||
    !blockhash?.blockhash||!Number.isSafeInteger(blockhash.lastValidBlockHeight))
    throw Error('Graduated buy balance and rent reserve unavailable');
  const trade=await offlineSdk.buyQuoteInput(state,new BN(desired.toString()),5);
  if(!Array.isArray(trade)||trade.length<4||trade.length>6)throw Error('Unexpected graduated buy instructions');
  const tx=new VersionedTransaction(new TransactionMessage({payerKey:user,recentBlockhash:blockhash.blockhash,
    instructions:[ComputeBudgetProgram.setComputeUnitLimit({units:350000}),
      ComputeBudgetProgram.setComputeUnitPrice({microLamports:1000}),...trade]}).compileToV0Message());
  const encoded=Buffer.from(tx.serialize()).toString('base64');
  const checked=inspectPumpAmmBuyTransaction(encoded,{wallet,mint,amountRaw:amount,
    limitLamports:maximum,tokenProgram:state.baseTokenProgram.toBase58()});
  if(!checked.valid)throw Error('Graduated buy inspection failed: '+checked.reason);
  const simulation=await simulate({encoded,rpcUrl:connection.rpcEndpoint,fetcher});
  if(!simulation.passed)throw Error('Graduated buy simulation failed');
  return {transaction:encoded,wallet,mint,side:'buy',venue:'pump-amm',tokenProgram:state.baseTokenProgram.toBase58(),
    quoteAt,tokenAmountRaw:amount,maximumSpendLamports:maximum,
    balanceLamports:String(balance),reservedRentLamports:String(BigInt(tokenRent)+BigInt(wsolRent)),
    lastValidBlockHeight:blockhash.lastValidBlockHeight,simulationUnits:simulation.unitsConsumed};
}

export async function preparePumpAmmFullSell({connection,wallet,mint,amountRaw,
  onlineSdk=new OnlinePumpAmmSdk(connection),offlineSdk=PUMP_AMM_SDK,
  quote=sellBaseInput,simulate=simulateUnsignedTrade,fetcher=fetch}={}){
  const quoteAt=Date.now();
  const state=await verifiedPumpAmmSellState({connection,wallet,mint,amountRaw,onlineSdk});
  const pool=state.pool,coin=new PublicKey(mint),user=new PublicKey(wallet);
  const estimate=quote({base:new BN(amountRaw),slippage:5,baseReserve:state.poolBaseAmount,
    quoteReserve:state.poolQuoteAmount,virtualQuoteReserves:pool.virtualQuoteReserves,
    globalConfig:state.globalConfig,baseMintAccount:state.baseMintAccount,baseMint:coin,
    coinCreator:pool.coinCreator,creator:pool.creator,feeConfig:state.feeConfig,
    quoteMint:pool.quoteMint,isMayhemMode:pool.isMayhemMode,creatorFeeBps:pool.creatorFeeBps});
  const min=estimate?.minQuote?.toString();
  if(!/^[1-9]\d{0,19}$/.test(min||'')||BigInt(min)>18446744073709551615n)
    throw Error('Migrated sell minimum unavailable');
  const [balance,blockhash,rent]=await Promise.all([
    connection.getBalance(user,'confirmed'),connection.getLatestBlockhash('confirmed'),
    state.userQuoteAccountInfo?Promise.resolve(0):connection.getMinimumBalanceForRentExemption(165,'confirmed')]);
  if(!Number.isSafeInteger(balance)||balance<0||!Number.isSafeInteger(rent)||rent<0||
    BigInt(balance)<BigInt(rent)+RESERVE+FEE_ALLOWANCE||
    !blockhash?.blockhash||!Number.isSafeInteger(blockhash.lastValidBlockHeight))
    throw Error('Migrated sell fee and rent reserve unavailable');
  if(state.userQuoteAccountInfo){
    const parsed=await connection.getParsedAccountInfo(state.userQuoteTokenAccount,'confirmed');
    if(parsed?.value?.data?.parsed?.info?.tokenAmount?.amount!=='0')throw Error('Existing wrapped SOL balance requires a separate exit route');
  }
  const trade=await offlineSdk.sellBaseInput(state,new BN(amountRaw),5);
  if(!Array.isArray(trade)||trade.length<2||trade.length>3)throw Error('Unexpected migrated sell instructions');
  const transaction=new VersionedTransaction(new TransactionMessage({payerKey:user,recentBlockhash:blockhash.blockhash,
    instructions:[ComputeBudgetProgram.setComputeUnitLimit({units:350000}),
      ComputeBudgetProgram.setComputeUnitPrice({microLamports:1000}),...trade]}).compileToV0Message());
  const encoded=Buffer.from(transaction.serialize()).toString('base64');
  const checked=inspectPumpAmmSellTransaction(encoded,{wallet,mint,amountRaw,limitLamports:min});
  if(!checked.valid)throw Error('Migrated sell inspection failed: '+checked.reason);
  const simulation=await simulate({encoded,rpcUrl:connection.rpcEndpoint,fetcher});
  if(!simulation.passed)throw Error('Migrated sell simulation failed');
  return {transaction:encoded,wallet,mint,side:'sell',venue:'pump-amm',quoteAt,tokenAmountRaw:amountRaw,
    minimumReceiveLamports:min,reservedRentLamports:String(rent),balanceLamports:String(balance),
    lastValidBlockHeight:blockhash.lastValidBlockHeight,simulationUnits:simulation.unitsConsumed};
}
