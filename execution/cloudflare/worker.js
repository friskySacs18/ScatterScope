// Independent order host. Admission, wallet authority, verified history and
// signing policy must all pass before the guarded execution path is reachable.
import {armCanary} from './canary-rearm.js';
import {Connection} from '@solana/web3.js';
import {preparePumpCanaryBuy} from './pump-canary-build.js';
import {serviceConfiguration,operatorConfiguration} from './service-config.js';
import {reconcileOrder,TERMINAL_ORDER_STATES} from './execution-pipeline.js';
import {runAccountOrder} from './account-executor.js';
import {inspectOpenPositions} from './position-monitor.js';
import {diagnoseSigning} from './signing-diagnostic.js';
import {reviewManualSell,confirmManualSell} from './manual-sell.js';
import {syncVerifiedWalletFunding} from './wallet-funding-policy.js';

const BUILD='executor-signing-recovery-v16';
const boundedConnection=env=>new Connection(env.RPC_URL,{commitment:'confirmed',disableRetryOnRateLimit:true,
  fetch:(url,options)=>fetch(url,{...options,signal:AbortSignal.timeout(6000)})});
function exitErrorCode(error){
  const message=String(error?.message||'').toLowerCase();
  return message.includes('context')?'exit_context_rejected':
    message.includes('token balance')?'exit_token_balance_unverified':
    message.includes('quote')||message.includes('curve')?'exit_quote_unavailable':
    message.includes('simulation')||message.includes('simulate')?'exit_simulation_failed':
    message.includes('privy')||message.includes('signer')||message.includes('policy')?'exit_signer_rejected':
    message.includes('balance')?'exit_balance_unverified':'exit_verification_failed';
}
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
      return reply({service:'scope-order-executor',build:BUILD,signerDiagnostics:'provider-detail-trade-check-v3',signingRecovery:'unsubmitted-only-deadline',signingTimeoutMs:25000,sellTokenProgramLookup:'verified-mint-owner',broadcastRecovery:'identical-bytes-finalized-expiry',supportedBuyVenues:['pump-curve','pump-amm'],pumpAmmInstructionLayout:'sdk-idl-v1',allAccountsLive:true,executionEnabled:config.executionEnabled,ordersSupported:true,
        walletFundingPolicy:'verified-own-wsol-destinations',manualSellSupported:true,orderPipelineImplemented:true,exitPathVerified:config.exitPathVerified,canaryAvailable:config.canaryAvailable,orderContextConfigured:config.contextConfigured,signerConfigured:config.signer.configured,signerVerified:false,rpcConfigured:config.rpcConfigured,
        canaryPreparationConfigured:config.canaryPreparationConfigured,operatorTokenConfigured:config.operator.configured,
        operatorTokenIssue:config.operator.code,operatorTokenHelp:config.operator.message,
        signerMissing:config.signer.missing,signerInvalid:config.signer.invalid,signerKeyIssue:config.signer.keyIssue,
        signerPublicKey:config.signer.publicKey,blockers:config.blockers,
        liveBuySellVerified:true,liveVerifiedVenue:'pump-curve',maximumBuySol:null,entryEligibility:'call-market-cap',exitCheckIntervalMs:8000,
        reason:'Every account must opt in and provide fresh verified context. Live buys use each account’s saved SOL amounts on Pump curves; existing positions retain curve and migration exits.'});
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
    if(path==='/orders/status'){
      if(request.method!=='POST')return reply({error:'Method not allowed'},405);
      if(!sameSecret(request.headers.get('authorization')?.replace(/^Bearer /,''),env.ORDER_SERVICE_TOKEN))return reply({error:'Service authorization required'},401);
      let body;try{body=await smallJson(request)}catch{return reply({error:'Invalid body'},400)}
      if(!body||Object.keys(body).join(',')!=='accountId'||!/^did:privy:[A-Za-z0-9_-]{8,120}$/.test(body.accountId||''))return reply({error:'Invalid account'},400);
      if(!env.ACCOUNT_ORDERS)return reply({error:'Order journal unavailable'},503);
      const stub=env.ACCOUNT_ORDERS.get(env.ACCOUNT_ORDERS.idFromName(body.accountId));
      return stub.fetch(new Request('https://internal/status',{method:'POST',headers:{'content-type':'application/json'},body:'{}'}));
    }
    if(['/orders/manual-sell/review','/orders/manual-sell/confirm'].includes(path)){
      if(request.method!=='POST')return reply({error:'Method not allowed'},405);
      if(!sameSecret(request.headers.get('authorization')?.replace(/^Bearer /,''),env.ORDER_SERVICE_TOKEN))return reply({error:'Service authorization required'},401);
      const config=serviceConfiguration(env);
      if(!config.executionEnabled)return reply({error:'Order service unavailable',blockers:config.blockers},503);
      let body;try{body=await smallJson(request)}catch{return reply({error:'Invalid body'},400)}
      const confirm=path.endsWith('/confirm');
      if(Object.keys(body||{}).sort().join(',')!==(confirm?'accountId,mint,reviewId':'accountId,mint')||
        !/^did:privy:[A-Za-z0-9_-]{8,120}$/.test(body.accountId||'')||!ADDRESS.test(body.mint||'')||
        confirm&&!/^[0-9a-f-]{36}$/.test(body.reviewId||''))return reply({error:'Invalid manual sell request'},400);
      return env.ACCOUNT_ORDERS.get(env.ACCOUNT_ORDERS.idFromName(body.accountId)).fetch(new Request('https://internal'+path,{
        method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)}));
    }
    if(path==='/orders/signing-diagnostic'){
      if(request.method!=='POST')return reply({error:'Method not allowed'},405);
      if(!sameSecret(request.headers.get('authorization')?.replace(/^Bearer /,''),env.ORDER_SERVICE_TOKEN))return reply({error:'Service authorization required'},401);
      let body;try{body=await smallJson(request)}catch{return reply({error:'Invalid body'},400)}
      if(Object.keys(body||{}).join(',')!=='accountId'||!/^did:privy:[A-Za-z0-9_-]{8,120}$/.test(body.accountId||''))return reply({error:'Invalid account'},400);
      if(!env.ACCOUNT_ORDERS||!env.RPC_URL)return reply({error:'Order journal unavailable'},503);
      return env.ACCOUNT_ORDERS.get(env.ACCOUNT_ORDERS.idFromName(body.accountId)).fetch(new Request('https://internal/signing-diagnostic',{
        method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)}));
    }
    if(path==='/orders/alerts'){
      if(request.method!=='POST')return reply({error:'Method not allowed'},405);
      const token=env?.ORDER_SERVICE_TOKEN;
      if(typeof token!=='string'||token.length<32||!sameSecret(request.headers.get('authorization')?.replace(/^Bearer /,''),token))return reply({error:'Service authorization required'},401);
      if(!env.ACCOUNT_ORDERS)return reply({error:'Order journal unavailable'},503);
      let body;try{body=await smallJson(request)}catch{return reply({error:'Invalid body'},400)}
      if(!body||Object.keys(body).join(',')!=='accountId'||!/^did:privy:[A-Za-z0-9_-]{8,120}$/.test(body.accountId||''))return reply({error:'Invalid account'},400);
      const stub=env.ACCOUNT_ORDERS.get(env.ACCOUNT_ORDERS.idFromName(body.accountId));
      return stub.fetch(new Request('https://internal/alerts',{method:'POST',headers:{'content-type':'application/json'},body:'{}'}));
    }
    if(['/orders/buy','/orders/sell','/orders/canary/buy','/orders/canary/arm','/orders/canary/status','/orders/canary/wake'].includes(path)){
      if(request.method!=='POST')return reply({error:'Method not allowed'},405);
      const token=env?.ORDER_SERVICE_TOKEN;
      if(typeof token!=='string'||token.length<32||!sameSecret(request.headers.get('authorization')?.replace(/^Bearer /,''),token))return reply({error:'Service authorization required',executionEnabled:false},401);
      const config=serviceConfiguration(env);
      if((path==='/orders/canary/buy'||path==='/orders/canary/arm'||path==='/orders/canary/wake')?!config.canaryAvailable:path==='/orders/canary/status'?false:!config.executionEnabled)
        return reply({error:'Order service setup incomplete',blockers:config.blockers,executionEnabled:false},503);
      let body;try{body=await smallJson(request)}catch{return reply({error:'Invalid body'},400)}
      if(path==='/orders/canary/status'){
        if(!body||Object.keys(body).join(',')!=='accountId'||!/^did:privy:[A-Za-z0-9_-]{8,120}$/.test(body.accountId||''))return reply({error:'Expected accountId only'},400);
        const stub=env.ACCOUNT_ORDERS.get(env.ACCOUNT_ORDERS.idFromName(body.accountId));
        return stub.fetch(new Request('https://internal/canary/status',{method:'POST',headers:{'content-type':'application/json'},body:'{}'}));
      }
      if(path==='/orders/canary/wake'){
        if(!body||Object.keys(body).join(',')!=='accountId'||!/^did:privy:[A-Za-z0-9_-]{8,120}$/.test(body.accountId||''))return reply({error:'Expected accountId only'},400);
        const stub=env.ACCOUNT_ORDERS.get(env.ACCOUNT_ORDERS.idFromName(body.accountId));
        return stub.fetch(new Request('https://internal/canary/wake',{method:'POST',headers:{'content-type':'application/json'},body:'{}'}));
      }
      if(path==='/orders/canary/arm'){
        if(!body||Object.keys(body).join(',')!=='accountId'||!/^did:privy:[A-Za-z0-9_-]{8,120}$/.test(body.accountId||''))return reply({error:'Expected accountId only'},400);
        const stub=env.ACCOUNT_ORDERS.get(env.ACCOUNT_ORDERS.idFromName(body.accountId));
        return stub.fetch(new Request('https://internal/canary/arm',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)}));
      }
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
      if(path==='/policy/ensure-wallet-funding'){
        if(Object.keys(body||{}).sort().join(',')!=='accountId,wallet,walletId'||
          !/^did:privy:[A-Za-z0-9_-]{8,120}$/.test(body.accountId||'')||!ADDRESS.test(body.wallet||'')||!(/^[a-z0-9]{24}$/).test(body.walletId||''))return reply({error:'Invalid wallet identity'},400);
        try{return reply(await syncVerifiedWalletFunding({env:this.env,...body}))}
        catch{return reply({verified:false,error:'Wallet funding permission verification failed'},409)}
      }
      if(path==='/reconcile'){
        if(!/^[0-9a-f-]{36}$/.test(body?.orderId||''))return reply({error:'Invalid order ID'},400);
        return reply(await reconcileOrder({storage:this.storage,orderId:body.orderId,rpcUrl:this.env.RPC_URL}));
      }
      if(path==='/status'){
        const active=await this.storage.get('active-order'),current=active?await this.storage.get('order:'+active):null;
        if(current&&['reserved','signing','signing_unknown'].includes(current.state)){
          const outcome=await reconcileOrder({storage:this.storage,orderId:active,rpcUrl:this.env.RPC_URL});
          if(TERMINAL_ORDER_STATES.includes(outcome.state))await this.storage.delete('active-order');
        }
        const orders=await this.storage.list({prefix:'order:',limit:100}),positions=await this.storage.list({prefix:'position:',limit:100});
        return reply({orders:[...orders.values()].sort((a,b)=>b.createdAt-a.createdAt).slice(0,12).map(o=>({id:o.id,mint:o.mint,side:o.side||'buy',state:o.state,failureReason:o.failureReason||null,failureDetail:o.failureDetail||null,signature:o.signature||null,canary:o.canary===true,createdAt:o.createdAt})),
          positions:await Promise.all([...positions.values()].filter(p=>p.state==='open').slice(0,12).map(async p=>({mint:p.mint,state:p.state,amountRaw:p.amountRaw,costLamports:p.costLamports,openedAt:p.openedAt,canary:p.canary===true,rules:p.rules,buySignature:(await this.storage.get('order:'+p.buyOrderId))?.signature||null,exitObservation:await this.storage.get('exit-observation:'+p.mint)||null,lastExitCheck:await this.storage.get('exit-last-check:'+p.mint)||null}))),lastBuyCheck:await this.storage.get('buy-last-check')||null});
      }
      if(path==='/signing-diagnostic'){
        const args={storage:this.storage,env:this.env,accountId:body.accountId,connection:boundedConnection(this.env)};
        const basic=await diagnoseSigning(args);
        return reply(basic.state==='passed'?await diagnoseSigning({...args,kind:'trade'}):basic);
      }
      if(path==='/orders/manual-sell/review'||path==='/orders/manual-sell/confirm'){
        if(!serviceConfiguration(this.env).executionEnabled)return reply({error:'Order service unavailable'},503);
        try{
          const result=path.endsWith('/review')?await reviewManualSell({storage:this.storage,env:this.env,...body,
            connection:boundedConnection(this.env)}):await confirmManualSell({storage:this.storage,env:this.env,...body,
              execute:options=>runAccountOrder({...options,connection:boundedConnection(this.env)})});
          return reply(result,result.state==='blocked'?409:200);
        }catch(error){return reply({state:'blocked',reason:error?.code==='manual_sell_quote_changed'?'manual_sell_quote_changed':'manual_sell_verification_failed'},422)}
      }
      if(path==='/alerts'){
        const rows=await this.storage.list({prefix:'caller-alert:'});
        return reply({alerts:[...rows.values()].filter(x=>x?.kind==='consecutive_losses'&&x.losses>=4).sort((a,b)=>b.updatedAt-a.updatedAt).slice(0,12)});
      }
      if(path==='/canary/status'){
        const arm=await this.storage.get('canary-arm');
        const buyId=await this.storage.get('canary-attempt');
        if(!buyId)return reply(arm&&arm.expiresAt>Date.now()?{state:'armed',expiresAt:arm.expiresAt}:{state:'not_started'});
        const buy=await this.storage.get('order:'+buyId),position=buy?.mint?await this.storage.get('position:'+buy.mint):null;
        const sellId=buy?.mint?await this.storage.get('sell:'+buy.mint):null;
        const sell=sellId?await this.storage.get('order:'+sellId):null;
        const sellFailures=buy?.mint?Number(await this.storage.get('sell-failures:'+buy.mint)||0):0;
        return reply({state:sellFailures>=3&&position?.state==='open'?'exit_failed':
          sell?.state==='confirmed'&&position?.state==='closed'?'completed':
          buy?.state==='confirmed'?'exiting':buy?.state||'unavailable',
          mint:buy?.mint||null,buy:{state:buy?.state||'unavailable',signature:buy?.signature||null},
          sell:sell?{state:sell.state,signature:sell.signature||null}:null,
          position:position?.state||null,sellFailures,
          lastExitCheck:buy?.mint?await this.storage.get('exit-last-check:'+buy.mint)||null:null});
      }
      if(path==='/canary/wake'){
        const arm=await this.storage.get('canary-arm');
        if(!arm||arm.expiresAt<=Date.now()||await this.storage.get('canary-attempt'))return reply({woken:false,reason:'test_not_armed'});
        if(await this.storage.get('active-order'))return reply({woken:false,reason:'order_reconciling'});
        const next=await this.storage.getAlarm(),now=Date.now();
        if(next===null||next>now+1)await this.storage.setAlarm(now+1);
        return reply({woken:true});
      }
      if(path==='/canary/arm'){
        if(!/^did:privy:[A-Za-z0-9_-]{8,120}$/.test(body?.accountId||''))return reply({error:'Invalid account'},400);
        const result=await armCanary(this.storage,body.accountId);
        if(result.state==='blocked')return reply(result,409);
        const next=await this.storage.getAlarm(),now=Date.now();
        if(next===null||next>now+1000)await this.storage.setAlarm(now+1000);
        return reply(result);
      }
      if(path==='/orders/buy'||path==='/orders/sell'||path==='/orders/canary/buy'){
        const side=path.endsWith('buy')?'buy':'sell';
        try{
          const result=await runAccountOrder({storage:this.storage,env:this.env,job:body,side,canary:path==='/orders/canary/buy'});
          if(side==='buy')await this.storage.put('buy-last-check',{at:Date.now(),signalId:body.signalId,state:result.state,reason:/^[a-z_]{1,80}$/.test(result.reason||'')?result.reason:null,httpStatus:Number.isInteger(result.httpStatus)&&result.httpStatus>=400&&result.httpStatus<=599?result.httpStatus:null,providerMessage:typeof result.providerMessage==='string'?result.providerMessage.slice(0,360):null});
          return reply(result);
        }catch(error){
          if(side==='buy')await this.storage.put('buy-last-check',{at:Date.now(),signalId:body.signalId,state:'blocked',reason:'buy_verification_failed',blockers:Array.isArray(error?.blockers)?error.blockers.filter(x=>/^[a-z_]{1,80}$/.test(x)).slice(0,12):[]});
          throw error;
        }
      }
      return reply({error:'Unknown account operation'},404);
    }catch{return reply({error:'Order verification failed; no new attempt will be made for an uncertain order'},503)}
  }
  async alarm(){
    const task=this.pending.then(async()=>{
      let rearm=true;
      try{
        const id=await this.storage.get('active-order');
        if(id){
          const outcome=await reconcileOrder({storage:this.storage,orderId:id,rpcUrl:this.env.RPC_URL});
          if(TERMINAL_ORDER_STATES.includes(outcome.state))await this.storage.delete('active-order');
          else return; // Unknown signatures stay locked; only reconcile again.
        }
        const arm=await this.storage.get('canary-arm');
        if(arm){
          if(arm.expiresAt<=Date.now()||await this.storage.get('canary-attempt'))await this.storage.delete('canary-arm');
          else{
            try{
              const response=await fetch('https://scopetrade.live/api/automation/canary/next',{
                method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+this.env.ORDER_CONTEXT_TOKEN},
                body:JSON.stringify({accountId:arm.accountId,armedAt:arm.armedAt}),signal:AbortSignal.timeout(7000)});
              if(response.ok){
                const candidate=await response.json();
                if(candidate.signalId){
                  const result=await runAccountOrder({storage:this.storage,env:this.env,
                    job:{accountId:arm.accountId,signalId:candidate.signalId},side:'buy',canary:true});
                  if(await this.storage.get('canary-attempt')||result.state==='blocked'&&result.reason==='canary_already_attempted')
                    await this.storage.delete('canary-arm');
                }
              }
            }catch(error){console.error('Armed canary check unavailable',String(error?.message||error))}
          }
        }
        const positions=await this.storage.list({prefix:'position:'});
        if(![...positions.values()].some(p=>p?.state==='open')){
          const pendingArm=await this.storage.get('canary-arm');
          rearm=Boolean(pendingArm&&pendingArm.expiresAt>Date.now());return;
        }
        await inspectOpenPositions({storage:this.storage,rpcUrl:this.env.RPC_URL});
        // A funded canary closes in full as soon as the confirmed buy exists.
        // It is isolated from automatic callout dispatch and normal targets.
        for(const position of positions.values())if(position?.state==='open'&&position.canary===true){
          const key='exit-intent:'+position.mint;
          if(!await this.storage.get(key))await this.storage.put(key,{state:'pending-verification',
            buyOrderId:position.buyOrderId,mint:position.mint,wallet:position.wallet,reason:'canary_full_exit',observedAt:Date.now()});
        }
        // Only the account's confirmed position and its observed exit intent
        // may start an automatic sell. The order host re-quotes, verifies the
        // full token balance, refreshes consent, and journals before signing.
        if(serviceConfiguration(this.env).executionEnabled||serviceConfiguration(this.env).canaryAvailable){
          const intents=await this.storage.list({prefix:'exit-intent:'});
          for(const [key,intent] of intents){
            const mint=key.slice('exit-intent:'.length),position=await this.storage.get('position:'+mint);
            if(intent?.state!=='pending-verification'||position?.state!=='open'||
              position.mint!==mint||position.buyOrderId!==intent.buyOrderId||
              !position.accountId||!position.signalId)continue;
            const canary=position.canary===true;
            if(Number(await this.storage.get('sell-failures:'+mint)||0)>=3)continue;
            if(!canary&&!serviceConfiguration(this.env).executionEnabled)continue;
            if(canary&&!serviceConfiguration(this.env).canaryAvailable)continue;
            try{
              const result=await runAccountOrder({storage:this.storage,env:this.env,
                job:{accountId:position.accountId,signalId:position.signalId},side:'sell',canary});
              await this.storage.put('exit-last-check:'+mint,{at:Date.now(),state:result.state||'unavailable',
                reason:result.state==='blocked'&&/^[a-z_]{1,80}$/.test(result.reason||'')?result.reason:null});
              if(result.state==='signing_unknown'||result.state==='broadcast'||result.state==='reconciliation_pending')break;
            }catch(error){
              const reason=exitErrorCode(error);
              await this.storage.put('exit-last-check:'+mint,{at:Date.now(),state:'blocked',reason});
              console.error('Exit submission unavailable',reason);
            }
          }
        }
      }
      finally{
        // RPC and quote failures must not silently stop a funded position's
        // exit watcher. An unresolved signature remains locked above.
        if(rearm){
          const next=await this.storage.getAlarm();
          const arm=await this.storage.get('canary-arm').catch(()=>null);
          const delay=arm&&arm.expiresAt>Date.now()?2000:8000;
          if(next===null||next>Date.now()+delay)await this.storage.setAlarm(Date.now()+delay);
        }
      }
    });
    this.pending=task.catch(()=>{});await task;
  }
}
