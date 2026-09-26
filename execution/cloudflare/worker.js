// Independent execution host bootstrap. Optional RPC can prepare an unsigned
// trade for inspection, but no signer or broadcast route exists. Every
// financial request fails closed until the full execution pipeline is audited.
import {Connection} from '@solana/web3.js';
import {preparePumpCanaryBuy} from './pump-canary-build.js';

const BUILD='executor-preflight-v2';
const reply=(body,status=200)=>Response.json(body,{status,headers:{'cache-control':'no-store','x-content-type-options':'nosniff'}});
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
      canaryPreparationConfigured:typeof env?.CANARY_PREPARE_TOKEN==='string'&&env.CANARY_PREPARE_TOKEN.length>=32&&!!env.RPC_URL,
      reason:'Account authority, verified history, quotes and transaction reconciliation pending'});
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
