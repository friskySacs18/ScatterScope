const UUID=/^[0-9a-f-]{36}$/;
export function reviewMatches(review,position,accountId,reviewId,now=Date.now()){
  return Boolean(UUID.test(reviewId||'')&&review?.reviewId===reviewId&&review.accountId===accountId&&
    review.mint===position?.mint&&review.wallet===position?.wallet&&review.buyOrderId===position?.buyOrderId&&
    review.amountRaw===position?.amountRaw&&position?.accountId===accountId&&position.state==='open'&&
    Number.isSafeInteger(review.expiresAt)&&review.expiresAt>now&&
    /^[1-9]\d{0,19}$/.test(review.minimumReceiveLamports||''));
}
