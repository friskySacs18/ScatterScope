import assert from 'node:assert/strict';
import {verifyScopeWallet} from '../worker/privy-wallet.js';

const subject='did:privy:cm3np4u9j001rc8b73seqmqqk',address='11111111111111111111111111111111';
const user={id:subject,linked_accounts:[{type:'wallet',address}]};
const wallet={id:'id2tptkqrxd39qo9j423etij',address,chain_type:'solana',entity:{type:'user',id:'internal-user-id'},archived_at:null};
const fake=(u,w)=>async(url,options)=>{
  if(url.endsWith('/wallets/address'))assert.deepEqual(JSON.parse(options.body),{address});
  return new Response(JSON.stringify(url.endsWith('/wallets/address')?w:u),{status:200});
};
const args={subject,address,appSecret:'test-secret'};
assert.deepEqual(await verifyScopeWallet({...args,fetcher:fake(user,wallet)}),{verified:true,walletId:wallet.id});
for(const [u,w] of [
  [{...user,id:'did:privy:another_user'},wallet],
  [{...user,linked_accounts:[]},wallet],
  [user,{...wallet,address:'22222222222222222222222222222222'}],
  [user,{...wallet,entity:{type:'organization',id:'internal-user-id'}}],
  [user,{...wallet,archived_at:1}],
])assert.equal((await verifyScopeWallet({...args,fetcher:fake(u,w)})).verified,false);
await assert.rejects(verifyScopeWallet({...args,fetcher:async()=>new Response('unavailable',{status:503})}),/unavailable/);
console.log('Privy wallet ownership and failed lookup checks verified');
