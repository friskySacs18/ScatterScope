import React,{useEffect,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {PrivyProvider,usePrivy,useSigners} from '@privy-io/react-auth';
import {useWallets,useCreateWallet,useSignTransaction} from '@privy-io/react-auth/solana';
import {PublicKey,SystemProgram,TransactionMessage,VersionedTransaction} from '@solana/web3.js';
import bs58 from 'bs58';
import {createSolanaRpc,createSolanaRpcSubscriptions} from '@solana/kit';
import {lamportsOf} from './sol-amount.js';

const APP_ID='cmuejmq9g00eg0cla13182nah';
const addressPattern=/^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
function AutoTradeSetup({address}){
  const {getAccessToken}=usePrivy();
  const {addSigners}=useSigners();
  const [signerSetup,setSignerSetup]=useState(null),[granting,setGranting]=useState(false);
  useEffect(()=>{let active=true;fetch('/api/automation/signer-setup',{cache:'no-store'}).then(response=>response.json()).then(data=>{if(active)setSignerSetup(data)}).catch(()=>{if(active)setSignerSetup({ready:false,reason:'Signer setup is unavailable'})});return()=>{active=false}},[address]);
  const [saved,setSaved]=useState(()=>{try{return JSON.parse(localStorage.getItem('scope-trading-setup-v2')||'null')||{}}catch{return{}}});
  const initialBands=saved.marketCapBands||[];
  const [tiered,setTiered]=useState(initialBands.length===3);
  const [spend,setSpend]=useState(String(initialBands.length===1?initialBands[0].spendSol:''));
  const [lowSpend,setLowSpend]=useState(String(initialBands.length===3?initialBands[0].spendSol:''));
  const [middleSpend,setMiddleSpend]=useState(String(initialBands.length===3?initialBands[1].spendSol:''));
  const [largeSpend,setLargeSpend]=useState(String(initialBands.length===3?initialBands[2].spendSol:''));
  const [lowerCap,setLowerCap]=useState(String(initialBands.length===3?initialBands[0].belowUsd:''));
  const [upperCap,setUpperCap]=useState(String(initialBands.length===3?initialBands[1].belowUsd:''));
  const [first,setFirst]=useState(String(saved.profit1Percent??''));
  const [firstSell,setFirstSell]=useState(String(saved.profit1Sell??''));
  const [second,setSecond]=useState(String(saved.profit2Percent??''));
  const [secondSell,setSecondSell]=useState(String(saved.profit2Sell??''));
  const [stop,setStop]=useState(String(saved.stopPercent??''));
  const [message,setMessage]=useState('');
  useEffect(()=>{if(!address)return;let cancelled=false;(async()=>{
    try{const token=await getAccessToken();if(!token)return;const response=await fetch('/api/automation/draft',{headers:{Authorization:'Bearer '+token},cache:'no-store'});if(!response.ok)return;const data=await response.json();const draft=data.draft;
      if(cancelled||!draft||draft.wallet!==address)return;
      const r=draft.rules,b=r.marketCapBands||[];
      setTiered(b.length===3);setSpend(String(b.length===1?b[0].spendSol:''));
      if(b.length===3){setLowSpend(String(b[0].spendSol));setMiddleSpend(String(b[1].spendSol));setLargeSpend(String(b[2].spendSol));setLowerCap(String(b[0].belowUsd));setUpperCap(String(b[1].belowUsd))}
      setFirst(String(r.profit1Percent??''));setFirstSell(String(r.profit1Sell??''));setSecond(String(r.profit2Percent??''));setSecondSell(String(r.profit2Sell??''));setStop(String(r.stopPercent??''));
      if(Array.isArray(draft.callers)&&!localStorage.getItem('scope-caller-watchlist-v1'))localStorage.setItem('scope-caller-watchlist-v1',JSON.stringify(draft.callers));
      setMessage('Your saved rules were restored. Automatic orders are still off.');
    }catch{/* Device draft stays available when account sync is unavailable. */}
  })();return()=>{cancelled=true}},[address,getAccessToken]);
  async function save(event){
    event.preventDefault();
    const sol=value=>{if(!/^(?:0|[1-9]\d*)(?:\.\d{1,9})?$/.test(value))return null;const n=Number(value);return Number.isFinite(n)&&n>=.001&&Number.isSafeInteger(Math.round(n*1e9))?n:null};
    let marketCapBands;
    if(tiered){
      const low=Number(lowerCap),high=Number(upperCap),amounts=[lowSpend,middleSpend,largeSpend].map(sol);
      if(!Number.isSafeInteger(low)||low<1||!Number.isSafeInteger(high)||high<=low||amounts.some(x=>x===null)){setMessage('Enter two increasing USD market-cap limits and three SOL amounts.');return}
      marketCapBands=[{belowUsd:low,spendSol:amounts[0]},{belowUsd:high,spendSol:amounts[1]},{belowUsd:null,spendSol:amounts[2]}];
    }else{const amount=sol(spend);if(amount===null){setMessage('Enter how much SOL to spend per call (at least 0.001).');return}marketCapBands=[{belowUsd:null,spendSol:amount}]}
    const parsed=value=>value.trim()===''?null:Number(value);
    const p1=parsed(first),s1=parsed(firstSell),p2=parsed(second),s2=parsed(secondSell),sl=parsed(stop);
    const integer=(x,min,max)=>x===null||Number.isInteger(x)&&x>=min&&x<=max;
    if(!integer(p1,1,10000)||!integer(s1,1,100)||!integer(p2,1,10000)||!integer(s2,1,100)||!integer(sl,1,99)||
      (p1===null)!==(s1===null)||(p2===null)!==(s2===null)||(p2!==null&&(p1===null||p2<=p1||s1+s2>100))||(p1===null&&sl===null)){
      setMessage('Set a profit target and how much to sell, or a stop loss. A second target must be higher and cannot sell more than the remaining position.');return;
    }
    const state={fundingMode:'scope',marketCapBands,profit1Percent:p1,profit1Sell:s1,profit2Percent:p2,profit2Sell:s2,stopPercent:sl};
    try{localStorage.setItem('scope-trading-setup-v2',JSON.stringify(state));setSaved(state)}catch{setMessage('Device storage unavailable; rules were not saved.');return}
    setMessage('Saved on this device. Saving to your account…');
    try{
      const token=await getAccessToken();if(!token||!address)throw Error('Sign in and create your Scope wallet to sync these rules.');
      const raw=JSON.parse(localStorage.getItem('scope-caller-watchlist-v1')||'[]');
      const callers=(Array.isArray(raw)?raw:[]).map(x=>typeof x==='string'?{wallet:x,username:''}:{wallet:x.wallet,username:x.username||''});
      const response=await fetch('/api/automation/draft',{method:'PUT',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({wallet:address,callers,rules:state})});
      const result=await response.json();if(!response.ok)throw Error(result.error||'Account draft unavailable');
      setMessage('Rules saved to your account. Automatic orders remain off.');
    }catch(error){setMessage('Saved on this device only. '+(error.message||'Account sync unavailable')+' Automatic orders remain off.')}
  }
  async function authorize(){
    if(!address||!signerSetup?.ready||!signerSetup.policyId||!signerSetup.quorumId||granting)return;
    setGranting(true);setMessage('Review the wallet permission request in Privy.');
    try{await addSigners({address,signers:[{signerId:signerSetup.quorumId,policyIds:[signerSetup.policyId]}]});setMessage('Signer authorized under the restricted policy. Automatic orders remain off until the execution service is enabled.')}catch(error){setMessage(error?.message||'Signer authorization was not completed.')}finally{setGranting(false)}
  }
  return <section className="panel wide" id="autoRules"><span className="tag">04 / YOUR SNIPE RULES</span><h2>Choose your buy and exit.</h2><p>These rules are saved for your Scope wallet. They do not place orders while automatic trading is off.</p><form onSubmit={save} className="rule-form">
    <div className="rule-section"><div className="rule-heading"><span className="rule-number">01</span><div><h3>How much should each call buy?</h3><p>Choose one SOL amount for every call, or set amounts by the coin’s market cap.</p></div></div>
      <div className="mode-picker"><label><input type="radio" name="spendMode" checked={!tiered} onChange={()=>setTiered(false)}/> Same amount every time</label><label><input type="radio" name="spendMode" checked={tiered} onChange={()=>setTiered(true)}/> Change amount by market cap</label></div>
      {!tiered?<label className="field"><span>SOL TO SPEND PER CALL</span><input type="number" min="0.001" step="0.000000001" inputMode="decimal" value={spend} onChange={e=>setSpend(e.target.value)} placeholder="Your amount" required/></label>:
      <div className="tier-grid"><label className="field"><span>BELOW USD MARKET CAP</span><input type="number" min="1" step="1" inputMode="numeric" value={lowerCap} onChange={e=>setLowerCap(e.target.value)} placeholder="First cutoff" required/></label><label className="field"><span>BUY / SOL</span><input type="number" min="0.001" step="0.000000001" inputMode="decimal" value={lowSpend} onChange={e=>setLowSpend(e.target.value)} placeholder="Your amount" required/></label><label className="field"><span>BELOW USD MARKET CAP</span><input type="number" min="2" step="1" inputMode="numeric" value={upperCap} onChange={e=>setUpperCap(e.target.value)} placeholder="Second cutoff" required/></label><label className="field"><span>BUY / SOL</span><input type="number" min="0.001" step="0.000000001" inputMode="decimal" value={middleSpend} onChange={e=>setMiddleSpend(e.target.value)} placeholder="Your amount" required/></label><div className="tier-label">AT OR ABOVE SECOND CUTOFF</div><label className="field"><span>BUY / SOL</span><input type="number" min="0.001" step="0.000000001" inputMode="decimal" value={largeSpend} onChange={e=>setLargeSpend(e.target.value)} placeholder="Your amount" required/></label></div>}
    </div>
    <div className="rule-section"><div className="rule-heading"><span className="rule-number">02</span><div><h3>When should Scope sell?</h3><p>Set a profit target, a stop loss, or both. Leave unused exits empty.</p></div></div>
      <div className="tier-grid"><label className="field"><span>FIRST PROFIT / % ABOVE BUY</span><input type="number" min="1" max="10000" step="1" inputMode="numeric" value={first} onChange={e=>setFirst(e.target.value)} placeholder="Optional"/></label><label className="field"><span>SELL / % OF POSITION</span><input type="number" min="1" max="100" step="1" inputMode="numeric" value={firstSell} onChange={e=>{setFirstSell(e.target.value);if(e.target.value==='100'){setSecond('');setSecondSell('')}}} placeholder="Up to 100"/></label></div>
      <details className="extra-exits" open={second!==''||secondSell!==''?true:undefined}><summary>ADD A SECOND PROFIT TARGET <span>OPTIONAL</span></summary><div className="tier-grid"><label className="field"><span>SECOND PROFIT / % ABOVE BUY</span><input type="number" min="1" max="10000" step="1" inputMode="numeric" value={second} onChange={e=>setSecond(e.target.value)} disabled={firstSell==='100'} placeholder="Optional"/></label><label className="field"><span>SELL / % OF POSITION</span><input type="number" min="1" max="100" step="1" inputMode="numeric" value={secondSell} onChange={e=>setSecondSell(e.target.value)} disabled={firstSell==='100'} placeholder="Optional"/></label></div>{firstSell==='100'&&<p>Selling 100% at the first target leaves nothing for a second.</p>}</details>
      <label className="field"><span>STOP LOSS / % BELOW BUY</span><input type="number" min="1" max="99" step="1" inputMode="numeric" value={stop} onChange={e=>setStop(e.target.value)} placeholder="Optional"/></label>
    </div>
    <div className="rule-submit"><p>Only a caller’s first verified call for a coin is eligible. A coin already bought by your account is skipped.</p><button className="action primary" type="submit">SAVE MY RULES</button></div>
  </form><details className="note"><summary>Automatic trade permission</summary><p>A server signer needs separate Privy approval under a restricted policy. Automatic trading remains off until order execution is verified.</p><button type="button" className="action" disabled={!signerSetup?.ready||granting||!address} onClick={authorize}>AUTHORIZE IN PRIVY</button><p>{signerSetup?.reason||(!signerSetup?.ready?'Checking signer and policy…':'Review the policy before you authorize.')}</p></details><p className="status" role="status">{message||'Your settings are a draft. Automatic spending is locked.'}</p></section>;
}

function TradingStatus(){
  const [readiness,setReadiness]=useState(null);
  useEffect(()=>{let active=true;async function check(){try{const response=await fetch('/api/automation/readiness',{cache:'no-store'});if(!response.ok)throw Error('Unavailable');const result=await response.json();if(active)setReadiness(result)}catch{if(active)setReadiness(null)}}void check();const timer=setInterval(check,30000);return()=>{active=false;clearInterval(timer)}},[]);
  return <section className="panel wide"><span className="tag">TRADING STATUS</span><div className="note"><strong>Automatic trading is inactive.</strong><p>Your Scope wallet is for automated callout trades when the execution service is enabled. You can fund and withdraw SOL today. Callouts appear while the caller page is open. Saved snipe rules are drafts and do not place orders yet.</p>{readiness&&<p>Callout monitor: {readiness.monitorConfigured?(readiness.sourceLive?'receiving recent checks':'no recent checks'):'not connected'} · Account rule sync: {readiness.draftStorageConfigured?'configured':'waiting for verification key'} · Automatic orders: off</p>}<p>Only authorize a signer after its wallet permission is available to review. Check the deposit and withdrawal flow with a small amount before relying on this account.</p></div><a className="action" href="/portfolio">USE DIRECT PHANTOM INSTEAD ↗</a></section>;
}
function Account(){
  const {ready,authenticated,login,logout,getAccessToken}=usePrivy();
  const {wallets,ready:walletsReady}=useWallets();
  const {createWallet}=useCreateWallet();
  const {signTransaction}=useSignTransaction();
  const [balance,setBalance]=useState(null),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[destination,setDestination]=useState(''),[amount,setAmount]=useState(''),[review,setReview]=useState(null),[signature,setSignature]=useState('');
  const [balanceMessage,setBalanceMessage]=useState('');
  const [walletCheck,setWalletCheck]=useState('');
  const [pending,setPending]=useState(false);
  const wallet=authenticated&&walletsReady?wallets.find(w=>w.standardWallet?.name==='Privy'):null;
  const address=wallet?.address||'';
  async function verifyWallet(){
    setWalletCheck('Checking wallet ownership with Privy…');
    try{
      const token=await getAccessToken();if(!token)throw Error('Sign in again to verify this wallet.');
      const response=await fetch('/api/automation/wallet?wallet='+encodeURIComponent(address),{headers:{Authorization:'Bearer '+token},cache:'no-store'});
      const data=await response.json();if(!response.ok)throw Error(data.error||'Verification unavailable');
      setWalletCheck(data.verified?'Privy confirms this wallet belongs to your signed-in account. Automatic trading is still off.':'This wallet could not be linked to your signed-in account. Do not fund it for automatic trading.');
    }catch(error){setWalletCheck(error.message||'Verification unavailable.');}
  }
  async function refresh(quiet=false){
    if(!address)return;
    if(!quiet)setBalanceMessage('Checking your SOL balance…');
    try{
      const token=await getAccessToken();if(!token)throw Error('Sign in again to refresh your balance.');
      const response=await fetch('/api/account/balance?wallet='+encodeURIComponent(address),{headers:{Authorization:'Bearer '+token},cache:'no-store'});
      const data=await response.json();if(!response.ok)throw Error(data.error||'Balance unavailable');
      setBalance(data.lamports);setBalanceMessage(data.source==='privy'?'Updated from your Privy wallet.':'Updated from Solana.');
    }catch(error){setBalance(null);setBalanceMessage(error.message||'Balance unavailable.');}
  }
  useEffect(()=>{setBalance(null);setReview(null);setWalletCheck('');setBalanceMessage('');const stored=address?localStorage.getItem('scope-pending-withdrawal-'+address):null;setSignature(stored||'');setPending(Boolean(stored));if(stored)setMessage('Check this transfer signature before starting another withdrawal.');if(address)refresh();},[address]);
  function prepare(event){
    event.preventDefault();setReview(null);
    if(pending){setMessage('Check your previous transfer before preparing another withdrawal.');return;}
    try{
      if(!wallet||!addressPattern.test(destination.trim()))throw Error('Enter a valid destination address.');
      const to=new PublicKey(destination.trim()).toBase58();
      if(to===address)throw Error('Enter an address other than this account.');
      const units=lamportsOf(amount.trim());
      if(units===null)throw Error('Enter a positive SOL amount with at most nine decimal places, such as 0.005.');
      if(balance===null)throw Error('Refresh your balance before withdrawing.');
      if(units+10000n>BigInt(balance))throw Error('Leave at least 0.00001 SOL for network fees.');
      const entered=amount.trim().replace(',', '.');
      setReview({to,units,display:entered.startsWith('.')?'0'+entered:entered});setMessage('Check the amount and full destination before approving.');
    }catch(error){setMessage(error.message||'Review failed');}
  }
  async function checkTransfer(encoded=signature){
    if(!encoded)return;
    try{
      const check=await fetch('/api/manual-trade/status?signature='+encodeURIComponent(encoded),{cache:'no-store'});
      const result=await check.json();if(!check.ok)throw Error(result.error||'Confirmation status unavailable.');
      if(result.state==='confirmed'||result.state==='finalized'){
        setMessage('Transfer confirmed on Solana.');setPending(false);localStorage.removeItem('scope-pending-withdrawal-'+address);await refresh(true);
      }else if(result.state==='failed'){
        setMessage('Transfer failed on Solana. Review the signature before another attempt.');setPending(false);localStorage.removeItem('scope-pending-withdrawal-'+address);await refresh(true);
      }else setMessage('Transfer status is pending or unavailable in the RPC history. Check the explorer before retrying.');
    }catch(error){setMessage((error?.message||'Status unavailable.')+' Check the transaction explorer before retrying.');}
  }
  async function send(){
    if(!review||!wallet||busy||pending)return;
    setBusy(true);setMessage('Preparing transfer…');let signedSignature='';
    try{
      const response=await fetch('/api/account/blockhash',{cache:'no-store'});const data=await response.json();if(!response.ok||!data.blockhash)throw Error(data.error||'Could not fetch a recent blockhash.');
      const instruction=SystemProgram.transfer({fromPubkey:new PublicKey(address),toPubkey:new PublicKey(review.to),lamports:Number(review.units)});
      const wire=new VersionedTransaction(new TransactionMessage({payerKey:new PublicKey(address),recentBlockhash:data.blockhash,instructions:[instruction]}).compileToV0Message());
      setMessage('Approve this SOL transfer in your Privy wallet.');
      const result=await signTransaction({transaction:wire.serialize(),wallet,chain:'solana:mainnet',options:{uiOptions:{showWalletUIs:true}}});
      const signed=VersionedTransaction.deserialize(result.signedTransaction);
      signedSignature=bs58.encode(signed.signatures[0]);
      if(!signedSignature||signed.signatures[0].every(byte=>byte===0))throw Error('Privy did not return a signed transaction. Nothing was submitted.');
      setSignature(signedSignature);setPending(true);localStorage.setItem('scope-pending-withdrawal-'+address,signedSignature);
      setReview(null);setMessage('Signed. Submitting this transfer to Solana…');
      const token=await getAccessToken();if(!token)throw Error('Session expired after signing. Check this signature before trying again.');
      const broadcast=await fetch('/api/account/withdraw',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify({wallet:address,destination:review.to,lamports:Number(review.units),transaction:btoa(String.fromCharCode(...result.signedTransaction))})});
      const submitted=await broadcast.json();if(!broadcast.ok)throw Error(submitted.error||'Submission status unknown.');
      setAmount('');setMessage('Submitted. Checking confirmation…');
      for(let attempt=0;attempt<8;attempt++){
        await new Promise(resolve=>setTimeout(resolve,2500));
        const check=await fetch('/api/manual-trade/status?signature='+encodeURIComponent(signedSignature),{cache:'no-store'});
        if(!check.ok)continue;const status=await check.json();
        if(status.state==='confirmed'||status.state==='finalized'||status.state==='failed'){await checkTransfer(signedSignature);return;}
      }
      setMessage('Submitted; confirmation is still pending. Check the signature before trying again.');
    }catch(error){setMessage((error?.message||'Transfer failed.')+(signedSignature?' The signed transfer has a signature; check its status before retrying.':''));}
    finally{setBusy(false);}
  }
  if(!ready||!walletsReady)return <div className="panel">Opening your account…</div>;
  if(!authenticated)return <div className="panel"><h2>Sign in to create an account.</h2><p>Your login controls a separate Privy Solana wallet. Sign in with an option enabled in your Privy app.</p><button className="action primary" onClick={login}>SIGN IN WITH PRIVY</button></div>;
  if(!wallet)return <div className="panel"><h2>Create your Solana wallet.</h2><p>One dedicated address for receiving SOL. Account creation does not delegate trading access to Scope.</p><button className="action primary" disabled={busy} onClick={async()=>{setBusy(true);try{await createWallet();setMessage('Wallet created.');}catch(error){setMessage(error?.message||'Could not create wallet.')}finally{setBusy(false)}}}>CREATE WALLET</button><button className="action" onClick={logout}>SIGN OUT</button><p role="status" className="status">{message}</p></div>;
  return <div className="grid"><section className="panel wide snipe-start"><div><span className="tag">CALLOUT SNIPING · AUTOMATIC ORDERS OFF</span><h2>Follow callers. Set your rules.</h2></div><div className="snipe-actions"><a className="action primary" href="/#callerDesk">ADD CALLERS ↗</a><a className="action" href="#autoRules">SET SNIPE RULES ↓</a></div></section><section className="panel"><span className="tag">02 / FUND SCOPE WALLET</span><h2>Your wallet</h2><div className="balance">{balance===null?'—':(Number(balance)/1e9).toLocaleString(undefined,{maximumFractionDigits:9})} <span style={{fontSize:19}}>SOL</span></div><p>Receive SOL at this exact Solana mainnet address. Verify it in the Privy wallet before sending a small test amount.</p><code className="address">{address}</code><button className="action" onClick={async()=>{try{await navigator.clipboard.writeText(address);setMessage('Address copied.')}catch{setMessage('Select and copy the address above.')}}}>COPY ADDRESS</button><button className="action" disabled={busy} onClick={()=>refresh()}>REFRESH BALANCE</button><p role="status" className="status">{balanceMessage}</p><button className="action" onClick={verifyWallet}>VERIFY ACCOUNT WALLET</button><p role="status" className="status">{walletCheck}</p><button className="action" onClick={logout}>SIGN OUT</button></section><section className="panel"><span className="tag">03 / WITHDRAW SOL</span><h2>Withdraw SOL</h2><p>Review the recipient and amount. Your Privy wallet asks you to approve this transfer.</p><form onSubmit={prepare}><label className="field"><span>DESTINATION / SOLANA ADDRESS</span><input autoComplete="off" spellCheck="false" value={destination} onChange={e=>{setDestination(e.target.value);setReview(null);setMessage('')}} placeholder="Paste recipient address" required /></label><label className="field"><span>AMOUNT / SOL</span><input inputMode="decimal" value={amount} onChange={e=>{setAmount(e.target.value);setReview(null);setMessage('')}} placeholder="0.01" required /></label><button className="action primary" disabled={busy||pending} type="submit">REVIEW WITHDRAWAL</button></form>{review&&<div className="review"><strong>Send {review.display} SOL</strong><p>To this full address:</p><code>{review.to}</code><p>Network fees come from this wallet. Transfers cannot be reversed.</p><button className="action primary" disabled={busy} onClick={send}>APPROVE IN PRIVY</button><button className="action" disabled={busy} onClick={()=>setReview(null)}>CANCEL</button></div>}{signature&&<div className="transfer-track"><span className="tag">TRANSFER SIGNATURE</span><code className="address">{signature}</code><a className="action" href={'https://solscan.io/tx/'+signature} target="_blank" rel="noopener noreferrer">VIEW ON SOLSCAN ↗</a><button className="action" disabled={busy} onClick={()=>checkTransfer()}>CHECK TRANSFER STATUS</button></div>}<p role="status" className="status">{message}</p></section><AutoTradeSetup address={address}/><TradingStatus/></div>;
}
createRoot(document.getElementById('accountRoot')).render(<PrivyProvider appId={APP_ID} config={{embeddedWallets:{solana:{createOnLogin:'users-without-wallets'}},appearance:{theme:'dark',accentColor:'#d8b279'},solana:{rpcs:{'solana:mainnet':{rpc:createSolanaRpc('https://solana-rpc.publicnode.com'),rpcSubscriptions:createSolanaRpcSubscriptions('wss://solana-rpc.publicnode.com')}}}}}><Account/></PrivyProvider>);
