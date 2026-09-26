import {PublicKey,VersionedTransaction} from '@solana/web3.js';

const PUMP='6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P';
const WSOL='So11111111111111111111111111111111111111112';
const SPL='TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
const TOKEN_2022='TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb';
const ATA='ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL';
const SYSTEM='11111111111111111111111111111111';
const COMPUTE='ComputeBudget111111111111111111111111111111';
const DISCRIMINATOR={buy:'b817ee6167c5d33d',sell:'5df6823ce7e940b2'};
const address=x=>typeof x==='string'&&/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(x);
const positiveU64=x=>typeof x==='string'&&/^[1-9]\d{0,19}$/.test(x)&&BigInt(x)<=18446744073709551615n;
const fail=reason=>({valid:false,reason});

// Permit at most one idempotent ATA creation for this payer, wallet and mint.
// Simulation and independent on-chain account/fee checks remain mandatory.
export function inspectPumpV2Transaction(encoded,{wallet,mint,side,amountRaw,limitLamports}){
  if(!address(wallet)||!address(mint)||!['buy','sell'].includes(side)||
    !positiveU64(amountRaw)||!positiveU64(limitLamports)||
    typeof encoded!=='string'||encoded.length>1800||!/^[A-Za-z0-9+/]+={0,2}$/.test(encoded))return fail('invalid_input');
  let tx;
  try{
    const binary=Uint8Array.from(atob(encoded),c=>c.charCodeAt(0));
    if(binary.length>1232||binary.length<100)return fail('invalid_transaction_size');
    tx=VersionedTransaction.deserialize(binary);
  }catch{return fail('invalid_serialization')}
  const message=tx.message;
  if(message.version!==0||message.addressTableLookups.length||message.header.numRequiredSignatures!==1||
    message.staticAccountKeys[0]?.toBase58()!==wallet)return fail('unexpected_signer_or_lookup');
  let pumpCount=0,ataCreation=null,pumpTokenProgram=null;
  for(const instruction of message.compiledInstructions){
    const program=message.staticAccountKeys[instruction.programIdIndex]?.toBase58();
    const bytes=instruction.data;
    if(program===COMPUTE){
      if(bytes[0]===2&&bytes.length===5){if(new DataView(bytes.buffer,bytes.byteOffset).getUint32(1,true)>400000)return fail('excess_compute');continue}
      if(bytes[0]===3&&bytes.length===9){if(new DataView(bytes.buffer,bytes.byteOffset).getBigUint64(1,true)>200000n)return fail('excess_priority_fee');continue}
      return fail('unexpected_compute_instruction');
    }
    if(program===ATA){
      if(side!=='buy'||ataCreation||pumpCount||bytes.length!==1||bytes[0]!==1||instruction.accountKeyIndexes.length!==6)
        return fail('unexpected_ata_instruction');
      const keys=instruction.accountKeyIndexes.map(index=>message.staticAccountKeys[index]?.toBase58());
      if(keys[0]!==wallet||keys[2]!==wallet||keys[3]!==mint||keys[4]!==SYSTEM||![SPL,TOKEN_2022].includes(keys[5]))
        return fail('unexpected_ata_accounts');
      const destination=PublicKey.findProgramAddressSync([new PublicKey(wallet).toBuffer(),new PublicKey(keys[5]).toBuffer(),new PublicKey(mint).toBuffer()],new PublicKey(ATA))[0].toBase58();
      if(keys[1]!==destination)return fail('unexpected_ata_destination');
      ataCreation={destination,tokenProgram:keys[5]};continue;
    }
    if(program!==PUMP||++pumpCount!==1)return fail('unexpected_program');
    if(bytes.length!==24||Array.from(bytes.slice(0,8),b=>b.toString(16).padStart(2,'0')).join('')!==DISCRIMINATOR[side])return fail('unexpected_pump_instruction');
    const args=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
    if(args.getBigUint64(8,true)!==BigInt(amountRaw)||args.getBigUint64(16,true)!==BigInt(limitLamports))return fail('amount_or_limit_mismatch');
    const indexes=instruction.accountKeyIndexes;
    if(indexes.length!==(side==='buy'?27:26))return fail('pump_account_count_mismatch');
    const at=i=>message.staticAccountKeys[indexes[i]]?.toBase58();
    if(at(1)!==mint||at(2)!==WSOL||at(4)!==SPL||at(5)!==ATA||at(13)!==wallet||
      at(side==='buy'?24:23)!==SYSTEM||at(indexes.length-1)!==PUMP||
      ![SPL,TOKEN_2022].includes(at(3)))return fail('pump_account_mismatch');
    const pumpKey=new PublicKey(PUMP),mintKey=new PublicKey(mint),walletKey=new PublicKey(wallet),tokenKey=new PublicKey(at(3));
    const global=PublicKey.findProgramAddressSync([new TextEncoder().encode('global')],pumpKey)[0];
    const curve=PublicKey.findProgramAddressSync([new TextEncoder().encode('bonding-curve'),mintKey.toBuffer()],pumpKey)[0];
    const userAta=PublicKey.findProgramAddressSync([walletKey.toBuffer(),tokenKey.toBuffer(),mintKey.toBuffer()],new PublicKey(ATA))[0];
    if(at(0)!==global.toBase58()||at(10)!==curve.toBase58()||at(14)!==userAta.toBase58())return fail('pump_derived_account_mismatch');
    pumpTokenProgram=at(3);
  }
  if(ataCreation&&(ataCreation.tokenProgram!==pumpTokenProgram||ataCreation.destination!==PublicKey.findProgramAddressSync([new PublicKey(wallet).toBuffer(),new PublicKey(pumpTokenProgram).toBuffer(),new PublicKey(mint).toBuffer()],new PublicKey(ATA))[0].toBase58()))return fail('ata_trade_mismatch');
  return pumpCount===1?{valid:true,side,mint,wallet,amountRaw,limitLamports}:fail('missing_pump_trade');
}
