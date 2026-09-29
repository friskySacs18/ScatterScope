import assert from 'node:assert/strict';
import BN from 'bn.js';
import {Keypair,PublicKey,SystemProgram,TransactionInstruction} from '@solana/web3.js';
import {canonicalPumpPoolPda,PUMP_AMM_PROGRAM_ID} from '@pump-fun/pump-swap-sdk';
import {preparePumpAmmBuy,preparePumpAmmFullSell} from './pump-amm-build.js';

const wallet=Keypair.generate().publicKey,mint=Keypair.generate().publicKey;
const TOKEN=new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
const WSOL=new PublicKey('So11111111111111111111111111111111111111112');
const ATA=new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');
const wsolAta=PublicKey.findProgramAddressSync([wallet.toBuffer(),TOKEN.toBuffer(),WSOL.toBuffer()],ATA)[0];
const baseAta=PublicKey.findProgramAddressSync([wallet.toBuffer(),TOKEN.toBuffer(),mint.toBuffer()],ATA)[0];
const key=()=>Keypair.generate().publicKey;
const pool={index:0,baseMint:mint,quoteMint:WSOL,virtualQuoteReserves:new BN(0),coinCreator:key(),creator:key()};
const state={poolKey:canonicalPumpPoolPda(mint),user:wallet,baseMint:mint,baseTokenProgram:TOKEN,quoteTokenProgram:TOKEN,
  poolAccountInfo:{owner:PUMP_AMM_PROGRAM_ID},userBaseTokenAccount:baseAta,userQuoteTokenAccount:wsolAta,userBaseAccountInfo:null,userQuoteAccountInfo:null,
  poolBaseAmount:new BN('10000000'),poolQuoteAmount:new BN('20000000'),pool,globalConfig:{},baseMintAccount:{},feeConfig:null};
const accounts=[state.poolKey,wallet,key(),mint,WSOL,baseAta,wsolAta,key(),key(),key(),key(),key(),TOKEN,TOKEN,
  new PublicKey('11111111111111111111111111111111'),ATA,key(),PUMP_AMM_PROGRAM_ID].map((pubkey,i)=>({pubkey,isSigner:i===1,isWritable:true}));
const ix=(disc,amount,limit)=>{const data=Buffer.alloc(disc==='buy'?25:24);Buffer.from(disc==='buy'?'66063d1201daebea':'33e685a4017f83ad','hex').copy(data);
  data.writeBigUInt64LE(BigInt(amount),8);data.writeBigUInt64LE(BigInt(limit),16);return new TransactionInstruction({programId:PUMP_AMM_PROGRAM_ID,keys:accounts,data})};
const close=new TransactionInstruction({programId:TOKEN,keys:[{pubkey:wsolAta,isSigner:false,isWritable:true},
  {pubkey:wallet,isSigner:false,isWritable:true},{pubkey:wallet,isSigner:true,isWritable:false}],data:Buffer.from([9])});
const sync=new TransactionInstruction({programId:TOKEN,keys:[{pubkey:wsolAta,isSigner:false,isWritable:true}],data:Buffer.from([17])});
const extend=new TransactionInstruction({programId:PUMP_AMM_PROGRAM_ID,keys:[
  {pubkey:state.poolKey,isSigner:false,isWritable:true},{pubkey:wallet,isSigner:true,isWritable:true},
  {pubkey:new PublicKey('11111111111111111111111111111111'),isSigner:false,isWritable:false},
  {pubkey:key(),isSigner:false,isWritable:false},{pubkey:PUMP_AMM_PROGRAM_ID,isSigner:false,isWritable:false}],
  data:Buffer.from('ea66c2cb96483ee5','hex')});
const connection={rpcEndpoint:'https://rpc.example.test',getParsedAccountInfo:async key=>({value:{owner:TOKEN,data:{parsed:{info:{owner:wallet.toBase58(),mint:mint.toBase58(),state:'initialized',tokenAmount:{amount:'1000'}}}}}}),
  getBalance:async()=>10000000,getLatestBlockhash:async()=>({blockhash:key().toBase58(),lastValidBlockHeight:1000}),
  getMinimumBalanceForRentExemption:async()=>2000000};
const onlineSdk={swapSolanaState:async()=>state};
const simulate=async()=>({passed:true,unitsConsumed:100000});
const buy=await preparePumpAmmBuy({connection,wallet:wallet.toBase58(),mint:mint.toBase58(),budgetLamports:'2000000',onlineSdk,simulate,
  quote:()=>({base:new BN(1000),maxQuote:new BN(1900000)}),offlineSdk:{buyQuoteInput:async()=>[
    SystemProgram.transfer({fromPubkey:wallet,toPubkey:wsolAta,lamports:1900000n}),sync,ix('buy',1000,1900000),close]}});
assert.equal(buy.venue,'pump-amm');assert.equal(buy.maximumSpendLamports,'1900000');
const sell=await preparePumpAmmFullSell({connection,wallet:wallet.toBase58(),mint:mint.toBase58(),amountRaw:'1000',onlineSdk,simulate,
  quote:()=>({minQuote:new BN(1900000)}),offlineSdk:{sellBaseInput:async()=>[ix('sell',1000,1900000),close]}});
assert.equal(sell.venue,'pump-amm');assert.equal(sell.minimumReceiveLamports,'1900000');
const older={...state,poolAccountInfo:{owner:PUMP_AMM_PROGRAM_ID,data:Buffer.alloc(261)}};
const olderSell=await preparePumpAmmFullSell({connection,wallet:wallet.toBase58(),mint:mint.toBase58(),amountRaw:'1000',
  onlineSdk:{swapSolanaState:async()=>older},simulate,quote:()=>({minQuote:new BN(1900000)}),
  offlineSdk:{sellBaseInput:async()=>[extend,ix('sell',1000,1900000),close]}});
assert.equal(olderSell.reservedRentLamports,'4000000','Older pool extension and temporary WSOL account have rent reserved');
await assert.rejects(preparePumpAmmBuy({connection,wallet:wallet.toBase58(),mint:mint.toBase58(),budgetLamports:'2000000',onlineSdk,
  quote:()=>({base:new BN(1000),maxQuote:new BN(3000000)})}),/exceeds/);
await assert.rejects(preparePumpAmmFullSell({connection,wallet:wallet.toBase58(),mint:mint.toBase58(),amountRaw:'999',onlineSdk}),/full balance/);
console.log('AMM buy and full sell builders enforce budget, exact token balance, instruction inspection, and simulation');
