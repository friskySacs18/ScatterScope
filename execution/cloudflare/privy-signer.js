import {PrivyClient} from '@privy-io/node';

const APP_ID='cmuejmq9g00eg0cla13182nah';
const ID=/^[a-z0-9]{24}$/;

export function signerConfiguration(env={}){
  const required=['PRIVY_APP_SECRET','SCOPE_PRIVY_SIGNER_PRIVATE_KEY_PEM','SCOPE_PRIVY_SIGNER_QUORUM_ID','SCOPE_PRIVY_POLICY_ID'];
  const missing=required.filter(key=>typeof env[key]!=='string'||!env[key].trim());
  const invalid=[];
  for(const key of ['SCOPE_PRIVY_SIGNER_QUORUM_ID','SCOPE_PRIVY_POLICY_ID'])if(env[key]&&!ID.test(env[key]))invalid.push(key);
  if(env.SCOPE_PRIVY_SIGNER_PRIVATE_KEY_PEM&&!/-----BEGIN (?:EC )?PRIVATE KEY-----/.test(env.SCOPE_PRIVY_SIGNER_PRIVATE_KEY_PEM))invalid.push('SCOPE_PRIVY_SIGNER_PRIVATE_KEY_PEM');
  return {configured:missing.length===0&&invalid.length===0,missing,invalid};
}

// This adapter signs only; broadcast belongs to the durable pipeline so a
// network timeout cannot erase the signature needed for reconciliation.
export function createPrivySigner(env,{client,fetcher=fetch,now=Date.now}={}){
  if(!signerConfiguration(env).configured)throw Error('Privy signer configuration incomplete');
  const api=client||new PrivyClient({appId:APP_ID,appSecret:env.PRIVY_APP_SECRET,maxRetries:0,timeout:8000});
  return async function sign({order,transaction}){
    if(!ID.test(order.walletId||'')||!/^did:privy:[a-zA-Z0-9_-]{8,120}$/.test(order.accountId||'')||!order.id)throw Error('Verified wallet identity required');
    const headers={authorization:'Basic '+btoa(APP_ID+':'+env.PRIVY_APP_SECRET),'privy-app-id':APP_ID};
    const response=await fetcher('https://api.privy.io/v1/users/'+encodeURIComponent(order.accountId),{headers,signal:AbortSignal.timeout(6000)});
    if(!response.ok)throw Error('Wallet owner verification unavailable');
    const user=await response.json();
    if(user.id!==order.accountId||!user.linked_accounts?.some(x=>x.type==='wallet'&&x.chain_type==='solana'&&x.wallet_client_type==='privy'&&x.id===order.walletId&&x.address===order.wallet))throw Error('Wallet owner mismatch');
    const wallet=await api.wallets().get(order.walletId);
    const delegated=wallet.additional_signers?.find(x=>x.signer_id===env.SCOPE_PRIVY_SIGNER_QUORUM_ID);
    if(wallet.id!==order.walletId||wallet.address!==order.wallet||wallet.chain_type!=='solana'||wallet.archived_at!=null||
      delegated?.override_policy_ids?.length!==1||delegated.override_policy_ids[0]!==env.SCOPE_PRIVY_POLICY_ID)throw Error('Wallet delegation missing or revoked');
    const result=await api.wallets().solana().signTransaction(order.walletId,{
      transaction,idempotency_key:order.id,request_expiry:now()+15000,
      authorization_context:{authorization_private_keys:[env.SCOPE_PRIVY_SIGNER_PRIVATE_KEY_PEM]}
    });
    if(result.encoding!=='base64'||typeof result.signed_transaction!=='string')throw Error('Invalid signer response');
    return result.signed_transaction;
  };
}
