import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import worker from '../worker/index.js';

const crypto = webcrypto;
const keys = await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']);
const pem = '-----BEGIN PUBLIC KEY-----\n'+Buffer.from(await crypto.subtle.exportKey('spki',keys.publicKey)).toString('base64')+'\n-----END PUBLIC KEY-----';
const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
async function token(sub,overrides={}) {
  const now=Math.floor(Date.now()/1000),head=encode({alg:'ES256',typ:'JWT'});
  const body=encode({sub,iss:'privy.io',aud:'cmuejmq9g00eg0cla13182nah',iat:now,exp:now+3600,...overrides});
  const data=head+'.'+body;
  const sig=await crypto.subtle.sign({name:'ECDSA',hash:'SHA-256'},keys.privateKey,new TextEncoder().encode(data));
  return data+'.'+Buffer.from(sig).toString('base64url');
}
const rows=new Map();
const db={prepare(sql){return {bind(...values){return {
  async first(){return rows.get(values[0])||null},
  async run(){if(sql.startsWith('DELETE'))rows.delete(values[0]);else if(sql.startsWith('INSERT'))rows.set(values[0],{wallet:values[1],callers:values[2],rules:values[3],updatedAt:values[4]});return {meta:{changes:1}}}
}}}}};
const env={DB:db,PRIVY_ACCESS_TOKEN_VERIFICATION_KEY:pem};
const alice=await token('did:privy:alice_123456'),bob=await token('did:privy:bob_123456');
const body={wallet:'11111111111111111111111111111111',callers:[{wallet:'11111111111111111111111111111111',username:'sample'}],rules:{spend:.5,profit1Percent:50,profit1Sell:50,profit2Percent:100,profit2Sell:50,stopPercent:25}};
const url='https://local.test/api/automation/draft';
async function call(method,bearer,data,environment=env){const response=await worker.fetch(new Request(url,{method,headers:{...(bearer?{authorization:'Bearer '+bearer}:{}),...(data?{'content-type':'application/json'}:{})},body:data?JSON.stringify(data):undefined}),environment);return {status:response.status,body:await response.json()}}
assert.equal((await call('GET',null)).status,401);
assert.equal((await call('PUT',alice,body,{DB:db})).status,503);
assert.equal((await call('PUT',await token('did:privy:alice_123456',{aud:'wrong'}),body)).status,401);
assert.equal((await call('PUT',await token('did:privy:alice_123456',{exp:1}),body)).status,401);
assert.equal((await call('PUT',alice.slice(0,-3)+'abc',body)).status,401);
assert.equal((await call('PUT',alice,{...body,rules:{...body.rules,spend:5.1}})).status,400);
assert.equal((await call('PUT',alice,{...body,callers:[body.callers[0],body.callers[0]]})).status,400);
assert.equal((await call('PUT',alice,body)).status,200);
assert.equal((await call('GET',bob)).body.draft,null);
assert.deepEqual((await call('GET',alice)).body.draft.rules,body.rules);
assert.equal((await call('DELETE',bob)).status,200);
assert.notEqual((await call('GET',alice)).body.draft,null);
assert.equal((await call('DELETE',alice)).status,200);
assert.equal((await call('GET',alice)).body.draft,null);
const edKeys=await crypto.subtle.generateKey('Ed25519',true,['sign','verify']);
const edPem='-----BEGIN PUBLIC KEY-----\n'+Buffer.from(await crypto.subtle.exportKey('spki',edKeys.publicKey)).toString('base64')+'\n-----END PUBLIC KEY-----';
const edEnv={...env,PRIVY_ACCESS_TOKEN_VERIFICATION_KEY:edPem};
const now=Math.floor(Date.now()/1000);
const edData=encode({alg:'EdDSA',typ:'JWT'})+'.'+encode({sub:'did:privy:eduser_123456',iss:'privy.io',aud:'cmuejmq9g00eg0cla13182nah',iat:now,exp:now+3600});
const edSignature=Buffer.from(await crypto.subtle.sign('Ed25519',edKeys.privateKey,new TextEncoder().encode(edData))).toString('base64url');
assert.equal((await call('PUT',edData+'.'+edSignature,body,edEnv)).status,200);
assert.equal((await call('GET',alice,undefined,edEnv)).status,401);
console.log('Privy signature, expiration, account isolation, draft limits and deletion verified');
