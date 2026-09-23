import {mkdirSync,writeFileSync} from 'node:fs';
if(process.stdin.isTTY)process.stdin.setRawMode(true);
process.stdout.write('Ready for private test credentials on stdin.\n');
let input='';
for await(const part of process.stdin){input+=part;if(input.includes('\n'))break;}
const {token}=JSON.parse(input);
try{
 const r=await fetch('https://launch-sieve.lfrisky.chatgpt.site/api/forward-test',{method:'POST',headers:{'OAI-Sites-Authorization':'Bearer '+token,'content-type':'application/json'},body:'{}',signal:AbortSignal.timeout(60000)});
 if(!r.ok){console.log(JSON.stringify({status:r.status,error:'Live test request was not accepted',detail:(await r.text()).slice(0,180)}));process.exitCode=1;}
 else{const result=await r.json();mkdirSync(new URL('../research/',import.meta.url),{recursive:true});writeFileSync(new URL('../research/latest.json',import.meta.url),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({reason:result.reason,tokenCount:result.tokenCount,tradeCount:result.tradeCount,eventCount:result.events?.length,messages:result.messages,comparisons:result.comparisons}));}
}catch(e){console.log(JSON.stringify({error:'Live test could not complete',reason:e.name}));process.exitCode=1;}
