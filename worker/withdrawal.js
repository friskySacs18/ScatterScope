import bs58 from 'bs58';

// Read only a single, version-zero System Program SOL transfer. No token,
// compute budget, lookup-table, or extra instruction is accepted here.
export async function validateSignedWithdrawal(encoded,{wallet,destination,lamports}){
  if(typeof encoded!=='string'||encoded.length<150||encoded.length>1800||!/^[A-Za-z0-9+/]+={0,2}$/.test(encoded))throw Error('Invalid signed transfer');
  let bytes;try{bytes=Uint8Array.from(atob(encoded),c=>c.charCodeAt(0))}catch{throw Error('Invalid signed transfer')}
  if(bytes.length>1232||btoa(String.fromCharCode(...bytes))!==encoded)throw Error('Invalid signed transfer');
  let at=0;
  const read=(n)=>{if(!Number.isSafeInteger(n)||n<0||at+n>bytes.length)throw Error('Invalid signed transfer');const value=bytes.subarray(at,at+n);at+=n;return value};
  const short=()=>{let value=0,shift=0;for(let i=0;i<3;i++){const octet=read(1)[0];value|=(octet&127)<<shift;if(!(octet&128))return value;shift+=7}throw Error('Invalid signed transfer')};
  if(short()!==1)throw Error('Transfer must have one signer');
  const signature=read(64);
  const message=bytes.subarray(at);
  if(read(1)[0]!==0x80)throw Error('Unsupported transfer format');
  const header=read(3);
  if(header[0]!==1||header[1]!==0||header[2]!==1)throw Error('Unexpected transfer signers');
  if(short()!==3)throw Error('Unexpected transfer accounts');
  const from=read(32),to=read(32),program=read(32);
  if(bs58.encode(from)!==wallet||bs58.encode(to)!==destination||bs58.encode(program)!=='11111111111111111111111111111111')throw Error('Transfer accounts differ from review');
  read(32); // recent blockhash; RPC preflight checks freshness.
  if(short()!==1||read(1)[0]!==2||short()!==2||read(1)[0]!==0||read(1)[0]!==1||short()!==12)throw Error('Unexpected transfer instruction');
  const data=read(12);
  if(data[0]!==2||data[1]!==0||data[2]!==0||data[3]!==0)throw Error('Unexpected transfer instruction');
  const amount=new DataView(data.buffer,data.byteOffset,data.byteLength).getBigUint64(4,true);
  if(amount!==BigInt(lamports)||amount<=0n)throw Error('Transfer amount differs from review');
  if(short()!==0||at!==bytes.length)throw Error('Unexpected transfer data');
  const key=await crypto.subtle.importKey('raw',from,{name:'Ed25519'},false,['verify']);
  if(!await crypto.subtle.verify('Ed25519',key,signature,message))throw Error('Transfer signature invalid');
  return {transaction:encoded,signature:bs58.encode(signature)};
}
