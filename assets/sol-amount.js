// Convert user-entered SOL to exact lamports before constructing a transfer.
export function lamportsOf(input){
  const entered=String(input).trim().replace(',', '.');
  const value=entered.startsWith('.')?'0'+entered:entered;
  if(!/^(?:0|[1-9]\d*)(?:\.\d{1,9})?$/.test(value))return null;
  const [whole,part='']=value.split('.');
  const units=BigInt(whole)*1000000000n+BigInt(part.padEnd(9,'0'));
  return units>0n&&units<=BigInt(Number.MAX_SAFE_INTEGER)?units:null;
}
