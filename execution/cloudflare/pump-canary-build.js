import BN from 'bn.js';
import {ComputeBudgetProgram,PublicKey,TransactionMessage,VersionedTransaction} from '@solana/web3.js';
import {OnlinePumpSdk,PUMP_SDK,getBuyTokenAmountFromSolAmount,userVolumeAccumulatorPda} from '@pump-fun/pump-sdk';
import {inspectPumpV2Transaction} from './inspect-pump-v2.js';
import {simulateUnsignedTrade} from './rpc-transport.js';

const PUMP='6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P';
const WSOL='So11111111111111111111111111111111111111112';
const TOKEN='TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
const TOKEN_2022='TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb';
const ADDRESS=/^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const BUDGET=2000000n,QUOTE=1800000n,RESERVE=500000n,FEE_ALLOWANCE=100000n,OTHER_RENT_ALLOWANCE=2500000n;

// Read-only canary preparation. The caller must separately authenticate wallet
// ownership, persist a single order and exact signed bytes, and reconcile the
// chain before enabling a submit route. Never expose this as a trade endpoint
// until all of those checks are connected and reviewed.
export async function preparePumpCanaryBuy({connection,wallet,mint,onlineSdk=new OnlinePumpSdk(connection),offlineSdk=PUMP_SDK,
  quote=getBuyTokenAmountFromSolAmount,simulate=simulateUnsignedTrade,fetcher=fetch}={}){
  if(!ADDRESS.test(wallet||'')||!ADDRESS.test(mint||'')||wallet===mint)throw Error('Invalid wallet or mint');
  const user=new PublicKey(wallet),coin=new PublicKey(mint);
  const [global,feeConfig,state,mintAccount,supply,balance,blockhash,volumeAccount]=await Promise.all([
    onlineSdk.fetchGlobal(),onlineSdk.fetchFeeConfig(),onlineSdk.fetchBuyState(coin,user),
    connection.getAccountInfo(coin,'confirmed'),connection.getTokenSupply(coin,'confirmed'),
    connection.getBalance(user,'confirmed'),connection.getLatestBlockhash('confirmed'),
    connection.getAccountInfo(userVolumeAccumulatorPda(user),'confirmed')
  ]);
  const program=mintAccount?.owner?.toBase58();
  if(![TOKEN,TOKEN_2022].includes(program)||!state?.bondingCurve||state.bondingCurve.complete||
     state.quoteMint?.toBase58()!==WSOL||state.quoteTokenProgram?.toBase58()!==TOKEN||
     !/^[1-9]\d*$/.test(supply?.value?.amount||'')||!Number.isSafeInteger(balance)||balance<0||
     !blockhash?.value?.blockhash&&!blockhash?.blockhash)throw Error('Pump SOL curve or chain state unverified');
  const [tokenRent,volumeRent]=await Promise.all([
    state.associatedUserAccountInfo?0:connection.getMinimumBalanceForRentExemption(512,'confirmed'),
    volumeAccount?0:connection.getMinimumBalanceForRentExemption(137,'confirmed')]);
  if(!Number.isSafeInteger(tokenRent)||tokenRent<0||!Number.isSafeInteger(volumeRent)||volumeRent<0)
    throw Error('Cannot establish token and volume account rent');
  const rent=BigInt(tokenRent)+BigInt(volumeRent)+OTHER_RENT_ALLOWANCE;
  if(BigInt(balance)<BUDGET+rent+RESERVE+FEE_ALLOWANCE)
    throw Error('Insufficient balance for 0.002 SOL, token-account rent, fees and reserve');
  const amount=quote({global,feeConfig,mintSupply:new BN(supply.value.amount),
    bondingCurve:state.bondingCurve,amount:new BN(QUOTE.toString()),quoteMint:new PublicKey(WSOL)});
  if(!amount||amount.lte(new BN(0))||amount.gt(state.bondingCurve.realTokenReserves))throw Error('No safe token quote on this curve');
  const trade=await offlineSdk.buyV2Instructions({global,bondingCurveAccountInfo:state.bondingCurveAccountInfo,
    bondingCurve:state.bondingCurve,associatedUserAccountInfo:state.associatedUserAccountInfo,mint:coin,user,
    amount,quoteAmount:new BN(QUOTE.toString()),slippage:5,tokenProgram:new PublicKey(program),quoteTokenProgram:new PublicKey(TOKEN)});
  if(!Array.isArray(trade)||trade.length<1||trade.length>2)throw Error('Unexpected Pump builder instructions');
  const pumpIxs=trade.filter(ix=>ix.programId?.toBase58()===PUMP);
  if(pumpIxs.length!==1||pumpIxs[0].data.length!==24)throw Error('Unexpected Pump builder data');
  const cap=new DataView(pumpIxs[0].data.buffer,pumpIxs[0].data.byteOffset,pumpIxs[0].data.length).getBigUint64(16,true);
  if(cap<QUOTE||cap>BUDGET)throw Error('Transaction exceeds the 0.002 SOL cap');
  const latest=blockhash.value?.blockhash||blockhash.blockhash;
  const transaction=new VersionedTransaction(new TransactionMessage({payerKey:user,recentBlockhash:latest,
    instructions:[ComputeBudgetProgram.setComputeUnitLimit({units:350000}),ComputeBudgetProgram.setComputeUnitPrice({microLamports:1000}),...trade]}).compileToV0Message());
  const encoded=Buffer.from(transaction.serialize()).toString('base64');
  const check=inspectPumpV2Transaction(encoded,{wallet,mint,side:'buy',amountRaw:amount.toString(),limitLamports:cap.toString()});
  if(!check.valid)throw Error('Transaction inspection failed: '+check.reason);
  const simulation=await simulate({encoded,rpcUrl:connection.rpcEndpoint,fetcher});
  if(!simulation.passed)throw Error('Trade simulation failed');
  return {transaction:encoded,wallet,mint,tokenAmountRaw:amount.toString(),maximumSpendLamports:cap.toString(),
    balanceLamports:String(balance),reservedRentLamports:rent.toString(),minimumRemainingLamports:RESERVE.toString(),
    lastValidBlockHeight:blockhash.value?.lastValidBlockHeight||blockhash.lastValidBlockHeight,simulationUnits:simulation.unitsConsumed};
}
