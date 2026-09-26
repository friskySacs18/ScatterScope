// Independent order host. Admission, wallet authority, verified history and
// signing policy must all pass before the guarded execution path is reachable.
import {Connection} from '@solana/web3.js';
import {preparePumpCanaryBuy} from './pump-canary-build.js';
import {serviceConfiguration,operatorConfiguration} from './service-config.js';
import {reconcileOrder} from './execution-pipeline.js';
import {runAccountOrder} from './account-executor.js';

const BUILD='executor-foundation-v6';
const reply=(body,status=200)=>Response.json(body,{status,headers:{'cache-control':'no-store','x-content-type-options':'nosniff'}});
const page=`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Scope trade preflight</title><style>body{font:16px system-ui;background:#11151d;color:#f4f7ff;max-width:500px;margin:32px auto;padding:18px;line-height:1.5}label{display:block;margin:18px 0 7px}input,button{box-sizing:border-box;width:100%;padding:13px;border-radius:10px;border:1px solid #8894ae;font:inherit}button{background:#c6fb78;border:0;margin-top:22px;font-weight:700}p,small{color:#b5bfd1}output{display:block;white-space:pre-wrap;margin-top:20px}</style><h1>Unsigned trade check</h1><p>Checks one 0.002 SOL Pump buy against current chain state. This page cannot sign, submit, or enable orders.</p><form id="preflight" autocomplete="off"><label for="token">Operator token</label><input id="token" type="password" autocomplete="off" required><label for="wallet">Your Scope wallet address</label><input id="wallet" spellcheck="false" autocapitalize="off" required><label for="mint">Pump token mint address</label><input id="mint" spellcheck="false" autocapitalize="off" required><button>Check unsigned trade</button></form><output id="result" role="status"></output><script src="/canary/ui.js" defer></script></html>`;
const pageScript=`const form=document.querySelector('#preflight'),output=document.querySelector('#result');form.addEventListener('submit',async event=>{event.preventDefault();const token=document.querySelector('#token').value.trim(),wallet=document.querySelector('#wallet').value.trim(),mint=document.querySelector('#mint').value.trim();document.querySelector('#token').value='';output.textContent='Checking current chain state…';form.querySelector('button').disabled=true;try{const response=await fetch('/canary/prepare',{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+token},body:JSON.stringify({wallet,mint}),cache:'no-store'});const result=await response.json();output.textContent=response.ok?'Unsigned trade simulated. Maximum spend: '+(Number(result.maximumSpendLamports)/1e9).toFixed(6)+' SOL. Token amount (raw): '+result.tokenAmountRaw+'. Simulated compute units: '+result.simulationUnits+'. No transaction was signed or sent.':response.status===401?'The token does not match the deployed CANARY_PREPARE_TOKEN runtime secret.':result.error||'Preflight unavailable.'}catch{output.textContent='Network check failed; no transaction was sent.'}finally{form.querySelector('button').disabled=false}});`;
const ADDRESS=/^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const utf8=new TextEncoder();
function sameSecret(a,b){
  if(typeof a!=='string'||typeof b!=='string'||b.length<32||a.length!==b.length)return false;
  const x=utf8.encode(a),y=utf8.encode(b);let diff=0;
  for(let i=0;i<x.length;i++)diff|=x[i]^y[i];
  return diff===0;
}
async function smallJson(request){
  if(!request.body)throw Error('Invalid body');
  const reader=request.body.getReader(),chunks=[];let size=0;
  try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>1024){await reader.cancel();throw Error('Request too large')}chunks.push(value)}}finally{reader.releaseLock()}
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}
export default {
  async fetch(request,env){
    const path=new URL(request.url).pathname;
    if(request.method==='GET'&&path==='/status'){
      const config=serviceConfiguration(env);
      return reply({service:'scope-order-executor',build:BUILD,executionEnabled:config.executionEnabled,ordersSupported:true,
        orderPipelineImplemented:true,orderContextConfigured:config.contextConfigured,signerConfigured:config.signer.configured,signerVerified:false,rpcConfigured:config.rpcConfigured,
        canaryPreparationConfigured:config.canaryPreparationConfigured,operatorTokenConfigured:config.operator.configured,
        operatorTokenIssue:config.operator.code,operatorTokenHelp:config.operator.message,
        signerMissing:config.signer.missing,signerInvalid:config.signer.invalid,blockers:config.blockers,
        liveBuySellVerified:false,
        reason:'Order context and wallet delegation must be verified before live execution.'});
    }
    if(request.method==='GET'&&path==='/canary/ui')return new Response(page,{headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff','referrer-policy':'no-referrer','content-security-policy':"default-src 'none'; script-src 'self'; style-src 'unsafe-inline'; connect-src 'self'; form-action 'none'; frame-ancestors 'none'; base-uri 'none'"}});
    if(request.method==='GET'&&path==='/canary/ui.js')return new Response(pageScript,{headers:{'content-type':'text/javascript; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}});
    // An operator-only, read-only canary preflight. It returns an unsigned
    // transaction; no signing, broadcast or journal mutation is possible here.
    if(path==='/canary/prepare'){
      if(request.method!=='POST')return reply({error:'Method not allowed'},405);
      const operator=operatorConfiguration(env);
      if(!operator.configured)return reply({error:operator.message,code:operator.code},503);
      if(!sameSecret(request.headers.get('authorization')?.replace(/^Bearer /,''),env?.CANARY_PREPARE_TOKEN))
        return reply({error:'Unauthorized'},401);
      if(typeof env?.RPC_URL!=='string'||!/^https:\/\//.test(env.RPC_URL))return reply({error:'RPC not configured'},503);
      if(Number(request.headers.get('content-length'))>1024)return reply({error:'Request too large'},413);
      let body;
      try{body=await smallJson(request)}
      catch{return reply({error:'Invalid body'},400)}
      if(!body||Object.keys(body).sort().join(',')!=='mint,wallet'||!ADDRESS.test(body.wallet||'')||!ADDRESS.test(body.mint||''))
        return reply({error:'Expected wallet and mint addresses'},400);
      try{
        const result=await preparePumpCanaryBuy({connection:new Connection(env.RPC_URL,'confirmed'),wallet:body.wallet,mint:body.mint});
        return reply({kind:'unsigned-canary-buy',...result,executionEnabled:false});
      }catch(error){const insufficient=error?.message?.startsWith('Insufficient balance');return reply({error:insufficient?'Wallet balance must also cover token-account creation, network fees and remaining SOL. No transaction was sent.':'Could not verify a current Pump quote and simulation. No transaction was sent.',code:insufficient?'insufficient_balance':'preparation_failed'},422)}
    }
    if(path==='/orders/reconcile'){
      if(request.method!=='POST')return reply({error:'Method not allowed'},405);
      const operator=operatorConfiguration(env);
      if(!operator.configured)return reply({error:operator.message,code:operator.code},503);
      if(!sameSecret(request.headers.get('authorization')?.replace(/^Bearer /,''),env.CANARY_PREPARE_TOKEN))return reply({error:'Unauthorized'},401);
      if(!env.ACCOUNT_ORDERS)return reply({error:'Order journal unavailable'},503);
      let body;try{body=await smallJson(request)}catch{return reply({error:'Invalid body'},400)}
      if(!body||Object.keys(body).sort().join(',')!=='accountId,orderId'||!/^did:privy:[A-Za-z0-9_-]{8,120}$/.test(body.accountId||'')||!(/^[0-9a-f-]{36}$/).test(body.orderId||''))return reply({error:'Expected accountId and orderId'},400);
      const stub=env.ACCOUNT_ORDERS.get(env.ACCOUNT_ORDERS.idFromName(body.accountId));
      return stub.fetch(new Request('https://internal/reconcile',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({orderId:body.orderId})}));
    }
    if(['/orders/buy','/orders/sell'].includes(path)){
      if(request.method!=='POST')return reply({error:'Method not allowed'},405);
      const token=env?.ORDER_SERVICE_TOKEN;
      if(typeof token!=='string'||token.length<32||!sameSecret(request.headers.get('authorization')?.replace(/^Bearer /,''),token))return reply({error:'Service authorization required',executionEnabled:false},401);
      const config=serviceConfiguration(env);
      if(!config.executionEnabled)return reply({error:'Order service setup incomplete',blockers:config.blockers,executionEnabled:false},503);
      let body;try{body=await smallJson(request)}catch{return reply({error:'Invalid body'},400)}
      if(!body||Object.keys(body).sort().join(',')!=='accountId,signalId'||!/^did:privy:[A-Za-z0-9_-]{8,120}$/.test(body.accountId||'')||!/^[A-Za-z0-9:_-]{1,128}$/.test(body.signalId||''))return reply({error:'Expected accountId and signalId only'},400);
      const stub=env.ACCOUNT_ORDERS.get(env.ACCOUNT_ORDERS.idFromName(body.accountId));
      return stub.fetch(new Request('https://internal'+path,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)}));
    }
    if(path==='/canary')
      return reply({error:'Live-capital interlock is locked',executionEnabled:false},423);
    return reply({error:'Not found'},404);
  }
};

// A per-account durable namespace is declared now so later account isolation
// does not reuse the public monitor's persistent storage or signing secrets.
export class AccountOrderJournal {
  constructor(state,env){this.storage=state.storage;this.env=env;this.pending=Promise.resolve();this.queued=0}
  async fetch(request){
    if(this.queued>=16)return reply({error:'Account queue busy; retry the same signal later'},429);
    this.queued++;
    const operation=this.pending.then(()=>this.handle(request));
    this.pending=operation.catch(()=>{});
    try{return await operation}finally{this.queued--}
  }
  async handle(request){
    if(request?.method!=='POST')return reply({error:'Method not allowed'},405);
    let body;try{body=await smallJson(request)}catch{return reply({error:'Invalid request'},400)}
    const path=new URL(request.url).pathname;
    try{
      if(path==='/reconcile'){
        if(!/^[0-9a-f-]{36}$/.test(body?.orderId||''))return reply({error:'Invalid order ID'},400);
        return reply(await reconcileOrder({storage:this.storage,orderId:body.orderId,rpcUrl:this.env.RPC_URL}));
      }
      if(path==='/orders/buy'||path==='/orders/sell')return reply(await runAccountOrder({storage:this.storage,env:this.env,job:body,side:path.endsWith('buy')?'buy':'sell'}));
      return reply({error:'Unknown account operation'},404);
    }catch{return reply({error:'Order verification failed; no new attempt will be made for an uncertain order'},503)}
  }
  async alarm(){
    const task=this.pending.then(async()=>{
      const id=await this.storage.get('active-order');if(!id)return;
      const outcome=await reconcileOrder({storage:this.storage,orderId:id,rpcUrl:this.env.RPC_URL});
      if(['confirmed','failed'].includes(outcome.state)){await this.storage.delete('active-order');return}
      // Unknown signatures or missing receipts stay locked. Alarms only read
      // chain evidence, never re-sign, resubmit or create another order.
      await this.storage.setAlarm(Date.now()+30000);
    });
    this.pending=task.catch(()=>{});await task;
  }
}
