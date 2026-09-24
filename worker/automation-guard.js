// Fail-closed verifier for a SOL-paired Pump bonding-curve buy. This performs
// structural checks only: an order service must also reserve budget atomically,
// verify ownership and consent, simulate, submit and reconcile.
const ALPHABET='123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const PUMP='6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P';
const COMPUTE='ComputeBudget111111111111111111111111111111';
const ATA='ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL';
const SYSTEM='11111111111111111111111111111111';
const TOKEN='TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
const BUY=[102,6,61,18,1,218,235,234]; // Official Pump IDL buy discriminator.
function addressBytes(text){
  if(typeof text!=='string'||text.length<32||text.length>44)throw Error('Invalid address');
  let n=0n;
  for(const character of text){const digit=ALPHABET.indexOf(character);if(digit<0)throw Error('Invalid address');n=n*58n+BigInt(digit)}
  const bytes=new Uint8Array(32);
  for(let i=31;i>=0&&n>0n;i--){bytes[i]=Number(n&255n);n>>=8n}
  if(n>0n)throw Error('Address too long');
  const leading=[...text].findIndex(x=>x!=='1');
  if((leading<0?text.length:leading)>bytes.filter((x,i)=>x===0&&bytes.slice(0,i).every(y=>y===0)).length)throw Error('Invalid address');
  return bytes;
}
function equal(a,b){return a.length===b.length&&a.every((value,i)=>value===b[i])}
function safeBuyBudget(sol){
  if(typeof sol!=='number'||!Number.isFinite(sol)||sol<.001||!Number.isSafeInteger(Math.round(sol*1e9))||Math.abs(Math.round(sol*1e9)-sol*1e9)>.001)throw Error('Invalid per-call budget');
  return BigInt(Math.round(sol*1e9));
}
export function inspectAutomatedBuy(serialized,{wallet,mint,maxSpendSol}){
  const maxLamports=safeBuyBudget(maxSpendSol);
  const expectedWallet=addressBytes(wallet),expectedMint=addressBytes(mint);
  const bytes=serialized instanceof Uint8Array?serialized:typeof serialized==='string'&&serialized.length<=1650
    ?Uint8Array.from(atob(serialized),x=>x.charCodeAt(0)):null;
  if(!bytes||bytes.length<130||bytes.length>1232)throw Error('Invalid transaction length');
  let cursor=0;
  function take(count){if(count<0||cursor+count>bytes.length)throw Error('Truncated transaction');const part=bytes.subarray(cursor,cursor+count);cursor+=count;return part}
  function byte(){return take(1)[0]}
  function shortVec(){let value=0,shift=0;for(let i=0;i<3;i++){const b=byte();value+=(b&127)*2**shift;if(!(b&128)){if(value>256)throw Error('Oversized transaction field');return value}shift+=7}throw Error('Invalid shortvec')}
  function u64(data,offset){if(data.length<offset+8)throw Error('Truncated instruction');return new DataView(data.buffer,data.byteOffset,data.byteLength).getBigUint64(offset,true)}
  if(shortVec()!==1)throw Error('Exactly one wallet signature required');
  take(64);
  const prefix=byte();
  if(prefix!==0x80)throw Error('Only version-zero messages are supported');
  const required=byte(),readonlySigned=byte(),readonlyUnsigned=byte();
  if(required!==1||readonlySigned!==0)throw Error('Unexpected transaction signers');
  const count=shortVec();
  if(count<8||count>32||readonlyUnsigned>=count)throw Error('Invalid account keys');
  const keys=Array.from({length:count},()=>take(32));
  if(!equal(keys[0],expectedWallet))throw Error('Transaction payer differs from the selected wallet');
  take(32); // recent blockhash
  const instructions=shortVec();
  if(instructions<1||instructions>12)throw Error('Unexpected instruction count');
  const programs={pump:addressBytes(PUMP),compute:addressBytes(COMPUTE),ata:addressBytes(ATA),system:addressBytes(SYSTEM),token:addressBytes(TOKEN)};
  let buys=0,spent=0n;
  for(let i=0;i<instructions;i++){
    const programIndex=byte(),indices=take(shortVec()),data=take(shortVec());
    if(programIndex>=count||[...indices].some(index=>index>=count))throw Error('Invalid instruction accounts');
    const program=keys[programIndex];
    if(equal(program,programs.compute)){
      if(data.length===5&&data[0]===2){if(new DataView(data.buffer,data.byteOffset).getUint32(1,true)>400000)throw Error('Compute limit too high')}
      else if(data.length===9&&data[0]===3){if(u64(data,1)>1000000n)throw Error('Priority fee too high')}
      else throw Error('Unsupported compute instruction');
    }else if(equal(program,programs.ata)){
      if(![0,1].includes(data.length)||data.length===1&&data[0]!==1||indices.length<6||indices[0]!==0||
        !equal(keys[indices[2]],expectedWallet)||!equal(keys[indices[3]],expectedMint))throw Error('Unexpected token account creation');
    }else if(equal(program,programs.pump)){
      if(++buys!==1||indices.length<12||data.length<24||!equal(data.subarray(0,8),BUY)||
        !equal(keys[indices[2]],expectedMint)||!equal(keys[indices[6]],expectedWallet)||
        !equal(keys[indices[7]],programs.system)||!equal(keys[indices[8]],programs.token)||
        !equal(keys[indices[11]],programs.pump))throw Error('Unexpected Pump instruction');
      if(u64(data,8)===0n)throw Error('Zero-token buy');
      spent=u64(data,16);
      if(spent===0n||spent>maxLamports)throw Error('On-chain maximum exceeds the per-call SOL limit');
    }else throw Error('Transaction includes an unapproved instruction');
  }
  if(shortVec()!==0||cursor!==bytes.length)throw Error('Address lookups or trailing bytes are not supported');
  if(buys!==1)throw Error('Exactly one Pump buy required');
  return {validated:true,maximumLamports:spent.toString(),budgetLamports:maxLamports.toString(),instructionCount:instructions};
}
