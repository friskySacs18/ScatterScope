// Parse only the native Solana balance. Never substitute an unrelated token's
// numeric display value for withdrawable SOL.
export function nativeSolLamports(payload){
  if(!Array.isArray(payload?.balances))throw Error('Invalid wallet balance response');
  const sol=payload.balances.filter(item=>item?.chain==='solana'&&String(item.asset||'').toLowerCase()==='sol');
  if(sol.length!==1)throw Error('Native SOL balance unavailable');
  const row=sol[0];
  if(row.raw_value_decimals!==9||typeof row.raw_value!=='string'||!/^(0|[1-9]\d*)$/.test(row.raw_value))throw Error('Invalid native SOL balance');
  const lamports=BigInt(row.raw_value);
  if(lamports>BigInt(Number.MAX_SAFE_INTEGER))throw Error('SOL balance exceeds supported precision');
  return Number(lamports);
}
