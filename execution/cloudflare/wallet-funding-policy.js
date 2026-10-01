import {PrivyClient} from '@privy-io/node';
import {authorizationKey,verifiedSigningPolicy} from './privy-signer.js';
import {fundingRecipients,walletFundingAta} from './wallet-funding-destination.js';
const APP_ID='cmuejmq9g00eg0cla13182nah';

// Only the private policy journal invokes this. Fresh owner, delegation and
// quorum checks precede a change to the one SOL-wrapping destination rule.
// Other rules and methods remain untouched; this never signs a trade.
export async function syncVerifiedWalletFunding({env,accountId,walletId,wallet,fetcher=fetch,client,now=Date.now}){
  const key=authorizationKey(env.SCOPE_PRIVY_SIGNER_PRIVATE_KEY_PEM);
  const api=client||new PrivyClient({appId:APP_ID,appSecret:env.PRIVY_APP_SECRET,maxRetries:0,timeout:8000});
  const headers={authorization:'Basic '+btoa(APP_ID+':'+env.PRIVY_APP_SECRET),'privy-app-id':APP_ID};
  const read=async path=>{const r=await fetcher('https://api.privy.io/v1/'+path,{headers,signal:AbortSignal.timeout(6000)});if(!r.ok)throw Error('Policy verification unavailable');return r.json()};
  const [user,record,quorum,policy]=await Promise.all([read('users/'+encodeURIComponent(accountId)),api.wallets().get(walletId),
    read('key_quorums/'+encodeURIComponent(env.SCOPE_PRIVY_SIGNER_QUORUM_ID)),read('policies/'+encodeURIComponent(env.SCOPE_PRIVY_POLICY_ID))]);
  if(user.id!==accountId||!user.linked_accounts?.some(a=>a.type==='wallet'&&a.chain_type==='solana'&&a.wallet_client_type==='privy'&&a.id===walletId&&a.address===wallet))throw Error('Wallet ownership rejected');
  const matches=record.additional_signers?.filter(s=>s.signer_id===env.SCOPE_PRIVY_SIGNER_QUORUM_ID)||[];
  if(record.id!==walletId||record.address!==wallet||record.chain_type!=='solana'||record.archived_at!=null||
    matches.length!==1||matches[0].override_policy_ids?.length!==1||matches[0].override_policy_ids[0]!==env.SCOPE_PRIVY_POLICY_ID)throw Error('Wallet delegation rejected');
  if(quorum.id!==env.SCOPE_PRIVY_SIGNER_QUORUM_ID||quorum.authorization_threshold!==1||quorum.authorization_keys?.length!==1||
    quorum.authorization_keys[0].public_key?.replace(/\s/g,'')!==key.publicKey||
    !verifiedSigningPolicy(policy,env.SCOPE_PRIVY_POLICY_ID,env.SCOPE_PRIVY_SIGNER_QUORUM_ID))throw Error('Signing authority rejected');
  const rule=policy.rules[1],recipients=fundingRecipients(rule.conditions[0]),recipient=walletFundingAta(wallet);
  if(!recipients)throw Error('Wallet funding policy unavailable');
  if(recipients.includes(recipient))return {verified:true,changed:false,recipient};
  if(recipients.length>=100)throw Error('Wallet funding policy capacity reached');
  if(!/^[a-z0-9]{24}$/.test(rule.id||'')||typeof rule.name!=='string')throw Error('Wallet funding rule identity unavailable');
  const condition={...rule.conditions[0],operator:'in',value:[...recipients,recipient]};
  await api.policies().updateRule(rule.id,{policy_id:env.SCOPE_PRIVY_POLICY_ID,name:rule.name,action:rule.action,method:rule.method,
    conditions:[condition],authorization_context:{authorization_private_keys:[key.privateKey]},request_expiry:now()+18000});
  const fresh=await read('policies/'+encodeURIComponent(env.SCOPE_PRIVY_POLICY_ID));
  if(!verifiedSigningPolicy(fresh,env.SCOPE_PRIVY_POLICY_ID,env.SCOPE_PRIVY_SIGNER_QUORUM_ID)||
    !fundingRecipients(fresh.rules[1].conditions[0])?.includes(recipient))throw Error('Wallet funding policy update unverified');
  return {verified:true,changed:true,recipient};
}
