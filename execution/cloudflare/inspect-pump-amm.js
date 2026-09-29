import {PublicKey,VersionedTransaction} from '@solana/web3.js';
import {canonicalPumpPoolPda,PUMP_AMM_PROGRAM_ID} from '@pump-fun/pump-swap-sdk';

const COMPUTE='ComputeBudget111111111111111111111111111111';
const ATA='ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL';
const TOKEN='TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
const TOKEN_2022='TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb';
const SYSTEM='11111111111111111111111111111111';
const WSOL='So11111111111111111111111111111111111111112';
const SELL='33e685a4017f83ad';
const EXTEND='ea66c2cb96483ee5';
const fail=reason=>({valid:false,reason});
function isPoolExtend(program,data,ix,at,pool,wallet){
  return program===PUMP_AMM_PROGRAM_ID.toBase58()&&data.length===8&&
    Array.from(data,x=>x.toString(16).padStart(2,'0')).join('')===EXTEND&&
    ix.accountKeyIndexes.length===5&&at(0)===pool&&at(1)===wallet&&at(2)===SYSTEM&&
    at(4)===PUMP_AMM_PROGRAM_ID.toBase58();
}

export function inspectPumpAmmSellTransaction(encoded,{wallet,mint,amountRaw,limitLamports}){
  if(!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(wallet||'')||
    !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(mint||'')||
    !/^[1-9]\d{0,19}$/.test(amountRaw||'')||!/^[1-9]\d{0,19}$/.test(limitLamports||'')||
    BigInt(amountRaw)>18446744073709551615n||BigInt(limitLamports)>18446744073709551615n||
    typeof encoded!=='string'||encoded.length>1800||!/^[A-Za-z0-9+/]+={0,2}$/.test(encoded))return fail('invalid_input');
  let tx;
  try{const bytes=Uint8Array.from(atob(encoded),c=>c.charCodeAt(0));if(bytes.length>1232||bytes.length<100)return fail('invalid_size');
    tx=VersionedTransaction.deserialize(bytes)}catch{return fail('invalid_serialization')}
  const msg=tx.message,keys=msg.staticAccountKeys.map(k=>k.toBase58());
  if(msg.version!==0||msg.addressTableLookups.length||msg.header.numRequiredSignatures!==1||keys[0]!==wallet)
    return fail('signer_or_lookup');
  const pool=canonicalPumpPoolPda(new PublicKey(mint)).toBase58();
  const wsolAta=PublicKey.findProgramAddressSync([new PublicKey(wallet).toBuffer(),new PublicKey(TOKEN).toBuffer(),new PublicKey(WSOL).toBuffer()],new PublicKey(ATA))[0].toBase58();
  const baseAtas=[TOKEN,TOKEN_2022].map(program=>[program,PublicKey.findProgramAddressSync([
    new PublicKey(wallet).toBuffer(),new PublicKey(program).toBuffer(),new PublicKey(mint).toBuffer()],new PublicKey(ATA))[0].toBase58()]);
  let sells=0,closes=0,creates=0,extensions=0;
  for(const ix of msg.compiledInstructions){
    const program=keys[ix.programIdIndex],data=ix.data,at=i=>keys[ix.accountKeyIndexes[i]];
    if(program===COMPUTE){
      if(data[0]===2&&data.length===5&&new DataView(data.buffer,data.byteOffset).getUint32(1,true)<=400000)continue;
      if(data[0]===3&&data.length===9&&new DataView(data.buffer,data.byteOffset).getBigUint64(1,true)<=200000n)continue;
      return fail('compute_limit');
    }
    if(program===ATA){
      if(creates++||sells||data.length!==1||data[0]!==1||ix.accountKeyIndexes.length!==6||
        at(0)!==wallet||at(1)!==wsolAta||at(2)!==wallet||at(3)!==WSOL||at(4)!==SYSTEM||at(5)!==TOKEN)
        return fail('unexpected_ata');
      continue;
    }
    if(program===PUMP_AMM_PROGRAM_ID.toBase58()){
      if(isPoolExtend(program,data,ix,at,pool,wallet)){
        if(extensions++||sells||creates)return fail('unexpected_pool_extension');
        continue;
      }
      if(sells++||data.length!==24||Array.from(data.slice(0,8),x=>x.toString(16).padStart(2,'0')).join('')!==SELL||
        new DataView(data.buffer,data.byteOffset).getBigUint64(8,true)!==BigInt(amountRaw)||
        new DataView(data.buffer,data.byteOffset).getBigUint64(16,true)!==BigInt(limitLamports)||
        at(0)!==pool||at(1)!==wallet||at(3)!==mint||at(4)!==WSOL||
        at(6)!==wsolAta||!baseAtas.some(([program,ata])=>at(12)===program&&at(5)===ata)||
        at(13)!==TOKEN||at(14)!==SYSTEM||at(15)!==ATA)
        return fail('amm_trade_mismatch');
      continue;
    }
    if(program===TOKEN){
      if(!sells||closes++||data.length!==1||data[0]!==9||ix.accountKeyIndexes.length!==3||
        at(0)!==wsolAta||at(1)!==wallet||at(2)!==wallet)return fail('unexpected_token_close');
      continue;
    }
    return fail('unexpected_program');
  }
  return sells===1&&closes===1?{valid:true,venue:'pump-amm'}:fail('missing_sell_or_unwrap');
}

export function inspectPumpAmmBuyTransaction(encoded,{wallet,mint,amountRaw,limitLamports,tokenProgram}){
  if(![TOKEN,TOKEN_2022].includes(tokenProgram)||
    !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(wallet||'')||
    !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(mint||'')||
    !/^[1-9]\d{0,19}$/.test(amountRaw||'')||!/^[1-9]\d{0,19}$/.test(limitLamports||'')||
    BigInt(amountRaw)>18446744073709551615n||BigInt(limitLamports)>18446744073709551615n||
    typeof encoded!=='string'||encoded.length>1800||!/^[A-Za-z0-9+/]+={0,2}$/.test(encoded))return fail('invalid_input');
  let tx;
  try{const bytes=Uint8Array.from(atob(encoded),c=>c.charCodeAt(0));if(bytes.length>1232||bytes.length<100)return fail('invalid_size');
    tx=VersionedTransaction.deserialize(bytes)}catch{return fail('invalid_serialization')}
  const msg=tx.message,keys=msg.staticAccountKeys.map(k=>k.toBase58());
  if(msg.version!==0||msg.addressTableLookups.length||msg.header.numRequiredSignatures!==1||keys[0]!==wallet)
    return fail('signer_or_lookup');
  const associated=new PublicKey(ATA),user=new PublicKey(wallet);
  const pool=canonicalPumpPoolPda(new PublicKey(mint)).toBase58();
  const wsolAta=PublicKey.findProgramAddressSync([user.toBuffer(),new PublicKey(TOKEN).toBuffer(),new PublicKey(WSOL).toBuffer()],associated)[0].toBase58();
  const baseAta=PublicKey.findProgramAddressSync([user.toBuffer(),new PublicKey(tokenProgram).toBuffer(),new PublicKey(mint).toBuffer()],associated)[0].toBase58();
  const created=new Set();let buys=0,transfers=0,syncs=0,closes=0,extensions=0;
  for(const ix of msg.compiledInstructions){
    const program=keys[ix.programIdIndex],data=ix.data,at=i=>keys[ix.accountKeyIndexes[i]];
    if(program===COMPUTE){
      if(data[0]===2&&data.length===5&&new DataView(data.buffer,data.byteOffset).getUint32(1,true)<=400000)continue;
      if(data[0]===3&&data.length===9&&new DataView(data.buffer,data.byteOffset).getBigUint64(1,true)<=200000n)continue;
      return fail('compute_limit');
    }
    if(program===ATA){
      if(buys||data.length!==1||data[0]!==1||ix.accountKeyIndexes.length!==6||
        at(0)!==wallet||at(2)!==wallet||at(4)!==SYSTEM||
        !((at(1)===baseAta&&at(3)===mint&&at(5)===tokenProgram)||
          (at(1)===wsolAta&&at(3)===WSOL&&at(5)===TOKEN))||created.has(at(1)))return fail('unexpected_ata');
      created.add(at(1));continue;
    }
    if(program===SYSTEM){
      if(transfers++||buys||data.length!==12||new DataView(data.buffer,data.byteOffset).getUint32(0,true)!==2||
        new DataView(data.buffer,data.byteOffset).getBigUint64(4,true)!==BigInt(limitLamports)||
        at(0)!==wallet||at(1)!==wsolAta)return fail('unexpected_transfer');
      continue;
    }
    if(program===TOKEN){
      if(data.length===1&&data[0]===17&&ix.accountKeyIndexes.length===1&&at(0)===wsolAta&&!buys&&!syncs++)continue;
      if(data.length===1&&data[0]===9&&ix.accountKeyIndexes.length===3&&at(0)===wsolAta&&
        at(1)===wallet&&at(2)===wallet&&buys===1&&!closes++)continue;
      return fail('unexpected_token_instruction');
    }
    if(program===PUMP_AMM_PROGRAM_ID.toBase58()){
      if(isPoolExtend(program,data,ix,at,pool,wallet)){
        if(extensions++||buys||transfers||created.size)return fail('unexpected_pool_extension');
        continue;
      }
      if(buys++||!transfers||!syncs||data.length!==25||
        Array.from(data.slice(0,8),x=>x.toString(16).padStart(2,'0')).join('')!=='66063d1201daebea'||
        new DataView(data.buffer,data.byteOffset).getBigUint64(8,true)!==BigInt(amountRaw)||
        new DataView(data.buffer,data.byteOffset).getBigUint64(16,true)!==BigInt(limitLamports)||
        at(0)!==pool||at(1)!==wallet||at(3)!==mint||at(4)!==WSOL||
        at(5)!==baseAta||at(6)!==wsolAta||at(12)!==tokenProgram||at(13)!==TOKEN||at(14)!==SYSTEM||at(15)!==ATA)
        return fail('amm_trade_mismatch');
      continue;
    }
    return fail('unexpected_program');
  }
  return buys===1&&transfers===1&&syncs===1&&closes===1?{valid:true,venue:'pump-amm'}:fail('missing_trade_or_wrap');
}
