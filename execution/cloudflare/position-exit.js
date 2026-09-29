// Exit decisions use the confirmed trade cost from the actual buy, not
// the market cap observed before submission. A quote is an estimate: the sell
// transaction must still be rebuilt, simulated and reconciled independently.
const AMOUNT=/^[1-9]\d{0,19}$/;
const SIGNED=/^-(?:[1-9]\d{0,19})$/;

export function fullExitRules(rules){
  if(!rules||typeof rules!=='object'||Array.isArray(rules))throw Error('Saved exit rules unavailable');
  const {profit1Percent:take,profit1Sell:sell,profit2Percent:second,profit2Sell:secondSell,stopPercent:stop}=rules;
  if(second!=null||secondSell!=null||
     (take!=null&&(!Number.isSafeInteger(take)||take<1||take>1000||sell!==100))||
     (take==null&&sell!=null)||
     (stop!=null&&(!Number.isSafeInteger(stop)||stop<1||stop>=100))||
     (take==null&&stop==null))throw Error('Full-balance exit rules required');
  return {profitPercent:take??null,stopPercent:stop??null};
}

export function confirmedPosition({buyOrder,rules,now=Date.now()}){
  const receipt=buyOrder?.receipt;
  if(buyOrder?.state!=='confirmed'||receipt?.state!=='confirmed'||
    !AMOUNT.test(receipt.tokenDeltaRaw||'')||!SIGNED.test(receipt.solDeltaLamports||'')||
    !AMOUNT.test(receipt.tradeCostLamports||'')||
    !AMOUNT.test(buyOrder.amountLamports||'')||!Number.isSafeInteger(buyOrder.settledAt)||
    buyOrder.settledAt>now||!buyOrder.wallet||!buyOrder.mint||
    !/^did:privy:[A-Za-z0-9_-]{8,120}$/.test(buyOrder.accountId||'')||
    !/^[A-Za-z0-9-]{8,80}$/.test(buyOrder.signalId||''))throw Error('Confirmed buy receipt required');
  const cost=BigInt(receipt.tradeCostLamports);
  if(cost>BigInt(buyOrder.amountLamports)||cost>-BigInt(receipt.solDeltaLamports))
    throw Error('Buy spend exceeds reserved amount');
  const normalized=rules&&Object.hasOwn(rules,'profitPercent')?
    fullExitRules({profit1Percent:rules.profitPercent,profit1Sell:rules.profitPercent==null?null:100,
      profit2Percent:null,profit2Sell:null,stopPercent:rules.stopPercent}):fullExitRules(rules);
  return {state:'open',buyOrderId:buyOrder.id,accountId:buyOrder.accountId,signalId:buyOrder.signalId,caller:buyOrder.caller||null,wallet:buyOrder.wallet,mint:buyOrder.mint,
    openedAt:buyOrder.settledAt,amountRaw:receipt.tokenDeltaRaw,costLamports:cost.toString(),rules:normalized};
}

export function fullExitTrigger(position,quote,{now=Date.now(),maxQuoteAgeMs=5000}={}){
  if(position?.state!=='open'||!AMOUNT.test(position.costLamports||'')||!AMOUNT.test(position.amountRaw||'')||
    !AMOUNT.test(quote?.expectedSolOutLamports||'')||!Number.isSafeInteger(quote?.observedAt)||
    quote.observedAt>now||now-quote.observedAt>maxQuoteAgeMs||quote.amountRaw!==position.amountRaw||
    quote.mint!==position.mint||quote.wallet!==position.wallet)return {triggered:false,reason:'unverified_position_or_quote'};
  let rules;try{rules=fullExitRules({profit1Percent:position.rules?.profitPercent,profit1Sell:position.rules?.profitPercent==null?null:100,
    profit2Percent:null,profit2Sell:null,stopPercent:position.rules?.stopPercent})}catch{return {triggered:false,reason:'invalid_exit_rules'}}
  const cost=BigInt(position.costLamports),value=BigInt(quote.expectedSolOutLamports);
  if(rules.stopPercent!==null&&value*100n<=cost*BigInt(100-rules.stopPercent))return {triggered:true,reason:'stop'};
  if(rules.profitPercent!==null&&value*100n>=cost*BigInt(100+rules.profitPercent))return {triggered:true,reason:'profit'};
  return {triggered:false,reason:'target_not_reached'};
}
