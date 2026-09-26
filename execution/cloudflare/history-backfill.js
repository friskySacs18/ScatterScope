// Read-only historical candidate. Pagination exhaustion proves only that the
// provider has no older stored rows; it does not prove its archive began when
// the caller joined Pump. Never flip history_complete on this result alone.
const ADDRESS=/^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const BASE='https://api.fomoscan.sh/v2/pump/thesis/wallet/';

export async function loadPaginatedCallerHistory(wallet,{apiKey,fetcher=fetch,maxPages=100}={}){
  if(!ADDRESS.test(wallet||''))throw Error('Invalid caller wallet');
  if(typeof apiKey!=='string'||apiKey.length<16)throw Error('History provider key missing');
  if(!Number.isSafeInteger(maxPages)||maxPages<1||maxPages>1000)throw Error('Invalid history page limit');
  const ids=new Set(),cursors=new Set(),firstByMint=new Map();
  let before=null,lastPublished=Infinity;
  for(let page=0;page<maxPages;page++){
    const url=BASE+encodeURIComponent(wallet)+(before?'?before='+encodeURIComponent(before):'');
    const response=await fetcher(url,{headers:{authorization:'Bearer '+apiKey,accept:'application/json'},redirect:'error',signal:AbortSignal.timeout(8000)});
    if(!response.ok)throw Error('History provider unavailable: HTTP '+response.status);
    const raw=await response.text();
    if(raw.length>250000)throw Error('History provider response too large');
    const envelope=JSON.parse(raw),body=envelope?.data??envelope;
    if(!body||!Array.isArray(body.items)||body.items.length>25||typeof body.hasMore!=='boolean')throw Error('Invalid history page');
    for(const row of body.items){
      if(typeof row?.id!=='string'||row.id.length<1||row.id.length>160||row.wallet!==wallet||!ADDRESS.test(row.coinMint||'')||
        !Number.isSafeInteger(row.createdAt)||row.createdAt<1||row.createdAt>Date.now()+10000||ids.has(row.id)||row.createdAt>lastPublished)
        throw Error('Inconsistent caller history');
      ids.add(row.id);lastPublished=row.createdAt;
      const previous=firstByMint.get(row.coinMint);
      if(!previous||row.createdAt<previous.createdAt)firstByMint.set(row.coinMint,{id:row.id,createdAt:row.createdAt});
    }
    if(body.hasMore!==true){
      return {paginationExhausted:true,callerWallet:wallet,callCount:ids.size,pageCount:page+1,oldestAt:Number.isFinite(lastPublished)?lastPublished:null,
        firstByMint:Object.fromEntries(firstByMint)};
    }
    if(body.items.length===0||typeof body.nextBefore!=='string'||!body.nextBefore||cursors.has(body.nextBefore))
      throw Error('Invalid history cursor');
    cursors.add(body.nextBefore);before=body.nextBefore;
  }
  throw Error('History page limit reached; completeness unverified');
}
