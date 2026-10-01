import assert from 'node:assert/strict';
import {generateKeyPairSync} from 'node:crypto';
import {syncVerifiedWalletFunding} from './wallet-funding-policy.js';
import {verifiedSigningPolicy} from './privy-signer.js';
import {walletFundingAta,fundingRecipients,PILOT_WSOL_ATA} from './wallet-funding-destination.js';
const {privateKey,publicKey}=generateKeyPairSync('ec',{namedCurve:'prime256v1'});
const env={PRIVY_APP_SECRET:'test',SCOPE_PRIVY_POLICY_ID:'zv16gt4cophfjuy8rnx3kjq4',SCOPE_PRIVY_SIGNER_QUORUM_ID:'igsys5hz5fmsly8v2q242jgo',
  SCOPE_PRIVY_SIGNER_PRIVATE_KEY_PEM:privateKey.export({format:'der',type:'pkcs8'}).toString('base64')};
const wallet='6urG3gZDtCpomwKbzsaT1t8PqS6ucr2Xc3hmaSfJiLHz',walletId='a'.repeat(24),accountId='did:privy:account123';
assert.equal(walletFundingAta(wallet),'8W13wpjQfJdfRFjFbRbZvDVP76bgRjXepj2bHYfh1oKK');
const programs=['6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P','ComputeBudget111111111111111111111111111111','ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL',
  'pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA','TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA','TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb'];
const initial={id:env.SCOPE_PRIVY_POLICY_ID,chain_type:'solana',owner_id:env.SCOPE_PRIVY_SIGNER_QUORUM_ID,rules:[
  {id:'b'.repeat(24),name:'Trade programs',method:'signTransaction',action:'ALLOW',conditions:[{field_source:'solana_program_instruction',field:'programId',operator:'in',value:programs}]},
  {id:'c'.repeat(24),name:'Wrapped SOL funding',method:'signTransaction',action:'ALLOW',conditions:[{field_source:'solana_system_program_instruction',field:'Transfer.to',operator:'eq',value:PILOT_WSOL_ATA}]}]};
let policy=structuredClone(initial),updates=0,owned=true,delegated=true,matchingKey=true,verifyUpdate=true;
const record=()=>({id:walletId,address:wallet,chain_type:'solana',archived_at:null,additional_signers:delegated?[{signer_id:env.SCOPE_PRIVY_SIGNER_QUORUM_ID,override_policy_ids:[env.SCOPE_PRIVY_POLICY_ID]}]:[]});
const client={wallets:()=>({get:async()=>record()}),policies:()=>({updateRule:async(id,input)=>{
  updates++;assert.equal(id,initial.rules[1].id);assert.equal(input.policy_id,env.SCOPE_PRIVY_POLICY_ID);
  assert.equal(input.action,'ALLOW');assert.equal(input.method,'signTransaction');assert.equal(input.conditions.length,1);
  assert.equal(input.conditions[0].field,'Transfer.to');assert.equal(input.conditions[0].operator,'in');
  assert.deepEqual(input.conditions[0].value,[PILOT_WSOL_ATA,walletFundingAta(wallet)]);
  assert.equal(input.authorization_context.authorization_private_keys[0],env.SCOPE_PRIVY_SIGNER_PRIVATE_KEY_PEM);
  if(verifyUpdate)policy={...policy,rules:[policy.rules[0],{...policy.rules[1],conditions:input.conditions}]};
}})};
const fetcher=async url=>Response.json(url.includes('/policies/')?policy:url.includes('/key_quorums/')?{
  id:env.SCOPE_PRIVY_SIGNER_QUORUM_ID,authorization_threshold:1,authorization_keys:[{public_key:matchingKey?publicKey.export({format:'der',type:'spki'}).toString('base64'):'wrong'}]}:{
  id:accountId,linked_accounts:owned?[{type:'wallet',chain_type:'solana',wallet_client_type:'privy',id:walletId,address:wallet}]:[]});
const args={env,accountId,walletId,wallet,client,fetcher};
assert.equal((await syncVerifiedWalletFunding(args)).changed,true);assert.equal(updates,1);
assert.equal(verifiedSigningPolicy(policy,env.SCOPE_PRIVY_POLICY_ID),true);
assert.deepEqual(policy.rules[0],initial.rules[0],'Program restrictions remain identical');
assert.equal((await syncVerifiedWalletFunding(args)).changed,false);assert.equal(updates,1,'Existing destination is reused');
policy=structuredClone(initial);owned=false;await assert.rejects(syncVerifiedWalletFunding(args),/ownership/);owned=true;
delegated=false;await assert.rejects(syncVerifiedWalletFunding(args),/delegation/);delegated=true;
matchingKey=false;await assert.rejects(syncVerifiedWalletFunding(args),/authority/);matchingKey=true;
assert.equal(updates,1,'Owner, consent and quorum failures cannot change policy');
verifyUpdate=false;await assert.rejects(syncVerifiedWalletFunding(args),/unverified/);assert.equal(updates,2);
assert.equal(fundingRecipients({...initial.rules[1].conditions[0],operator:'in',value:[PILOT_WSOL_ATA,PILOT_WSOL_ATA]}),null);
assert.equal(fundingRecipients({...initial.rules[1].conditions[0],value:walletFundingAta(wallet)}),null,'Policy lineage must retain the original approved recipient');
assert.equal(verifiedSigningPolicy({...initial,rules:[{...initial.rules[0],conditions:[{...initial.rules[0].conditions[0],value:[...programs,'11111111111111111111111111111111']}]},initial.rules[1]]},env.SCOPE_PRIVY_POLICY_ID),false,'A broad System Program allow rule remains rejected');
console.log('PASS: wallet-specific SOL funding, existing permission reuse, exact-rule update, fresh owner/consent/quorum, unverified mutation rejection and strict program controls');
