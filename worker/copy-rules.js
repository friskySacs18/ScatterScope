export function normalizedBands(value){
  if(!Array.isArray(value)||![1,3].includes(value.length))throw Error('Choose one amount or three market-cap ranges');
  if(value.length===1){
    if(value[0]?.belowUsd!==null)throw Error('A single amount applies at every market cap');
    const spendSol=Number(value[0]?.spendSol),units=Math.round(spendSol*1e9);
    if(!Number.isFinite(spendSol)||spendSol<.001||!Number.isSafeInteger(units)||Math.abs(spendSol*1e9-units)>.001)throw Error('Invalid SOL spend');
    return [{belowUsd:null,spendSol}];
  }
  const bands=value.map((x,i)=>({belowUsd:i===2?null:Number(x?.belowUsd),spendSol:Number(x?.spendSol)}));
  if(!Number.isSafeInteger(bands[0].belowUsd)||bands[0].belowUsd<1||
    !Number.isSafeInteger(bands[1].belowUsd)||bands[1].belowUsd<=bands[0].belowUsd||
    value[2]?.belowUsd!==null)throw Error('Market-cap limits must increase');
  for(const band of bands){const units=Math.round(band.spendSol*1e9);if(!Number.isFinite(band.spendSol)||band.spendSol<.001||!Number.isSafeInteger(units)||Math.abs(band.spendSol*1e9-units)>.001)throw Error('Invalid SOL spend in a range')}
  return bands;
}
export function spendForMarketCap(bands,marketCapUsd){
  const rules=normalizedBands(bands);
  if(typeof marketCapUsd!=='number'||!Number.isFinite(marketCapUsd)||marketCapUsd<=0)throw Error('A positive USD market cap is required');
  return rules.find(x=>x.belowUsd===null||marketCapUsd<x.belowUsd).spendSol;
}
// A caller's earliest *observed* call is not proof of their first-ever call.
// Require a separately verified complete history before allowing a first-call trade.
export function assessCopyCall({call,history,priorPurchase,quote,bands,now=Date.now()}){
  if(!call?.id||!call?.mint||!call?.caller)return {eligible:false,reason:'invalid_call'};
  if(!history?.complete)return {eligible:false,reason:'caller_history_unverified'};
  if(history.firstCalloutId!==call.id)return {eligible:false,reason:'repeat_caller_mint'};
  if(priorPurchase)return {eligible:false,reason:'mint_already_purchased'};
  if(!quote||quote.mint!==call.mint||!Number.isSafeInteger(quote.observedAt)||quote.observedAt>now||now-quote.observedAt>5000)return {eligible:false,reason:'market_cap_quote_unavailable_or_stale'};
  try{return {eligible:true,spendSol:spendForMarketCap(bands,quote.marketCapUsd),marketCapUsd:quote.marketCapUsd}}
  catch{return {eligible:false,reason:'market_cap_rules_invalid'}}
}
