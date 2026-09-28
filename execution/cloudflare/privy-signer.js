import {PrivyClient} from '@privy-io/node';
import {createPrivateKey,createPublicKey} from 'node:crypto';

const APP_ID='cmuejmq9g00eg0cla13182nah';
const ID=/^[a-z0-9]{24}$/;
const PUMP_PROGRAMS=['6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P','ComputeBudget111111111111111111111111111111','ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL'];
const QUORUM_ID='igsys5hz5fmsly8v2q242jgo';
const POLICY_ID='qhtl0rqr7553234g6zb7dna2';

function authorizationKey(value){
  if(typeof value!=='string'||value!==value.trim())throw Error('Invalid authorization key');
  const pem=value.startsWith('-----BEGIN PRIVATE KEY-----');
  if(!pem&&!/^[A-Za-z0-9+/]{100,400}={0,2}$/.test(value))throw Error('Invalid authorization key');
  const key=createPrivateKey(pem?value:{key:Buffer.from(value,'base64'),format:'der',type:'pkcs8'});
  if(key.asymmetricKeyType!=='ec'||key.asymmetricKeyDetails?.namedCurve!=='prime256v1')throw Error('Authorization key must be P-256');
  return {privateKey:key.export({format:'der',type:'pkcs8'}).toString('base64'),
    publicKey:createPublicKey(key).export({format:'der',type:'spki'}).toString('base64')};
}

function authorizationKeyIssue(value){
  if(typeof value!=='string'||!value.trim())return null;
  if(value!==value.trim())return 'surrounding_whitespace';
  if(value.includes('*'))return 'masked_value';
  if(value.startsWith('-----BEGIN ')&&!value.startsWith('-----BEGIN PRIVATE KEY-----'))return 'wrong_pem_type';
  if(!value.startsWith('-----BEGIN PRIVATE KEY-----')&&!/^[A-Za-z0-9+/]{100,400}={0,2}$/.test(value))return 'not_pkcs8_base64';
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
  if(env.SCOPE_PRIVY_POLICY_ID&&env.SCOPE_PRIVY_POLICY_ID!==POLICY_ID)invalid.push('SCOPE_PRIVY_POLICY_ID');
  return {configured:missing.length===0&&invalid.length===0,missing,invalid,keyIssue};
}

// A policy for signAndSendTransaction does not authorize the signTransaction
// method used by this journal. Require the exact production signing method
// and an exact allowlist before the wallet receives any signature request.
export function verifiedSigningPolicy(policy,expectedPolicyId=POLICY_ID,expectedQuorumId=QUORUM_ID){
  if(policy?.id!==expectedPolicyId||policy.chain_type!=='solana'||(policy.owner_id!=null&&policy.owner_id!==expectedQuorumId)||
    !Array.isArray(policy.rules)||policy.rules.length!==2)return false;
  const [program,transfer]=policy.rules;
  if(program?.action!=='ALLOW'||program.method!=='signTransaction'||program.conditions?.length!==1||
    transfer?.action!=='ALLOW'||transfer.method!=='signTransaction'||transfer.conditions?.length!==1)return false;
  const allowed=program.conditions[0],limit=transfer.conditions[0];
  return allowed.field_source==='solana_program_instruction'&&allowed.field==='programId'&&allowed.operator==='in'&&
    Array.isArray(allowed.value)&&allowed.value.length===PUMP_PROGRAMS.length&&PUMP_PROGRAMS.every(id=>allowed.value.includes(id))&&
    limit.field_source==='solana_system_program_instruction'&&limit.field==='Transfer.lamports'&&limit.operator==='lte'&&
    /^(0|[1-9]\d{0,7})$/.test(String(limit.value))&&BigInt(limit.value)<=10000000n;
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
    const response=await fetcher('https://api.privy.io/v1/users/'+encodeURIComponent(order.accountId),{headers,signal:AbortSignal.timeout(6000)});
    if(!response.ok)throw Error('Wallet owner verification unavailable');
    const user=await response.json();
    if(user.id!==order.accountId||!user.linked_accounts?.some(x=>x.type==='wallet'&&x.chain_type==='solana'&&x.wallet_client_type==='privy'&&x.id===order.walletId&&x.address===order.wallet))throw Error('Wallet owner mismatch');
    const wallet=await api.wallets().get(order.walletId);
    const delegated=wallet.additional_signers?.find(x=>x.signer_id===env.SCOPE_PRIVY_SIGNER_QUORUM_ID);
    if(wallet.id!==order.walletId||wallet.address!==order.wallet||wallet.chain_type!=='solana'||wallet.archived_at!=null||
      delegated?.override_policy_ids?.length!==1||delegated.override_policy_ids[0]!==env.SCOPE_PRIVY_POLICY_ID)throw Error('Wallet delegation missing or revoked');
    const quorumResponse=await fetcher('https://api.privy.io/v1/key_quorums/'+encodeURIComponent(env.SCOPE_PRIVY_SIGNER_QUORUM_ID),{headers,signal:AbortSignal.timeout(6000)});
    if(!quorumResponse.ok)throw Error('Privy signer quorum unavailable');
    const quorum=await quorumResponse.json();
    if(quorum.id!==env.SCOPE_PRIVY_SIGNER_QUORUM_ID||quorum.authorization_threshold!==1||
      quorum.authorization_keys?.length!==1||quorum.authorization_keys[0]?.public_key?.replace(/\s/g,'')!==key.publicKey)
      throw Error('Signer private key does not match the registered quorum');
    const policyResponse=await fetcher('https://api.privy.io/v1/policies/'+encodeURIComponent(env.SCOPE_PRIVY_POLICY_ID),{headers,signal:AbortSignal.timeout(6000)});
    if(!policyResponse.ok||!verifiedSigningPolicy(await policyResponse.json(),env.SCOPE_PRIVY_POLICY_ID,env.SCOPE_PRIVY_SIGNER_QUORUM_ID))
      throw Error('Privy signing policy incompatible or unavailable');
    const result=await api.wallets().solana().signTransaction(order.walletId,{
      transaction,idempotency_key:order.id,request_expiry:now()+15000,
      authorization_context:{authorization_private_keys:[key.privateKey]}
    });
    if(result.encoding!=='base64'||typeof result.signed_transaction!=='string')throw Error('Invalid signer response');
    return result.signed_transaction;
  };
}
