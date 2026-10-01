import {quotePumpFullSell} from './pump-canary-build.js';
import {readOrderContext} from './account-executor.js';
import {reviewMatches} from './manual-sell-review.js';
export {reviewMatches};
export async function reviewManualSell({storage,env,accountId,mint,connection,quoteSell=quotePumpFullSell,contextReader=readOrderContext,now=Date.now}){
  const position=await storage.get('position:'+mint);
  if(position?.state!=='open'||position.accountId!==accountId)return {state:'blocked',reason:'open_position_required'};
  const buy=await storage.get('order:'+position.buyOrderId);
  if(buy?.state!=='confirmed'||buy.accountId!==accountId||buy.wallet!==position.wallet||buy.mint!==mint||
    buy.receipt?.state!=='confirmed'||buy.receipt.tokenDeltaRaw!==position.amountRaw)return {state:'blocked',reason:'verified_buy_receipt_required'};
  const active=await storage.get('active-order');
  if(active){const prior=await storage.get('order:'+active);
    if(!['confirmed','failed','expired','not_submitted'].includes(prior?.state))return {state:'blocked',reason:'prior_order_unresolved'};}
  const context=await contextReader(env,{accountId,signalId:position.signalId},position.canary?'canary-sell':'sell');
  if(context.evidence.wallet!==position.wallet||context.evidence.mint!==mint||context.walletId!==buy.walletId)
    return {state:'blocked',reason:'wallet_identity_unverified'};
  const quote=await quoteSell({connection,wallet:position.wallet,mint,amountRaw:position.amountRaw});
  if(quote.wallet!==position.wallet||quote.mint!==mint||quote.amountRaw!==position.amountRaw||
    !['pump-curve','pump-amm'].includes(quote.venue)||!Number.isSafeInteger(quote.observedAt)||now()-quote.observedAt>5000||
    quote.observedAt>now()||!/^[1-9]\d{0,19}$/.test(quote.expectedSolOutLamports||''))return {state:'blocked',reason:'sell_quote_unavailable'};
  const review={reviewId:crypto.randomUUID(),accountId,mint,wallet:position.wallet,buyOrderId:position.buyOrderId,
    amountRaw:position.amountRaw,venue:quote.venue,expectedSolOutLamports:quote.expectedSolOutLamports,
    minimumReceiveLamports:((BigInt(quote.expectedSolOutLamports)*95n+99n)/100n).toString(),
    quotedAt:quote.observedAt,expiresAt:now()+30000};
  if(Number.isInteger(quote.tokenDecimals)&&quote.tokenDecimals>=0&&quote.tokenDecimals<=18){
    const digits=position.amountRaw.padStart(quote.tokenDecimals+1,'0');
    review.tokenAmount=quote.tokenDecimals?digits.slice(0,-quote.tokenDecimals)+'.'+digits.slice(-quote.tokenDecimals):digits;
  }
  await storage.put('manual-sell-review:'+mint,review);
  return {state:'review',...review};
}
export async function confirmManualSell({storage,env,accountId,mint,reviewId,execute,now=Date.now}){
  const review=await storage.get('manual-sell-review:'+mint);
  if(review?.reviewId!==reviewId||review.accountId!==accountId)return {state:'blocked',reason:'manual_sell_review_required'};
  if(review.usedOrderId){
    const order=await storage.get('order:'+review.usedOrderId);
    if(order?.accountId!==accountId||order.mint!==mint||order.side!=='sell'||order.buyOrderId!==review.buyOrderId)
      return {state:'blocked',reason:'manual_sell_review_required'};
    return {state:order.state,orderId:order.id,signature:order.signature||null,reason:order.failureReason||null,providerMessage:order.failureDetail||null};
  }
  const position=await storage.get('position:'+mint);
  if(!reviewMatches(review,position,accountId,reviewId,now()))return {state:'blocked',reason:'manual_sell_review_expired'};
  return execute({storage,env,job:{accountId,signalId:position.signalId},side:'sell',canary:position.canary===true,manualReviewId:reviewId});
}
