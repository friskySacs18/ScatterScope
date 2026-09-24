// Long-running read-only bridge from a selected-account TweetStream feed to Scope.
// Never broadcasts, signs or creates an order. Keep credentials in host secrets.
import {readFileSync} from 'node:fs';
import {createHmac} from 'node:crypto';

const key=process.env.TWEETSTREAM_API_KEY;
const target=process.env.SCOPE_INGEST_URL;
const secret=process.env.SCOPE_INGEST_SECRET;
const siteToken=process.env.SCOPE_SITE_ACCESS_TOKEN;
const mapPath=process.env.SCOPE_CALLER_MAP;
if(!key||!target||!secret||secret.length<32||!siteToken||!mapPath)throw Error('Configure provider key, exact Site intake URL, 32+ character intake secret, Site access token and caller map.');
const url=new URL(target);
if(url.protocol!=='https:'||url.pathname!=='/api/callouts/ingest')throw Error('Use the HTTPS Site intake URL.');
const mapping=JSON.parse(readFileSync(mapPath,'utf8'));
if(!mapping||Array.isArray(mapping)||typeof mapping!=='object')throw Error('Caller map must be {username: wallet}.');
const wallets=new Map();
for(const [name,wallet] of Object.entries(mapping)){
  if(!/^[a-zA-Z0-9_.-]{1,40}$/.test(name)||!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(wallet))throw Error('Invalid caller mapping.');
  wallets.set(name.toLowerCase(),wallet);
}
if(!wallets.size)throw Error('Select at least one caller.');
let active,heartbeat,retryMs=1000;
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function send(data){
  const body=JSON.stringify(data);
  const signature=createHmac('sha256',secret).update(body).digest('hex');
  const response=await fetch(url,{method:'POST',headers:{'content-type':'application/json','x-scope-signature':signature,'OAI-Sites-Authorization':`Bearer ${siteToken}`},body,signal:AbortSignal.timeout(6000)});
  if(!response.ok)throw Error(`Site intake returned ${response.status}`);
}
function normalize(event,receivedAt=Date.now()){
  if(event?.t!=='account'||event?.op!=='callout'||event.d?.platform!=='pump_fun'||(event.d.kind&&event.d.kind!=='callout'))return null;
  const data=event.d;
  if(data.token?.chainId&&data.token.chainId!=='solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp')return null;
  const caller=wallets.get(String(data.caller?.username||'').toLowerCase());
  const mint=data.token?.address,publishedAt=Number(data.createdAt),id=String(event.id||'');
  if(!caller||typeof mint!=='string'||!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(mint)||!/^[a-zA-Z0-9._-]{8,100}$/.test(id)||!Number.isSafeInteger(publishedAt)||publishedAt>receivedAt+2000||receivedAt-publishedAt>90000)return null;
  return{type:'callout',id,caller,mint,publishedAt,observedAt:receivedAt};
}
async function connect(){
  const ws=new WebSocket('wss://ws-iad.tweetstream.io/ws',['tweetstream.v1',`tweetstream.auth.token.${key}`]);
  active=ws;
  ws.addEventListener('open',()=>{
    retryMs=1000;
    heartbeat=setInterval(()=>{if(ws.readyState===WebSocket.OPEN)void send({type:'heartbeat',observedAt:Date.now()}).catch(error=>console.error(error.message))},10000);
    void send({type:'heartbeat',observedAt:Date.now()}).catch(error=>console.error(error.message));
    console.log('Callout source connected; paper intake only.');
  });
  ws.addEventListener('message',event=>{
    let decoded;try{decoded=JSON.parse(String(event.data))}catch{return}
    const call=normalize(decoded);
    if(call)void send(call).then(()=>console.log(JSON.stringify({id:call.id,mint:call.mint,lagMs:call.observedAt-call.publishedAt}))).catch(error=>console.error('Callout intake failed:',error.message));
  });
  ws.addEventListener('error',()=>console.error('Callout source socket error.'));
  ws.addEventListener('close',async event=>{
    clearInterval(heartbeat);
    if([1008,4001,4003,4401,4403].includes(event.code)){console.error('Callout source rejected the subscription.');process.exitCode=1;return}
    console.error('Callout source disconnected; monitoring is stale until reconnected.');
    await pause(retryMs);retryMs=Math.min(retryMs*2,30000);connect();
  });
}
process.on('SIGINT',()=>{clearInterval(heartbeat);active?.close();process.exit(0)});
connect();
