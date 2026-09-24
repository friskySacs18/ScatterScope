// Read-only, 8-second supervised runner. Requires an always-on host; never signs.
import {createHmac} from 'node:crypto';

const url=process.env.SCOPE_MONITOR_URL;
const secret=process.env.SCOPE_MONITOR_SECRET;
if(!url||!secret||secret.length<32){console.error('Configure SCOPE_MONITOR_URL and a 32+ character SCOPE_MONITOR_SECRET');process.exit(2)}
let endpoint;
try{endpoint=new URL(url)}catch{console.error('Invalid monitor URL');process.exit(2)}
if(endpoint.protocol!=='https:'||!['scopetrade.live','www.scopetrade.live','launch-sieve.lfrisky.chatgpt.site'].includes(endpoint.hostname)||endpoint.pathname!=='/api/automation/monitor-tick'||endpoint.search){console.error('Monitor URL must point to the Scope HTTPS monitor endpoint');process.exit(2)}
const access=process.env.SCOPE_SITE_ACCESS_TOKEN||'';
let stopped=false,busy=false,timer;
async function tick(){
  if(stopped||busy)return;
  busy=true;
  const at=Date.now(),body='{}',signature=createHmac('sha256',secret).update(at+'.'+body).digest('hex');
  try{
    const response=await fetch(endpoint,{method:'POST',headers:{'content-type':'application/json','x-scope-timestamp':String(at),'x-scope-signature':signature,...(access?{'OAI-Sites-Authorization':'Bearer '+access}:{})},body,signal:AbortSignal.timeout(7000)});
    const data=await response.json();
    console.log(JSON.stringify({at:new Date(at).toISOString(),status:response.status,callerCount:data.callerCount??null,observations:data.observations??null,executionEnabled:false,error:response.ok?null:data.error||'Monitor failed'}));
  }catch(error){console.log(JSON.stringify({at:new Date(at).toISOString(),error:String(error?.message||error).slice(0,100),executionEnabled:false}))}
  finally{busy=false}
}
void tick();timer=setInterval(()=>{void tick()},8000);
for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>{stopped=true;clearInterval(timer)});
