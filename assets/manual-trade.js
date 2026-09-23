import {PublicKey,VersionedTransaction} from '@solana/web3.js';
import bs58 from 'bs58';

const $=id=>document.getElementById(id);
const form=$('tradeForm'),review=$('tradeReview'),confirm=$('confirmTrade'),status=$('tradeStatus');
let draft=null,busy=false;
const mintPattern=/^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
function setStatus(message,signature){
  status.replaceChildren(document.createTextNode(message));
  if(signature){const link=document.createElement('a');link.href='https://solscan.io/tx/'+encodeURIComponent(signature);link.target='_blank';link.rel='noopener noreferrer';link.textContent=' View transaction ↗';status.append(link)}
}
function invalidate(){draft=null;review.hidden=true}
function selectSide(){const sell=$('tradeSide').value==='sell';$('buyAmountField').hidden=sell;$('sellAmountField').hidden=!sell;invalidate()}
$('tradeSide').addEventListener('change',selectSide);
for(const id of ['tradeMint','tradeAmount','tradePercent','tradeSlippage'])$(id).addEventListener('input',invalidate);
$('cancelTrade').onclick=()=>{invalidate();setStatus('Trade cancelled. Nothing was sent.')};
window.addEventListener('scope-wallet-disconnected',()=>{invalidate();setStatus('Connect Phantom to trade.')});
window.addEventListener('scope-token-selected',event=>{$('tradeMint').value=event.detail.mint;$('tradeSide').value='sell';selectSide();$('tradeBox').scrollIntoView({behavior:'smooth',block:'center'});setStatus('Token selected. Confirm its mint address before selling.')});
form.addEventListener('submit',event=>{
  event.preventDefault();if(busy)return;
  const wallet=window.scopeWallet?.getAddress();
  if(!wallet){setStatus('Connect Phantom first.');return}
  const mint=$('tradeMint').value.trim(),action=$('tradeSide').value;
  const amount=Number(action==='buy'?$('tradeAmount').value:$('tradePercent').value),slippage=Number($('tradeSlippage').value);
  try{if(!mintPattern.test(mint)||new PublicKey(mint).toBase58()!==mint||mint===wallet)throw Error('Enter the token’s full Solana mint address.');}catch{setStatus('Enter the token’s full Solana mint address.');return}
  if(action==='buy'&&(!Number.isFinite(amount)||amount<.001||amount>5||!Number.isInteger(amount*1e9))){setStatus('Choose 0.001–5 SOL to buy.');return}
  if(action==='sell'&&(!Number.isInteger(amount)||amount<1||amount>100)){setStatus('Choose 1–100% of this token to sell.');return}
  if(!Number.isFinite(slippage)||slippage<.5||slippage>10){setStatus('Choose maximum slippage from 0.5% to 10%.');return}
  draft={wallet,mint,action,amount,slippage};
  $('tradeSummary').textContent=action==='buy'?`Buy ${mint.slice(0,6)}…${mint.slice(-6)} for ${amount} SOL · up to ${slippage}% slippage`:`Sell ${amount}% of ${mint.slice(0,6)}…${mint.slice(-6)} · up to ${slippage}% slippage`;
  $('reviewMint').textContent='Full mint: '+mint;
  review.hidden=false;setStatus('Review the token address and amount, then approve in Phantom.');review.scrollIntoView({behavior:'smooth',block:'nearest'});
});
confirm.onclick=async()=>{
  if(!draft||busy)return;
  const provider=window.scopeWallet?.getProvider(),wallet=window.scopeWallet?.getAddress();
  if(!provider||wallet!==draft.wallet){invalidate();setStatus('Wallet changed. Review again.');return}
  busy=true;confirm.disabled=true;let signature='';
  try{
    setStatus('Building transaction. Nothing has been signed yet.');
    const response=await fetch('/api/manual-trade/build',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(draft),signal:AbortSignal.timeout(16000)});
    const result=await response.json();if(!response.ok)throw Error(result.error||'Could not build transaction.');
    if(result.wallet!==draft.wallet||result.mint!==draft.mint||result.action!==draft.action||result.amount!==draft.amount||result.slippage!==draft.slippage)throw Error('Trade details changed. Nothing was signed.');
    const binary=atob(result.transaction),bytes=Uint8Array.from(binary,c=>c.charCodeAt(0));
    if(bytes.length>1232)throw Error('Transaction is too large. Nothing was signed.');
    const tx=VersionedTransaction.deserialize(bytes),keys=tx.message.staticAccountKeys.map(key=>key.toBase58());
    if(keys[0]!==wallet||tx.message.header.numRequiredSignatures!==1||tx.signatures.length!==1||!keys.includes(draft.mint))throw Error('Transaction did not match your wallet and token. Nothing was signed.');
    if(window.scopeWallet?.getAddress()!==wallet)throw Error('Wallet changed. Nothing was signed.');
    setStatus('Check Phantom’s transaction preview before approving.');
    const sent=await provider.signAndSendTransaction(tx);
    const raw=sent?.signature||sent?.hash||sent;
    signature=typeof raw==='string'?raw:raw instanceof Uint8Array?bs58.encode(raw):'';
    if(!/^[1-9A-HJ-NP-Za-km-z]{80,90}$/.test(signature))throw Error('Phantom did not return a transaction signature. Check your wallet activity before trying again.');
    invalidate();setStatus('Transaction submitted. Waiting for confirmation…',signature);
    for(let attempt=0;attempt<12;attempt++){
      await new Promise(resolve=>setTimeout(resolve,3000));
      let data;try{const check=await fetch('/api/manual-trade/status?signature='+encodeURIComponent(signature),{signal:AbortSignal.timeout(10000)});data=await check.json();if(!check.ok)continue}catch{continue}
      if(data.state==='failed'){setStatus('Transaction failed on chain. Review the explorer before another attempt.',signature);return}
      if(data.state==='confirmed'||data.state==='finalized'){setStatus('Trade confirmed on Solana.',signature);window.scopeWallet.refresh();return}
    }
    setStatus('Confirmation is taking longer. Check the explorer before trying again.',signature);
  }catch(error){setStatus((error?.message||'Trade was not completed.')+(signature?' Check the explorer before trying again.':''),signature)}
  finally{busy=false;confirm.disabled=false}
};
