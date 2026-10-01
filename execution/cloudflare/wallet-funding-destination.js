import {PublicKey} from '@solana/web3.js';
export const PILOT_WSOL_ATA='4dWv5mpSYfiw4iMjzgF51fF2eGchByQMTPpWibgZzYMz';
export function walletFundingAta(wallet){
  return PublicKey.findProgramAddressSync([new PublicKey(wallet).toBuffer(),
    new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA').toBuffer(),
    new PublicKey('So11111111111111111111111111111111111111112').toBuffer()],
    new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL'))[0].toBase58();
}
export function fundingRecipients(condition){
  if(condition?.field_source!=='solana_system_program_instruction'||condition.field!=='Transfer.to')return null;
  const values=condition.operator==='eq'?[condition.value]:condition.operator==='in'?condition.value:null;
  if(!Array.isArray(values)||!values.length||values.length>100||new Set(values).size!==values.length||!values.includes(PILOT_WSOL_ATA))return null;
  try{if(values.some(value=>typeof value!=='string'||new PublicKey(value).toBase58()!==value))return null}catch{return null}
  return values;
}
