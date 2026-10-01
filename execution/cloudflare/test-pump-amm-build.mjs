import assert from 'node:assert/strict';
import BN from 'bn.js';
import {Keypair,PublicKey,SystemProgram,TransactionInstruction} from '@solana/web3.js';
import {canonicalPumpPoolPda,PUMP_AMM_PROGRAM_ID} from '@pump-fun/pump-swap-sdk';
import {preparePumpAmmBuy,preparePumpAmmFullSell} from './pump-amm-build.js';
import {generateKeyPairSync} from 'node:crypto';
import {createPrivySigner,verifiedAmmWalletFunding} from './privy-signer.js';
import {PILOT_WSOL_ATA,walletFundingAta} from './wallet-funding-destination.js';

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
const accounts=[state.poolKey,wallet,key(),mint,WSOL,baseAta,wsolAta,key(),key(),key(),key(),TOKEN,TOKEN,
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
assert.equal(verifiedAmmWalletFunding({wallet:wallet.toBase58(),mint:mint.toBase58(),amountLamports:'2000000'},buy.transaction),true);
assert.equal(verifiedAmmWalletFunding({wallet:wallet.toBase58(),mint:mint.toBase58(),amountLamports:'1800000'},buy.transaction),false);
assert.equal(verifiedAmmWalletFunding({wallet:wallet.toBase58(),mint:key().toBase58(),amountLamports:'2000000'},buy.transaction),false);
const sell=await preparePumpAmmFullSell({connection,wallet:wallet.toBase58(),mint:mint.toBase58(),amountRaw:'1000',onlineSdk,simulate,
  quote:()=>({minQuote:new BN(1900000)}),offlineSdk:{sellBaseInput:async()=>[ix('sell',1000,1900000),close]}});
assert.equal(sell.venue,'pump-amm');assert.equal(sell.minimumReceiveLamports,'1900000');
const reviewedArgs={connection,wallet:wallet.toBase58(),mint:mint.toBase58(),amountRaw:'1000',onlineSdk,simulate,
  quote:()=>({minQuote:new BN(1900000),uiQuote:new BN(2000000)}),offlineSdk:{sellBaseInput:async()=>[ix('sell',1000,1900000),close]}};
assert.equal((await preparePumpAmmFullSell({...reviewedArgs,minimumReceiveLamportsFloor:'1950000'})).minimumReceiveLamports,'1950000');
await assert.rejects(preparePumpAmmFullSell({...reviewedArgs,minimumReceiveLamportsFloor:'2000001'}),/quote changed/);
const older={...state,poolAccountInfo:{owner:PUMP_AMM_PROGRAM_ID,data:Buffer.alloc(261)}};
const olderSell=await preparePumpAmmFullSell({connection,wallet:wallet.toBase58(),mint:mint.toBase58(),amountRaw:'1000',
  onlineSdk:{swapSolanaState:async()=>older},simulate,quote:()=>({minQuote:new BN(1900000)}),
  offlineSdk:{sellBaseInput:async()=>[extend,ix('sell',1000,1900000),close]}});
assert.equal(olderSell.reservedRentLamports,'4000000','Older pool extension and temporary WSOL account have rent reserved');
await assert.rejects(preparePumpAmmBuy({connection,wallet:wallet.toBase58(),mint:mint.toBase58(),budgetLamports:'2000000',onlineSdk,
  quote:()=>({base:new BN(1000),maxQuote:new BN(3000000)})}),/exceeds/);
await assert.rejects(preparePumpAmmFullSell({connection,wallet:wallet.toBase58(),mint:mint.toBase58(),amountRaw:'999',onlineSdk}),/full balance/);
console.log('AMM buy and full sell builders enforce budget, exact token balance, instruction inspection, and simulation');
const {privateKey,publicKey}=generateKeyPairSync('ec',{namedCurve:'prime256v1'});
const signerEnv={PRIVY_APP_SECRET:'test',SCOPE_PRIVY_POLICY_ID:'zv16gt4cophfjuy8rnx3kjq4',SCOPE_PRIVY_SIGNER_QUORUM_ID:'igsys5hz5fmsly8v2q242jgo',SCOPE_PRIVY_SIGNER_PRIVATE_KEY_PEM:privateKey.export({format:'der',type:'pkcs8'}).toString('base64')};
let policy={id:signerEnv.SCOPE_PRIVY_POLICY_ID,chain_type:'solana',owner_id:signerEnv.SCOPE_PRIVY_SIGNER_QUORUM_ID,rules:[
 {method:'signTransaction',action:'ALLOW',conditions:[{field_source:'solana_program_instruction',field:'programId',operator:'in',value:['6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P','ComputeBudget111111111111111111111111111111','ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL',PUMP_AMM_PROGRAM_ID.toBase58(),TOKEN.toBase58(),'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb']}]},
 {method:'signTransaction',action:'ALLOW',conditions:[{field_source:'solana_system_program_instruction',field:'Transfer.to',operator:'eq',value:PILOT_WSOL_ATA}]}]};
const order={id:crypto.randomUUID(),accountId:'did:privy:account123',walletId:'a'.repeat(24),wallet:wallet.toBase58(),mint:mint.toBase58(),amountLamports:'2000000'};
let updates=0,signs=0;
const signerClient={wallets:()=>({get:async()=>({id:order.walletId,address:order.wallet,chain_type:'solana',archived_at:null,
 additional_signers:[{signer_id:signerEnv.SCOPE_PRIVY_SIGNER_QUORUM_ID,override_policy_ids:[signerEnv.SCOPE_PRIVY_POLICY_ID]}]}),
 solana:()=>({signTransaction:async()=>{signs++;assert.ok(policy.rules[1].conditions[0].value.includes(walletFundingAta(order.wallet)));return {encoding:'base64',signed_transaction:'test-only-signed-bytes'}}})})};
const ownerFetch=async url=>Response.json(url.includes('/policies/')?policy:url.includes('/key_quorums/')?{id:signerEnv.SCOPE_PRIVY_SIGNER_QUORUM_ID,
 authorization_threshold:1,authorization_keys:[{public_key:publicKey.export({format:'der',type:'spki'}).toString('base64')}]}:{id:order.accountId,
 linked_accounts:[{type:'wallet',chain_type:'solana',wallet_client_type:'privy',id:order.walletId,address:order.wallet}]});
signerEnv.ACCOUNT_ORDERS={idFromName:id=>{assert.equal(id,'signing-policy:'+signerEnv.SCOPE_PRIVY_POLICY_ID);return id},get:()=>({fetch:async request=>{
 updates++;assert.equal(new URL(request.url).pathname,'/policy/ensure-wallet-funding');assert.deepEqual(await request.json(),{accountId:order.accountId,walletId:order.walletId,wallet:order.wallet});
 policy={...policy,rules:[policy.rules[0],{...policy.rules[1],conditions:[{...policy.rules[1].conditions[0],operator:'in',value:[PILOT_WSOL_ATA,walletFundingAta(order.wallet)]}]}]};
 return Response.json({verified:true});}})};
const signer=createPrivySigner(signerEnv,{client:signerClient,fetcher:ownerFetch});
assert.equal(await signer({order,transaction:buy.transaction}),'test-only-signed-bytes');assert.equal(updates,1);assert.equal(signs,1);
await signer({order,transaction:buy.transaction});assert.equal(updates,1,'Existing recipient permission is reused without another update');assert.equal(signs,2);
console.log('PASS: verified PumpSwap funding uses the serialized policy journal, rereads permission before signing and reuses the existing recipient');
