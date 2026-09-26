// Independent execution host bootstrap. Optional RPC can prepare an unsigned
// trade for inspection, but no signer or broadcast route exists. Every
// financial request fails closed until the full execution pipeline is audited.
import {Connection} from '@solana/web3.js';
import {preparePumpCanaryBuy} from './pump-canary-build.js';

const BUILD='executor-preflight-v4';
const reply=(body,status=200)=>Response.json(body,{status,headers:{'cache-control':'no-store','x-content-type-options':'nosniff'}});
const page=`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Scope trade preflight</title><style>body{font:16px system-ui;background:#11151d;color:#f4f7ff;max-width:500px;margin:32px auto;padding:18px;line-height:1.5}label{display:block;margin:18px 0 7px}input,button{box-sizing:border-box;width:100%;padding:13px;border-radius:10px;border:1px solid #8894ae;font:inherit}button{background:#c6fb78;border:0;margin-top:22px;font-weight:700}p,small{color:#b5bfd1}output{display:block;white-space:pre-wrap;margin-top:20px}</style><h1>Unsigned trade check</h1><p>Checks one 0.002 SOL Pump buy against current chain state. This page cannot sign, submit, or enable orders.</p><form id="preflight" autocomplete="off"><label for="token">Operator token</label><input id="token" type="password" autocomplete="off" required><label for="wallet">Your Scope wallet address</label><input id="wallet" spellcheck="false" autocapitalize="off" required><label for="mint">Pump token mint address</label><input id="mint" spellcheck="false" autocapitalize="off" required><button>Check unsigned trade</button></form><output id="result" role="status"></output><script src="/canary/ui.js" defer></script></html>`;
const pageScript=`const form=document.querySelector('#preflight'),output=document.querySelector('#result');form.addEventListener('submit',async event=>{event.preventDefault();const token=document.querySelector('#token').value.trim(),wallet=document.querySelector('#wallet').value.trim(),mint=document.querySelector('#mint').value.trim();document.querySelector('#token').value='';output.textContent='Checking current chain state…';form.querySelector('button').disabled=true;try{const response=await fetch('/canary/prepare',{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+token},body:JSON.stringify({wallet,mint}),cache:'no-store'});const result=await response.json();output.textContent=response.ok?'Unsigned trade simulated. Maximum spend: '+(Number(result.maximumSpendLamports)/1e9).toFixed(6)+' SOL. Token amount (raw): '+result.tokenAmountRaw+'. Simulated compute units: '+result.simulationUnits+'. No transaction was signed or sent.':response.status===401?'Operator token was rejected.':result.error||'Preflight unavailable.'}catch{output.textContent='Network check failed; no transaction was sent.'}finally{form.querySelector('button').disabled=false}});`;
const ADDRESS=/^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const utf8=new TextEncoder();
function sameSecret(a,b){
  if(typeof a!=='string'||typeof b!=='string'||b.length<32||a.length!==b.length)return false;
  const x=utf8.encode(a),y=utf8.encode(b);let diff=0;
  for(let i=0;i<x.length;i++)diff|=x[i]^y[i];
  return diff===0;
}
export default {
  async fetch(request,env){
    const path=new URL(request.url).pathname;
    if(request.method==='GET'&&path==='/status')return reply({service:'scope-order-executor',build:BUILD,
      executionEnabled:false,signerConfigured:false,ordersSupported:false,
      rpcConfigured:typeof env?.RPC_URL==='string'&&env.RPC_URL.startsWith('https://'),
      canaryPreparationConfigured:typeof env?.CANARY_PREPARE_TOKEN==='string'&&env.CANARY_PREPARE_TOKEN.length>=32&&!!env.RPC_URL,
      reason:'Account authority, verified history, quotes and transaction reconciliation pending'});
    if(request.method==='GET'&&path==='/canary/ui')return new Response(page,{headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff','referrer-policy':'no-referrer','content-security-policy':"default-src 'none'; script-src 'self'; style-src 'unsafe-inline'; connect-src 'self'; form-action 'none'; frame-ancestors 'none'; base-uri 'none'"}});
    if(request.method==='GET'&&path==='/canary/ui.js')return new Response(pageScript,{headers:{'content-type':'text/javascript; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}});
    // An operator-only, read-only canary preflight. It returns an unsigned
    // transaction; no signing, broadcast or journal mutation is possible here.
    if(path==='/canary/prepare'){
      if(request.method!=='POST')return reply({error:'Method not allowed'},405);
      if(!sameSecret(request.headers.get('authorization')?.replace(/^Bearer /,''),env?.CANARY_PREPARE_TOKEN))
        return reply({error:'Unauthorized'},401);
      if(typeof env?.RPC_URL!=='string'||!/^https:\/\//.test(env.RPC_URL))return reply({error:'RPC not configured'},503);
      if(Number(request.headers.get('content-length'))>1024)return reply({error:'Request too large'},413);
      let body;
      try{const raw=await request.text();if(raw.length>1024)throw Error('Invalid body');body=JSON.parse(raw)}
      catch{return reply({error:'Invalid body'},400)}
      if(!body||Object.keys(body).sort().join(',')!=='mint,wallet'||!ADDRESS.test(body.wallet||'')||!ADDRESS.test(body.mint||''))
        return reply({error:'Expected wallet and mint addresses'},400);
      try{
        const result=await preparePumpCanaryBuy({connection:new Connection(env.RPC_URL,'confirmed'),wallet:body.wallet,mint:body.mint});
        return reply({kind:'unsigned-canary-buy',...result,executionEnabled:false});
      }catch{return reply({error:'Canary could not be prepared from current chain state'},422)}
    }
    if(['/orders/buy','/orders/sell','/orders/reconcile','/canary'].includes(path))
      return reply({error:'Live-capital interlock is locked',executionEnabled:false},423);
    return reply({error:'Not found'},404);
  }
};

// A per-account durable namespace is declared now so later account isolation
// does not reuse the public monitor's persistent storage or signing secrets.
export class AccountOrderJournal {
  constructor(state){this.storage=state.storage}
  async fetch(){return reply({error:'Account journal is not connected to an authorized order service'},423)}
}
