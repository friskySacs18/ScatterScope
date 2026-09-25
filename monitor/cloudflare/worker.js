// Independent, read-only scheduler. No wallet keys or order submission routes.
const INTERVAL=10000;
const json=(data,status=200)=>Response.json(data,{status,headers:{'cache-control':'no-store'}});
function configured(env){
  if(typeof env.SCOPE_MONITOR_SECRET!=='string'||env.SCOPE_MONITOR_SECRET.length<32)throw Error('Monitor secret missing');
  const url=new URL(env.SCOPE_MONITOR_URL);
  if(url.protocol!=='https:'||!['scopetrade.live','www.scopetrade.live','launch-sieve.lfrisky.chatgpt.site'].includes(url.hostname)||url.pathname!=='/api/automation/monitor-tick'||url.search||url.hash||url.username||url.password||url.port)throw Error('Invalid Scope monitor endpoint');
  return url;
}
function authorized(request,env){
  const secret=env.MONITOR_CONTROL_TOKEN;
  if(typeof secret!=='string'||secret.length<32)return false;
  const supplied=request.headers.get('authorization')||'',expected='Bearer '+secret;
  if(supplied.length!==expected.length)return false;
  let difference=0;for(let i=0;i<expected.length;i++)difference|=supplied.charCodeAt(i)^expected.charCodeAt(i);
  return difference===0;
}
function singleton(env){return env.SCOPE_MONITOR.get(env.SCOPE_MONITOR.idFromName('scope-monitor-v1'))}
export default {
  async fetch(request,env){
    const path=new URL(request.url).pathname;
    if(!['/start','/stop','/health'].includes(path))return json({error:'Not found'},404);
    if(!authorized(request,env))return json({error:'Monitor administrator authentication required'},401);
    if(request.method!==(path==='/health'?'GET':'POST'))return json({error:'Method not allowed'},405);
    return singleton(env).fetch(request);
  },
  async scheduled(event,env,ctx){
    // Repairs missing alarms only for a monitor explicitly started by its owner.
    ctx.waitUntil(singleton(env).fetch(new Request('https://internal/watchdog',{method:'POST'})));
  }
};
export class ScopeMonitor {
  constructor(state,env){
    this.storage=state.storage;this.env=env;this.busy=false;this.enabled=false;this.health={lastSuccessAt:null};
    this.ready=state.blockConcurrencyWhile(async()=>{
      this.enabled=(await this.storage.get('enabled'))===true;
      this.health=(await this.storage.get('health'))||{lastSuccessAt:null};
    });
  }
  async fetch(request){
    await this.ready;
    const path=new URL(request.url).pathname;
    if(path==='/start'){
      try{configured(this.env)}catch{return json({error:'Configure the Scope endpoint and monitor secret before starting'},503)}
      this.enabled=true;await this.storage.put('enabled',true);
      if(await this.storage.getAlarm()===null)await this.storage.setAlarm(Math.max(Date.now()+1000,this.health.retryAt||0));
    }else if(path==='/stop'){
      this.enabled=false;await this.storage.put('enabled',false);await this.storage.deleteAlarm();
    }else if(path==='/watchdog'){
      if(this.enabled&&!this.busy&&await this.storage.getAlarm()===null)await this.storage.setAlarm(Math.max(Date.now()+1000,this.health.retryAt||0));
    }else if(path!=='/health')return json({error:'Not found'},404);
    const age=Date.now()-Number(this.health.lastSuccessAt||0);
    return json({...this.health,enabled:this.enabled,healthy:this.enabled&&age>=0&&age<30000&&this.health.lastCheckOk===true,intervalMs:INTERVAL,executionEnabled:false});
  }
  async alarm(){
    await this.ready;
    if(!this.enabled||this.busy)return;
    if(this.health.retryAt>Date.now()){await this.storage.setAlarm(this.health.retryAt);return;}
    this.busy=true;
    const at=Date.now();
    try{
      // Arm the next check first so downstream outages do not end scheduling.
      await this.storage.setAlarm(at+INTERVAL);
      let ok=false,httpStatus=null,error='Monitor unavailable',callerCount=null,retryAfterMs=0;
      try{
        const endpoint=configured(this.env),body='{}';
        const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(this.env.SCOPE_MONITOR_SECRET),{name:'HMAC',hash:'SHA-256'},false,['sign']);
        const digest=await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(at+'.'+body));
        const signature=Array.from(new Uint8Array(digest),x=>x.toString(16).padStart(2,'0')).join('');
        const response=await fetch(endpoint,{method:'POST',headers:{'content-type':'application/json','x-scope-timestamp':String(at),'x-scope-signature':signature},body,redirect:'manual',signal:AbortSignal.timeout(5500)});
        httpStatus=response.status;
        if(response.ok){const raw=await response.text();if(raw.length>4096)throw Error('Oversized response');const data=JSON.parse(raw);ok=data.checked===true&&data.executionEnabled===false;callerCount=Number.isSafeInteger(data.callerCount)?data.callerCount:null;}
        error=ok?null:[301,302,303,307,308,401,403].includes(httpStatus)?'Scope service access is not configured':'Scope monitor check failed';
        if(httpStatus===429){
          let delay=60000;
          try{const raw=await response.text();if(raw.length<=4096){const data=JSON.parse(raw);if(Number.isFinite(data.retryAfterMs))delay=Math.max(delay,Math.min(86400000,data.retryAfterMs));}}catch{}
          retryAfterMs=Math.max(delay,Math.min(900000,60000*2**Math.min(4,this.health.rateLimitCount||0)));
          error='Callout provider rate limited; waiting before retry';
        }
      }catch{error='Monitor request failed'}
      const rateLimitCount=httpStatus===429?(this.health.rateLimitCount||0)+1:ok?0:(this.health.rateLimitCount||0);
      if(!ok)console.warn('Scope monitor unhealthy',JSON.stringify({httpStatus,retryAfterMs:retryAfterMs||null,reason:error}));
      else if(this.health.lastCheckOk===false)console.info('Scope monitor recovered',JSON.stringify({httpStatus,callerCount}));
      this.health={lastCheckedAt:at,lastSuccessAt:ok?Date.now():this.health.lastSuccessAt,lastCheckOk:ok,httpStatus,callerCount,error,rateLimitCount,retryAt:retryAfterMs?Date.now()+retryAfterMs:null};
      await this.storage.put('health',this.health);
      if(this.health.retryAt&&this.enabled)await this.storage.setAlarm(this.health.retryAt);
    }finally{this.busy=false;}
  }
}
