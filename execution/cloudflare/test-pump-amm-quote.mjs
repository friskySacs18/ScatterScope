import assert from 'node:assert/strict';
import BN from 'bn.js';
import {Keypair,PublicKey} from '@solana/web3.js';
import {canonicalPumpPoolPda,PUMP_AMM_PROGRAM_ID} from '@pump-fun/pump-swap-sdk';
import {quotePumpAmmFullSell} from './pump-amm-quote.js';

const wallet=Keypair.generate().publicKey.toBase58(),mint=Keypair.generate().publicKey.toBase58();
const key=canonicalPumpPoolPda(new PublicKey(mint));
const token=new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
const state={poolKey:key,user:new PublicKey(wallet),baseMint:new PublicKey(mint),baseTokenProgram:token,quoteTokenProgram:token,
  poolAccountInfo:{owner:PUMP_AMM_PROGRAM_ID},userBaseTokenAccount:Keypair.generate().publicKey,poolBaseAmount:new BN('10000000'),
  poolQuoteAmount:new BN('20000000'),globalConfig:{},baseMintAccount:{},feeConfig:null,
  pool:{index:0,baseMint:new PublicKey(mint),quoteMint:new PublicKey('So11111111111111111111111111111111111111112'),
    virtualQuoteReserves:new BN(0),coinCreator:Keypair.generate().publicKey,creator:Keypair.generate().publicKey}};
let amount='1000',quoteCalls=0;
const connection={getParsedAccountInfo:async()=>({value:{owner:token,data:{parsed:{info:{owner:wallet,mint,state:'initialized',tokenAmount:{amount}}}}}})};
const args={connection,wallet,mint,amountRaw:'1000',onlineSdk:{swapSolanaState:async()=>state},now:()=>123456,
  quote:input=>{quoteCalls++;assert.equal(input.base.toString(),'1000');return {uiQuote:new BN('1900000')}}};
const result=await quotePumpAmmFullSell(args);
assert.equal(result.venue,'pump-amm');assert.equal(result.pool,key.toBase58());assert.equal(result.expectedSolOutLamports,'1900000');
await assert.rejects(quotePumpAmmFullSell({...args,onlineSdk:{swapSolanaState:async()=>({...state,pool:{...state.pool,index:1}})}}),/unverified/);
await assert.rejects(quotePumpAmmFullSell({...args,onlineSdk:{swapSolanaState:async()=>({...state,pool:{...state.pool,quoteMint:new PublicKey(mint)}})}}),/unverified/);
amount='999';await assert.rejects(quotePumpAmmFullSell(args),/full balance/);
assert.equal(quoteCalls,1,'Unverified balances and pools never reach pricing');
console.log('Canonical migrated pool, SOL quote mint, exact wallet balance and fee quote verified');
