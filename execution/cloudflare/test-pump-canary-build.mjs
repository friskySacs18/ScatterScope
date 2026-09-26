import assert from 'node:assert/strict';
import BN from 'bn.js';
import {Keypair,PublicKey} from '@solana/web3.js';
import {PUMP_SDK} from '@pump-fun/pump-sdk';
import {preparePumpCanaryBuy} from './pump-canary-build.js';

const wallet=Keypair.fromSeed(Uint8Array.from({length:32},(_,i)=>i+1)).publicKey.toBase58();
const mint=Keypair.fromSeed(Uint8Array.from({length:32},(_,i)=>i+41)).publicKey.toBase58();
const key=x=>new PublicKey(x);
const tokenProgram=key('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
const quoteMint=key('So11111111111111111111111111111111111111112');
const state={bondingCurve:{complete:false,realTokenReserves:new BN('1000000000')},quoteMint,quoteTokenProgram:tokenProgram,associatedUserAccountInfo:null};
const onlineSdk={fetchGlobal:async()=>({}),fetchFeeConfig:async()=>({}),fetchBuyState:async()=>state};
const connection={rpcEndpoint:'https://api.mainnet-beta.solana.com/',getAccountInfo:async()=>({owner:tokenProgram}),
  getTokenSupply:async()=>({value:{amount:'1000000000'}}),getBalance:async()=>5000000,
  getLatestBlockhash:async()=>({blockhash:mint,lastValidBlockHeight:1}),getMinimumBalanceForRentExemption:async()=>2500000};
await assert.rejects(preparePumpCanaryBuy({connection,wallet:'invalid',mint,onlineSdk}),/Invalid wallet/);
await assert.rejects(preparePumpCanaryBuy({connection,wallet,mint,onlineSdk}),/Insufficient balance/);
const enough={...connection,getBalance:async()=>7000000};
await assert.rejects(preparePumpCanaryBuy({connection:enough,wallet,mint,onlineSdk:{...onlineSdk,fetchBuyState:async()=>({...state,quoteMint:key(wallet)})}}),/curve or chain state/);
await assert.rejects(preparePumpCanaryBuy({connection:enough,wallet,mint,onlineSdk:{...onlineSdk,fetchBuyState:async()=>({...state,bondingCurve:{complete:true}})}}),/curve or chain state/);
const offlineSdk={buyV2Instructions:async({user,mint:coin,amount,quoteAmount})=>[
  await PUMP_SDK.getBuyV2InstructionRaw({user,mint:coin,creator:key(wallet),amount,quoteAmount:quoteAmount.muln(105).divn(100),
    feeRecipient:key(wallet),buybackFeeRecipient:key(wallet),tokenProgram,quoteMint,quoteTokenProgram:tokenProgram})]};
let simulated=0;
const preview=await preparePumpCanaryBuy({connection:enough,wallet,mint,onlineSdk,offlineSdk,quote:()=>new BN('1000000'),
  simulate:async({encoded})=>{simulated++;assert.ok(encoded.length>100);return {passed:true,unitsConsumed:90000}}});
assert.equal(preview.maximumSpendLamports,'1890000');
assert.equal(preview.reservedRentLamports,'2500000');
assert.equal(preview.minimumRemainingLamports,'500000');
assert.equal(simulated,1);
console.log('Canary builder refuses invalid wallets, inadequate rent reserve, wrong quote mint and graduated curves');
