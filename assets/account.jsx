import React,{useEffect,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {PrivyProvider,usePrivy,useSigners} from '@privy-io/react-auth';
import {useWallets,useCreateWallet,useSignAndSendTransaction} from '@privy-io/react-auth/solana';
import {PublicKey,SystemProgram,TransactionMessage,VersionedTransaction} from '@solana/web3.js';
import bs58 from 'bs58';

const APP_ID='cmuejmq9g00eg0cla13182nah';
const addressPattern=/^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
function lamportsOf(value){
  if(!/^(?:0|[1-9]\d*)(?:\.\d{1,9})?$/.test(value))return null;
  const [whole,part='']=value.split('.');
  const units=BigInt(whole)*1000000000n+BigInt(part.padEnd(9,'0'));
  return units>0n&&units<=BigInt(Number.MAX_SAFE_INTEGER)?units:null;
}
function AutoTradeSetup({address}){
  const {getAccessToken}=usePrivy();
  const {addSigners}=useSigners();
  const [signerSetup,setSignerSetup]=useState(null),[granting,setGranting]=useState(false);
  useEffect(()=>{let active=true;fetch('/api/automation/signer-setup',{cache:'no-store'}).then(response=>response.json()).then(data=>{if(active)setSignerSetup(data)}).catch(()=>{if(active)setSignerSetup({ready:false,reason:'Signer setup is unavailable'})});return()=>{active=false}},[address]);
  const [saved,setSaved]=useState(()=>{try{return JSON.parse(localStorage.getItem('scope-trading-setup-v2')||'null')||{}}catch{return{}}});
  const initialBands=saved.marketCapBands||[{belowUsd:'',spendSol:''},{belowUsd:'',spendSol:''},{belowUsd:null,spendSol:''}];
  const [spend,setSpend]=useState(String(initialBands[0].spendSol));
  const [middleSpend,setMiddleSpend]=useState(String(initialBands[1].spendSol));
  const [largeSpend,setLargeSpend]=useState(String(initialBands[2].spendSol));
  const [lowerCap,setLowerCap]=useState(String(initialBands[0].belowUsd));
  const [upperCap,setUpperCap]=useState(String(initialBands[1].belowUsd));
  const [first,setFirst]=useState(String(saved.profit1Percent??''));
  const [firstSell,setFirstSell]=useState(String(saved.profit1Sell??''));
  const [second,setSecond]=useState(String(saved.profit2Percent??''));
  const [secondSell,setSecondSell]=useState(String(saved.profit2Sell??''));
  const [stop,setStop]=useState(String(saved.stopPercent??''));
  const [message,setMessage]=useState('');
  useEffect(()=>{if(!address)return;let cancelled=false;(async()=>{
    try{const token=await getAccessToken();if(!token)return;const response=await fetch('/api/automation/draft',{headers:{Authorization:'Bearer '+token},cache:'no-store'});if(!response.ok)return;const data=await response.json();const draft=data.draft;
      if(cancelled||!draft||draft.wallet!==address)return;
      const r=draft.rules,b=r.marketCapBands||[{belowUsd:'',spendSol:''},{belowUsd:'',spendSol:''},{belowUsd:null,spendSol:''}];
      setSpend(String(b[0].spendSol));setMiddleSpend(String(b[1].spendSol));setLargeSpend(String(b[2].spendSol));setLowerCap(String(b[0].belowUsd));setUpperCap(String(b[1].belowUsd));setFirst(String(r.profit1Percent));setFirstSell(String(r.profit1Sell));setSecond(String(r.profit2Percent));setSecondSell(String(r.profit2Sell));setStop(String(r.stopPercent));
      if(Array.isArray(draft.callers)&&!localStorage.getItem('scope-caller-watchlist-v1'))localStorage.setItem('scope-caller-watchlist-v1',JSON.stringify(draft.callers));
      setMessage(r.marketCapBands?'Your saved account draft was restored. Automatic orders are still off.':'Your older draft needs market-cap ranges and SOL amounts. Automatic orders are still off.');
    }catch{/* Device draft stays available when the account API is unavailable. */}
  })();return()=>{cancelled=true}},[address,getAccessToken]);
  async function save(event){
    event.preventDefault();
    const n=[spend,first,firstSell,second,secondSell,stop].map(Number);
    const caps=[Number(lowerCap),Number(upperCap)],amounts=[n[0],Number(middleSpend),Number(largeSpend)];
    if(!caps.every(Number.isSafeInteger)||caps[0]<1||caps[1]<=caps[0]||amounts.some(x=>!Number.isFinite(x)||x<.001||!Number.isSafeInteger(Math.round(x*1e9)))||!Number.isInteger(n[1])||n[1]<1||n[1]>10000||!Number.isInteger(n[2])||n[2]<1||n[2]>100||!Number.isInteger(n[3])||n[3]<=n[1]||n[3]>10000||!Number.isInteger(n[4])||n[4]<1||n[4]>100||n[2]+n[4]>100||!Number.isInteger(n[5])||n[5]<1||n[5]>99){setMessage('Check ascending USD market-cap limits, SOL amounts, profit targets, and stop loss.');return}
    const marketCapBands=[{belowUsd:caps[0],spendSol:amounts[0]},{belowUsd:caps[1],spendSol:amounts[1]},{belowUsd:null,spendSol:amounts[2]}];
    const state={fundingMode:'scope',spend:amounts[0],marketCapBands,useProfit:true,profit1Percent:n[1],profit1Sell:n[2],profit2Percent:n[3],profit2Sell:n[4],useStop:true,stopPercent:n[5]};
    try{localStorage.setItem('scope-trading-setup-v2',JSON.stringify(state));setSaved(state)}catch{setMessage('Device storage unavailable; rules were not saved.');return}
    setMessage('Draft saved on this device. Saving to your account…');
    try{
      const token=await getAccessToken();if(!token||!address)throw Error('Sign in and create your Scope wallet to sync this draft.');
      const raw=JSON.parse(localStorage.getItem('scope-caller-watchlist-v1')||'[]');
      const callers=(Array.isArray(raw)?raw:[]).map(x=>typeof x==='string'?{wallet:x,username:''}:{wallet:x.wallet,username:x.username||''});
      const response=await fetch('/api/automation/draft',{method:'PUT',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({wallet:address,callers,rules:{marketCapBands,profit1Percent:n[1],profit1Sell:n[2],profit2Percent:n[3],profit2Sell:n[4],stopPercent:n[5]}})});
      const result=await response.json();if(!response.ok)throw Error(result.error||'Account draft unavailable');
      setMessage('Callers and rules saved to your account as a draft. Automatic orders remain off.');
    }catch(error){setMessage('Saved on this device only. '+(error.message||'Account sync unavailable')+' Automatic orders remain off.')}
  }
  async function authorize(){
    if(!address||!signerSetup?.ready||!signerSetup.policyId||!signerSetup.quorumId||granting)return;
    setGranting(true);setMessage('Review the wallet permission request in Privy.');
    try{await addSigners({address,signers:[{signerId:signerSetup.quorumId,policyIds:[signerSetup.policyId]}]});setMessage('Signer authorized under the restricted policy. Automatic orders remain off until the execution service is enabled.')}catch(error){setMessage(error?.message||'Signer authorization was not completed.')}finally{setGranting(false)}
  }
  return <section className="panel wide" id="autoRules"><span className="tag">03 / AUTOMATIC TRADE RULES</span><h2>Set your snipe rules</h2><p>Add callers on the <a href="/#callerDesk">Caller Field</a>, then choose SOL amounts by current USD market cap. The first call for a coin is the only one eligible; repeat calls and coins your account already bought are skipped. These settings remain a draft until unattended execution is enabled.</p><details><summary className="action">EDIT RULES</summary><form onSubmit={save} className="trade-grid"><label className="field"><span>LOW MARKET CAP / BELOW USD $</span><input type="number" min="1" step="1" value={lowerCap} onChange={e=>setLowerCap(e.target.value)} required/></label><label className="field"><span>BUY BELOW LOWER LIMIT / SOL</span><input type="number" min="0.001" step="0.001" value={spend} onChange={e=>setSpend(e.target.value)} required/></label><label className="field"><span>HIGH MARKET CAP / FROM USD $</span><input type="number" min="2" step="1" value={upperCap} onChange={e=>setUpperCap(e.target.value)} required/></label><label className="field"><span>BUY BETWEEN LIMITS / SOL</span><input type="number" min="0.001" step="0.001" value={middleSpend} onChange={e=>setMiddleSpend(e.target.value)} required/></label><label className="field"><span>BUY AT OR ABOVE HIGH LIMIT / SOL</span><input type="number" min="0.001" step="0.001" value={largeSpend} onChange={e=>setLargeSpend(e.target.value)} required/></label><label className="field"><span>FIRST PROFIT / % ABOVE ENTRY</span><input type="number" min="1" max="10000" value={first} onChange={e=>setFirst(e.target.value)} required/></label><label className="field"><span>SELL AT FIRST / % OF POSITION</span><input type="number" min="1" max="100" value={firstSell} onChange={e=>setFirstSell(e.target.value)} required/></label><label className="field"><span>SECOND PROFIT / % ABOVE ENTRY</span><input type="number" min="1" max="10000" value={second} onChange={e=>setSecond(e.target.value)} required/></label><label className="field"><span>SELL AT SECOND / % OF POSITION</span><input type="number" min="1" max="100" value={secondSell} onChange={e=>setSecondSell(e.target.value)} required/></label><label className="field"><span>STOP LOSS / % BELOW ENTRY</span><input type="number" min="1" max="99" value={stop} onChange={e=>setStop(e.target.value)} required/></label><button className="action primary" type="submit">SAVE RULES</button></form></details><div className="note"><strong>Automatic trade permission</strong><p>Your Scope wallet can authorize a server signer under a restricted Privy policy. Privy will ask you to review this separately. The signer policy permits direct transfers up to 0.01 SOL; the normal withdrawal form asks for separate approval.</p><button type="button" className="action" disabled={!signerSetup?.ready||granting||!address} onClick={authorize}>AUTHORIZE IN PRIVY</button><p>{signerSetup?.reason||(!signerSetup?.ready?'Checking signer and policy…':'Review the policy before you authorize.')}</p></div><p className="status" role="status">{message||'Automatic spending is locked. Your saved rules do not place orders yet.'}</p></section>;
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
  const {signAndSendTransaction}=useSignAndSendTransaction();
  const [balance,setBalance]=useState(null),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[destination,setDestination]=useState(''),[amount,setAmount]=useState(''),[review,setReview]=useState(null),[signature,setSignature]=useState('');
  const [balanceMessage,setBalanceMessage]=useState('');
  const [walletCheck,setWalletCheck]=useState('');
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
  useEffect(()=>{setBalance(null);setReview(null);setSignature('');setWalletCheck('');setBalanceMessage('');if(address)refresh();},[address]);
  function prepare(event){
    event.preventDefault();setReview(null);setSignature('');
    try{
      if(!wallet||!addressPattern.test(destination.trim()))throw Error('Enter a valid destination address.');
      const to=new PublicKey(destination.trim()).toBase58();
      if(to===address)throw Error('Enter an address other than this account.');
      const units=lamportsOf(amount.trim());
      if(units===null)throw Error('Enter a positive amount with at most nine decimals.');
      if(balance===null)throw Error('Refresh your balance before withdrawing.');
      if(units+10000n>BigInt(balance))throw Error('Leave at least 0.00001 SOL for network fees.');
      setReview({to,units,display:amount.trim()});setMessage('Check the amount and full destination before approving.');
    }catch(error){setMessage(error.message||'Review failed');}
  }
  async function send(){
    if(!review||!wallet||busy)return;
    setBusy(true);setMessage('Preparing transfer…');
    try{
      const response=await fetch('/api/account/blockhash',{cache:'no-store'});const data=await response.json();if(!response.ok||!data.blockhash)throw Error(data.error||'Could not fetch a recent blockhash.');
      const instruction=SystemProgram.transfer({fromPubkey:new PublicKey(address),toPubkey:new PublicKey(review.to),lamports:Number(review.units)});
      const message=new TransactionMessage({payerKey:new PublicKey(address),recentBlockhash:data.blockhash,instructions:[instruction]}).compileToV0Message();
      const transaction=new VersionedTransaction(message);
      setMessage('Approve this SOL transfer in your Privy wallet.');
      const sent=await signAndSendTransaction({transaction:transaction.serialize(),wallet,chain:'solana:mainnet',options:{uiOptions:{showWalletUIs:true}}});
      const encoded=bs58.encode(sent.signature);
      setSignature(encoded);setReview(null);setAmount('');setMessage('Submitted. Waiting for confirmation…');
      let settled=false;
      for(let attempt=0;attempt<12;attempt++){
        await new Promise(resolve=>setTimeout(resolve,2000));
        const check=await fetch('/api/manual-trade/status?signature='+encodeURIComponent(encoded),{cache:'no-store'});
        if(!check.ok)continue;
        const result=await check.json();
        if(result.state==='confirmed'||result.state==='finalized'){setMessage('Transfer confirmed on Solana.');settled=true;break;}
        if(result.state==='failed'){setMessage('Transfer failed on Solana. Check the signature.');settled=true;break;}
      }
      if(!settled)setMessage('Transfer submitted. Confirmation is pending; check the signature before trying again.');
      await refresh(true);
    }catch(error){setMessage(error?.message||'Transfer cancelled or failed. Check account activity before trying again.');}
    finally{setBusy(false);}
  }
  if(!ready||!walletsReady)return <div className="panel">Opening your account…</div>;
  if(!authenticated)return <div className="panel"><h2>Sign in to create an account.</h2><p>Your login controls a separate Privy Solana wallet. Sign in with an option enabled in your Privy app.</p><button className="action primary" onClick={login}>SIGN IN WITH PRIVY</button></div>;
  if(!wallet)return <div className="panel"><h2>Create your Solana wallet.</h2><p>One dedicated address for receiving SOL. Account creation does not delegate trading access to Scope.</p><button className="action primary" disabled={busy} onClick={async()=>{setBusy(true);try{await createWallet();setMessage('Wallet created.');}catch(error){setMessage(error?.message||'Could not create wallet.')}finally{setBusy(false)}}}>CREATE WALLET</button><button className="action" onClick={logout}>SIGN OUT</button><p role="status" className="status">{message}</p></div>;
  return <div className="grid"><section className="panel wide snipe-start"><span className="tag">01 / CALLOUT SNIPING</span><h2>Choose your callers.</h2><p>Add Pump.fun usernames or join links, then set exactly how much SOL to use by market cap. Your Scope wallet is dedicated to this flow. Automatic orders are still locked while execution is being completed.</p><a className="action primary" href="/#callerDesk">ADD CALLERS ↗</a><a className="action" href="#autoRules">SET SNIPE RULES ↓</a></section><AutoTradeSetup address={address}/><section className="panel"><span className="tag">02 / FUND SCOPE WALLET</span><h2>Your wallet</h2><div className="balance">{balance===null?'—':(Number(balance)/1e9).toLocaleString(undefined,{maximumFractionDigits:9})} <span style={{fontSize:19}}>SOL</span></div><p>Receive SOL at this exact Solana mainnet address. Verify it in the Privy wallet before sending a small test amount.</p><code className="address">{address}</code><button className="action" onClick={async()=>{try{await navigator.clipboard.writeText(address);setMessage('Address copied.')}catch{setMessage('Select and copy the address above.')}}}>COPY ADDRESS</button><button className="action" disabled={busy} onClick={()=>refresh()}>REFRESH BALANCE</button><p role="status" className="status">{balanceMessage}</p><button className="action" onClick={verifyWallet}>VERIFY ACCOUNT WALLET</button><p role="status" className="status">{walletCheck}</p><button className="action" onClick={logout}>SIGN OUT</button></section><section className="panel"><span className="tag">03 / WITHDRAW SOL</span><h2>Withdraw SOL</h2><p>Review the recipient and amount. Your Privy wallet asks you to approve this transfer.</p><form onSubmit={prepare}><label className="field"><span>DESTINATION / SOLANA ADDRESS</span><input autoComplete="off" spellCheck="false" value={destination} onChange={e=>{setDestination(e.target.value);setReview(null)}} placeholder="Paste recipient address" required /></label><label className="field"><span>AMOUNT / SOL</span><input inputMode="decimal" value={amount} onChange={e=>{setAmount(e.target.value);setReview(null)}} placeholder="0.01" required /></label><button className="action primary" disabled={busy} type="submit">REVIEW WITHDRAWAL</button></form>{review&&<div className="review"><strong>Send {review.display} SOL</strong><p>To this full address:</p><code>{review.to}</code><p>Network fees come from this wallet. Transfers cannot be reversed.</p><button className="action primary" disabled={busy} onClick={send}>APPROVE IN PRIVY</button><button className="action" disabled={busy} onClick={()=>setReview(null)}>CANCEL</button></div>}{signature&&<p>Transaction: <a href={'https://solscan.io/tx/'+signature} target="_blank" rel="noopener noreferrer">View on Solscan ↗</a></p>}<p role="status" className="status">{message}</p></section><TradingStatus/></div>;
}
createRoot(document.getElementById('accountRoot')).render(<PrivyProvider appId={APP_ID} config={{embeddedWallets:{solana:{createOnLogin:'users-without-wallets'}},appearance:{theme:'dark',accentColor:'#d8b279'},solana:{rpcs:{'solana:mainnet':'https://api.mainnet.solana.com'}}}}><Account/></PrivyProvider>);
