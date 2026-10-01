import {PrivyClient,APIConnectionTimeoutError,APIConnectionError} from '@privy-io/node';
import {createPrivateKey,createPublicKey} from 'node:crypto';

const APP_ID='cmuejmq9g00eg0cla13182nah';
const ID=/^[a-z0-9]{24}$/;
const PUMP_PROGRAMS=['6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P','ComputeBudget111111111111111111111111111111','ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL'];
const TRADE_PROGRAMS=[...PUMP_PROGRAMS,'pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA','TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA','TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb'];
const PILOT_WSOL_ATA='4dWv5mpSYfiw4iMjzgF51fF2eGchByQMTPpWibgZzYMz';
const QUORUM_ID='igsys5hz5fmsly8v2q242jgo';
const POLICY_ID='qhtl0rqr7553234g6zb7dna2';

// SDK subclasses inherit name='Error'; name matching mislabels timeouts as
// policy rejections. Record only a controlled reason and numeric HTTP status.
export function signerRequestFailure(error,{secrets=[]}={}){
  const status=Number.isInteger(error?.status)&&error.status>=400&&error.status<=599?error.status:null;
  const message=typeof error?.error?.message==='string'?error.error.message:typeof error?.message==='string'?error.message:'';
  const code=error instanceof APIConnectionTimeoutError||error?.name==='TimeoutError'?'signer_timeout':
    error instanceof APIConnectionError?'signer_connection_failed':
    status===429?'signer_rate_limited':status>=500?'signer_service_unavailable':
    status===401?'signer_authentication_failed':
    status===403&&/policy/i.test(message)?'signer_policy_denied':
    status===403?'signer_authorization_rejected':
    status&&/request.{0,40}expir|expired.{0,40}request/i.test(message)?'signer_request_expired':
    status===400||status===422?'signer_transaction_rejected':
    status===409?'signer_request_conflict':status?'signer_request_rejected':'signer_local_error';
  let detail=message;
  for(const secret of secrets)if(typeof secret==='string'&&secret.length>3)detail=detail.split(secret).join('[redacted]');
  detail=detail.replace(/-----BEGIN[\s\S]*?-----END[^-]*-----/g,'[redacted]')
    .replace(/https?:\/\/\S+/g,'[provider URL]')
    .replace(/\b(?:Bearer|Basic)\s+\S+/gi,'[redacted]')
    .replace(/\b[A-Za-z0-9_+/=-]{60,}\b/g,'[redacted]')
    .replace(/[\r\n\t]/g,' ').slice(0,360);
  return Object.assign(Error('Signing request failed'),{code,httpStatus:status,providerMessage:detail||null});
}

function authorizationKey(value){
  if(typeof value!=='string'||value!==value.trim())throw Error('Invalid authorization key');
  const material=value.startsWith('wallet-auth:')?value.slice('wallet-auth:'.length):value;
  const pem=material.startsWith('-----BEGIN PRIVATE KEY-----');
  if(!pem&&!/^[A-Za-z0-9+/]{100,400}={0,2}$/.test(material))throw Error('Invalid authorization key');
  const key=createPrivateKey(pem?material:{key:Buffer.from(material,'base64'),format:'der',type:'pkcs8'});
  if(key.asymmetricKeyType!=='ec'||key.asymmetricKeyDetails?.namedCurve!=='prime256v1')throw Error('Authorization key must be P-256');
  return {privateKey:key.export({format:'der',type:'pkcs8'}).toString('base64'),
    publicKey:createPublicKey(key).export({format:'der',type:'spki'}).toString('base64')};
}

function authorizationKeyIssue(value){
  if(typeof value!=='string'||!value.trim())return null;
  if(value!==value.trim())return 'surrounding_whitespace';
  if(value.includes('*'))return 'masked_value';
  const material=value.startsWith('wallet-auth:')?value.slice('wallet-auth:'.length):value;
  if(material.startsWith('-----BEGIN ')&&!material.startsWith('-----BEGIN PRIVATE KEY-----'))return 'wrong_pem_type';
  if(!material.startsWith('-----BEGIN PRIVATE KEY-----')&&!/^[A-Za-z0-9+/]{100,400}={0,2}$/.test(material))return 'not_pkcs8_base64';
  try{authorizationKey(value);return null}catch{return 'not_p256_pkcs8_private_key'}
}

export function signerConfiguration(env={}){
  const required=['PRIVY_APP_SECRET','SCOPE_PRIVY_SIGNER_PRIVATE_KEY_PEM','SCOPE_PRIVY_SIGNER_QUORUM_ID','SCOPE_PRIVY_POLICY_ID'];
  const missing=required.filter(key=>typeof env[key]!=='string'||!env[key].trim());
  const invalid=[];
  for(const key of ['SCOPE_PRIVY_SIGNER_QUORUM_ID','SCOPE_PRIVY_POLICY_ID'])if(env[key]&&!ID.test(env[key]))invalid.push(key);
  const keyIssue=authorizationKeyIssue(env.SCOPE_PRIVY_SIGNER_PRIVATE_KEY_PEM);
  if(keyIssue)invalid.push('SCOPE_PRIVY_SIGNER_PRIVATE_KEY_PEM');
  if(env.SCOPE_PRIVY_SIGNER_QUORUM_ID&&env.SCOPE_PRIVY_SIGNER_QUORUM_ID!==QUORUM_ID)invalid.push('SCOPE_PRIVY_SIGNER_QUORUM_ID');
  const configured=missing.length===0&&invalid.length===0;
  return {configured,missing,invalid,keyIssue,
    publicKey:configured?authorizationKey(env.SCOPE_PRIVY_SIGNER_PRIVATE_KEY_PEM).publicKey:null};
}

// A policy for signAndSendTransaction does not authorize the signTransaction
// method used by this journal. Require the exact production signing method
// and an exact allowlist before the wallet receives any signature request.
export function verifiedSigningPolicy(policy,expectedPolicyId=POLICY_ID,expectedQuorumId=QUORUM_ID){
  if(policy?.id!==expectedPolicyId||policy.chain_type!=='solana'||(policy.owner_id!=null&&policy.owner_id!==expectedQuorumId)||
    !Array.isArray(policy.rules)||policy.rules.length!==2)return false;
  const [program,transfer]=policy.rules;
  if(!policy.rules.every(rule=>rule.action==='ALLOW'&&rule.method==='signTransaction'&&rule.conditions?.length===1))return false;
  const allowed=program.conditions[0],limit=transfer.conditions[0];
  const programs=allowed.value;
  if(allowed.field_source!=='solana_program_instruction'||allowed.field!=='programId'||allowed.operator!=='in'||!Array.isArray(programs))return false;
  const legacy=programs.length===PUMP_PROGRAMS.length&&PUMP_PROGRAMS.every(id=>programs.includes(id))&&
    limit.field_source==='solana_system_program_instruction'&&limit.field==='Transfer.lamports'&&limit.operator==='lte'&&
    /^(0|[1-9]\d{0,7})$/.test(String(limit.value))&&BigInt(limit.value)<=10000000n;
  const pumpSwap=programs.length===TRADE_PROGRAMS.length&&TRADE_PROGRAMS.every(id=>programs.includes(id))&&
    limit.field_source==='solana_system_program_instruction'&&limit.field==='Transfer.to'&&limit.operator==='eq'&&
    limit.value===PILOT_WSOL_ATA;
  return legacy||pumpSwap;
}

// This adapter signs only; broadcast belongs to the durable pipeline so a
// network timeout cannot erase the signature needed for reconciliation.
export function createPrivySigner(env,{client,fetcher=fetch,now=Date.now}={}){
  if(!signerConfiguration(env).configured)throw Error('Privy signer configuration incomplete');
  const key=authorizationKey(env.SCOPE_PRIVY_SIGNER_PRIVATE_KEY_PEM);
  const api=client||new PrivyClient({appId:APP_ID,appSecret:env.PRIVY_APP_SECRET,maxRetries:0,timeout:8000});
  return async function sign({order,transaction}){
    if(!ID.test(order.walletId||'')||!/^did:privy:[a-zA-Z0-9_-]{8,120}$/.test(order.accountId||'')||!order.id)throw Error('Verified wallet identity required');
    const headers={authorization:'Basic '+btoa(APP_ID+':'+env.PRIVY_APP_SECRET),'privy-app-id':APP_ID};
    const fail=(message,code)=>Object.assign(Error(message),{code});
    const read=async(path)=>{
      try{const response=await fetcher('https://api.privy.io/v1/'+path,{headers,signal:AbortSignal.timeout(6000)});
        if(!response.ok)throw Error('Provider unavailable');return await response.json();
      }catch(error){throw fail('Privy signer verification unavailable',error?.name==='TimeoutError'?'signer_timeout':'signer_unavailable')}
    };
    // These reads are independent. All four still have to pass before the
    // idempotent sign-only operation; serial reads consume block life.
    const [user,wallet,quorum,policy]=await Promise.all([
      read('users/'+encodeURIComponent(order.accountId)),
      Promise.resolve().then(()=>api.wallets().get(order.walletId)).catch(()=>{throw fail('Privy wallet verification unavailable','signer_unavailable')}),
      read('key_quorums/'+encodeURIComponent(env.SCOPE_PRIVY_SIGNER_QUORUM_ID)),
      read('policies/'+encodeURIComponent(env.SCOPE_PRIVY_POLICY_ID))
    ]);
    if(user.id!==order.accountId||!user.linked_accounts?.some(x=>x.type==='wallet'&&x.chain_type==='solana'&&x.wallet_client_type==='privy'&&x.id===order.walletId&&x.address===order.wallet))throw fail('Wallet owner mismatch','wallet_owner_mismatch');
    const delegated=wallet.additional_signers?.find(x=>x.signer_id===env.SCOPE_PRIVY_SIGNER_QUORUM_ID);
    if(wallet.id!==order.walletId||wallet.address!==order.wallet||wallet.chain_type!=='solana'||wallet.archived_at!=null||
      delegated?.override_policy_ids?.length!==1||delegated.override_policy_ids[0]!==env.SCOPE_PRIVY_POLICY_ID)throw fail('Wallet delegation missing or revoked','wallet_delegation_revoked');
    if(quorum.id!==env.SCOPE_PRIVY_SIGNER_QUORUM_ID||quorum.authorization_threshold!==1||
      quorum.authorization_keys?.length!==1||quorum.authorization_keys[0]?.public_key?.replace(/\s/g,'')!==key.publicKey)
      throw fail('Signer private key does not match the registered quorum','signer_quorum_mismatch');
    if(!verifiedSigningPolicy(policy,env.SCOPE_PRIVY_POLICY_ID,env.SCOPE_PRIVY_SIGNER_QUORUM_ID))
      throw fail('Privy signing policy incompatible or unavailable','signing_policy_unavailable');
    let result;
    const input={transaction,idempotency_key:order.id,request_expiry:now()+18000,
      authorization_context:{authorization_private_keys:[key.privateKey]}
    };
    for(let attempt=0;attempt<2;attempt++){
      try{result=await api.wallets().solana().signTransaction(order.walletId,input);break}
      catch(error){
        const failure=signerRequestFailure(error,{secrets:[env.PRIVY_APP_SECRET,env.SCOPE_PRIVY_SIGNER_PRIVATE_KEY_PEM,key.privateKey]});
        const retryable=['signer_timeout','signer_connection_failed','signer_service_unavailable'].includes(failure.code);
        if(attempt!==0||!retryable)throw failure;
        // Same unsigned bytes and idempotency key. This never broadcasts or
        // creates a second payment; the durable pipeline still sends once.
      }
    }
    if(result.encoding!=='base64'||typeof result.signed_transaction!=='string')throw fail('Invalid signer response','invalid_signer_response');
    return result.signed_transaction;
  };
}
