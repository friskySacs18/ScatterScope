const SOLANA_ADDRESS=/^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const PRIVY_SUBJECT=/^did:privy:[a-zA-Z0-9_-]{8,120}$/;
const APP_ID='cmuejmq9g00eg0cla13182nah';

// A wallet address supplied by the browser is never proof of ownership. Both
// Privy's wallet record and the authenticated user's linked account must agree.
export async function verifyScopeWallet({subject,address,appSecret,fetcher=fetch}){
  if(!PRIVY_SUBJECT.test(subject||'')||!SOLANA_ADDRESS.test(address||'')||!appSecret){
    throw new TypeError('Wallet verification requires a signed-in user and Solana address');
  }
  const headers={'authorization':'Basic '+btoa(APP_ID+':'+appSecret),'privy-app-id':APP_ID};
  const options={signal:AbortSignal.timeout(6000)};
  const [userResponse,walletResponse]=await Promise.all([
    fetcher('https://api.privy.io/v1/users/'+encodeURIComponent(subject),{...options,headers}),
    fetcher('https://api.privy.io/v1/wallets/address',{...options,method:'POST',headers:{...headers,'content-type':'application/json'},body:JSON.stringify({address})})
  ]);
  if(!userResponse.ok||!walletResponse.ok)throw Error('Privy wallet lookup unavailable');
  const [user,wallet]=await Promise.all([userResponse.json(),walletResponse.json()]);
  const linked=Array.isArray(user?.linked_accounts)&&user.linked_accounts.some(item=>item?.type==='wallet'&&item.address===address);
  if(user?.id!==subject||!linked||wallet?.address!==address||wallet?.chain_type!=='solana'||wallet?.entity?.type!=='user'||wallet.archived_at!=null||!/^[a-z0-9]{24}$/.test(wallet.id||'')){
    return {verified:false};
  }
  return {verified:true,walletId:wallet.id};
}
