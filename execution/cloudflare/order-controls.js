// Server-only order admission. Inputs must be assembled from authenticated,
// independently verified records, never from a browser request body.
const ADDRESS=/^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const ID=/^[A-Za-z0-9:_-]{1,128}$/;
const MAX_U64=18446744073709551615n;

export function evaluateBuy(evidence, now=Date.now()){
  const block=(reason)=>({allowed:false,reason});
  if(!Number.isSafeInteger(now)||now<1||!evidence||typeof evidence!=='object')return block('invalid_evidence');
  if(evidence.killSwitch!==false||evidence.executionEnabled!==true)return block('execution_locked');
  if(evidence.accountStatus!=='active'||evidence.ownerVerified!==true||evidence.delegationVerified!==true||evidence.consentVerified!==true)return block('consent_or_account_unverified');
  if(!ID.test(evidence.accountId||'')||!ID.test(evidence.signalId||'')||!ADDRESS.test(evidence.wallet||'')||!ADDRESS.test(evidence.mint||'')||!ADDRESS.test(evidence.caller||''))return block('invalid_identity');
  if(evidence.selectedCaller!==true||evidence.signalVerified!==true||evidence.historyComplete!==true||evidence.firstCall!==true||evidence.mintAlreadyHeld!==false)return block('call_history_unverified');
  if(!Number.isSafeInteger(evidence.publishedAt)||evidence.publishedAt>now||now-evidence.publishedAt>30000||
     !Number.isSafeInteger(evidence.observedAt)||evidence.observedAt>now||evidence.observedAt<evidence.publishedAt||now-evidence.observedAt>20000)return block('stale_signal');
  if(!Number.isSafeInteger(evidence.monitorHeartbeatAt)||evidence.monitorHeartbeatAt>now||now-evidence.monitorHeartbeatAt>25000||evidence.feedHealthy!==true)return block('stale_feed');
  if(!Number.isSafeInteger(evidence.quoteAt)||evidence.quoteAt>now||now-evidence.quoteAt>5000||
     !Number.isFinite(evidence.marketCapUsd)||evidence.marketCapUsd<0||evidence.marketCapAllowed!==true)return block('quote_unverified');
  if(evidence.rpcHealthy!==true||evidence.signerPolicyVerified!==true||evidence.fullTransactionVerified!==true||evidence.simulationPassed!==true)return block('execution_prerequisite_unverified');
  let amount,dailyCap,dailyReserved,balance,fees;
  try{
    for(const name of ['maxLamports','dailyCapLamports','dailyReservedLamports','balanceLamports','maxFeeLamports']){
      if(!/^(0|[1-9]\d{0,19})$/.test(evidence[name]))return block('invalid_budget');
    }
    [amount,dailyCap,dailyReserved,balance,fees]=['maxLamports','dailyCapLamports','dailyReservedLamports','balanceLamports','maxFeeLamports'].map(k=>BigInt(evidence[k]));
  }catch{return block('invalid_budget')}
  if(amount<1000000n||amount>MAX_U64||dailyCap>MAX_U64||dailyReserved>dailyCap||fees>MAX_U64||
     amount+dailyReserved>dailyCap||amount+fees>balance)return block('budget_exceeded');
  return {allowed:true,reason:null,reservationLamports:amount.toString()};
}
