// Independent execution host bootstrap. No key, signer, quote or RPC binding
// is installed here. Every financial request fails closed until an audited
// execution pipeline is connected and a funded canary is explicitly approved.
const BUILD='executor-preflight-v1';
const reply=(body,status=200)=>Response.json(body,{status,headers:{'cache-control':'no-store','x-content-type-options':'nosniff'}});
export default {
  async fetch(request){
    const path=new URL(request.url).pathname;
    if(request.method==='GET'&&path==='/status')return reply({service:'scope-order-executor',build:BUILD,
      executionEnabled:false,signerConfigured:false,ordersSupported:false,reason:'Account authority, verified history, quotes and transaction reconciliation pending'});
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
