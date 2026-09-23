import React,{useEffect,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {PrivyProvider,usePrivy} from '@privy-io/react-auth';
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
function Account(){
  const {ready,authenticated,login,logout}=usePrivy();
  const {wallets,ready:walletsReady}=useWallets();
  const {createWallet}=useCreateWallet();
  const {signAndSendTransaction}=useSignAndSendTransaction();
  const [balance,setBalance]=useState(null),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[destination,setDestination]=useState(''),[amount,setAmount]=useState(''),[review,setReview]=useState(null),[signature,setSignature]=useState('');
  const wallet=authenticated&&walletsReady?wallets.find(w=>w.standardWallet?.name==='Privy'):null;
  const address=wallet?.address||'';
  async function refresh(quiet=false){
    if(!address)return;
    try{const response=await fetch('/api/account/balance?wallet='+encodeURIComponent(address),{cache:'no-store'});const data=await response.json();if(!response.ok)throw Error(data.error||'Balance unavailable');setBalance(data.lamports);if(!quiet)setMessage('Balance refreshed.');}
    catch(error){setMessage(error.message||'Balance unavailable');}
  }
  useEffect(()=>{setBalance(null);setReview(null);setSignature('');if(address)refresh();},[address]);
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
  return <div className="grid"><section className="panel"><span className="tag">01 / BALANCE & RECEIVE</span><h2>Your wallet</h2><div className="balance">{balance===null?'—':(Number(balance)/1e9).toLocaleString(undefined,{maximumFractionDigits:9})} <span style={{fontSize:19}}>SOL</span></div><p>Receive SOL at this exact Solana mainnet address. Verify it in the Privy wallet before sending a small test amount.</p><code className="address">{address}</code><button className="action" onClick={async()=>{try{await navigator.clipboard.writeText(address);setMessage('Address copied.')}catch{setMessage('Select and copy the address above.')}}}>COPY ADDRESS</button><button className="action" disabled={busy} onClick={()=>refresh()}>REFRESH BALANCE</button><button className="action" onClick={logout}>SIGN OUT</button></section><section className="panel"><span className="tag">02 / WITHDRAW</span><h2>Send SOL out</h2><p>Review the recipient and amount. Your Privy wallet asks you to approve this transfer.</p><form onSubmit={prepare}><label className="field"><span>DESTINATION / SOLANA ADDRESS</span><input autoComplete="off" spellCheck="false" value={destination} onChange={e=>{setDestination(e.target.value);setReview(null)}} placeholder="Paste recipient address" required /></label><label className="field"><span>AMOUNT / SOL</span><input inputMode="decimal" value={amount} onChange={e=>{setAmount(e.target.value);setReview(null)}} placeholder="0.01" required /></label><button className="action primary" disabled={busy} type="submit">REVIEW WITHDRAWAL</button></form>{review&&<div className="review"><strong>Send {review.display} SOL</strong><p>To this full address:</p><code>{review.to}</code><p>Network fees come from this wallet. Transfers cannot be reversed.</p><button className="action primary" disabled={busy} onClick={send}>APPROVE IN PRIVY</button><button className="action" disabled={busy} onClick={()=>setReview(null)}>CANCEL</button></div>}{signature&&<p>Transaction: <a href={'https://solscan.io/tx/'+signature} target="_blank" rel="noopener noreferrer">View on Solscan ↗</a></p>}<p role="status" className="status">{message}</p></section><section className="panel wide"><span className="tag">TRADING STATUS</span><div className="note"><strong>Automatic trading is inactive.</strong><p>This wallet can receive and send SOL with your approval. Scope does not have permission to spend it unattended. Before automatic sniping can run, Scope needs a verified Callout feed, a restricted delegated signer, server authentication, reconciliation, and a funded canary test. Keep deposits small while this private pilot is being checked.</p></div><a className="action" href="/portfolio">USE DIRECT PHANTOM INSTEAD ↗</a></section></div>;
}
createRoot(document.getElementById('accountRoot')).render(<PrivyProvider appId={APP_ID} config={{embeddedWallets:{solana:{createOnLogin:'users-without-wallets'}},appearance:{theme:'dark',accentColor:'#d8b279'},solana:{rpcs:{'solana:mainnet':'https://api.mainnet-beta.solana.com'}}}}><Account/></PrivyProvider>);
