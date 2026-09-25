import {inspectAutomatedBuy} from './automation-guard.js';
import {normalizedBands} from './copy-rules.js';
import {verifyScopeWallet} from './privy-wallet.js';
import {registerPendingAccount} from './account-registry.js';
import {nativeSolLamports} from './privy-balance.js';
import {validateSignedWithdrawal} from './withdrawal.js';
const BUILD_ID = "2026-09-25-r75";
const calloutPage = `<!doctype html><html lang="en" data-build="${BUILD_ID}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#08131a"><title>Scope — Callout Research</title><style>
:root{--bg:#08131a;--ink:#e6e8df;--muted:#a7b7ba;--amber:#dcb579;--cyan:#98dadd;--line:#a5c8c643;font-family:Arial,Helvetica,sans-serif}*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:var(--bg);color:var(--ink);overflow-x:hidden}a{color:inherit}button,input{font:inherit}button,a,input{touch-action:manipulation}button{cursor:pointer}button:focus-visible,a:focus-visible,input:focus-visible{outline:2px solid var(--cyan);outline-offset:4px}.mono,.eyebrow,.nav,.pill,.number,.status,.call-row small,.feature small,footer{font-family:ui-monospace,SFMono-Regular,Consolas,monospace}.wrap{width:min(1400px,calc(100% - 90px));margin:auto}.nav{height:88px;display:flex;align-items:center;gap:35px;border-bottom:1px solid var(--line);position:relative;z-index:3}.logo{font:30px Arial;letter-spacing:-.06em;text-decoration:none;margin-right:auto}.logo{display:inline-flex;align-items:center;gap:10px}.brand-mark{width:32px;height:32px;color:var(--amber);flex:none;filter:drop-shadow(0 2px 9px #dcb57937)}.nav>a:not(.logo){text-decoration:none;font-size:11px;letter-spacing:.07em;color:#b9c7c7}.nav>a:hover{color:#fff}.pill{border:1px solid #d3ab6766;padding:10px 14px;font-size:10px;color:var(--amber)}.hero{position:relative;min-height:640px;overflow:hidden;border-bottom:1px solid var(--line);display:flex;align-items:center}.hero:before{content:'';position:absolute;inset:0;background:radial-gradient(ellipse at 77% 43%,#38545443,transparent 43%),radial-gradient(ellipse at 80% 90%,#9d744020,transparent 35%),linear-gradient(90deg,#08131a 4%,#0a1a20 75%,#0b171b);opacity:1}.hero:after{content:'';position:absolute;inset:0;pointer-events:none;background:repeating-linear-gradient(90deg,transparent 0 88px,#b6e1e008 89px,transparent 90px);mask-image:linear-gradient(to bottom,#000,transparent)}.hero .wrap{position:relative;z-index:1;padding:67px 0}.eyebrow{color:var(--amber);font-size:11px;letter-spacing:.18em}.hero h1{font-size:clamp(65px,8.4vw,132px);letter-spacing:-.075em;line-height:.86;font-weight:300;margin:33px 0 31px;max-width:950px}.hero h1 em{font-family:Georgia,serif;color:var(--amber);font-weight:400}.hero p{max-width:570px;color:#c2cecb;font-size:clamp(17px,1.6vw,22px);line-height:1.65}.hero-quick{display:flex;gap:8px;max-width:570px;margin:26px 0 0}.hero-quick input{min-width:0;flex:1;background:#10212a;border:1px solid #a5c8c67d;color:var(--ink);padding:15px 17px;font-size:16px}.hero-quick button{background:#dce8e7;border:1px solid #dce8e7;color:#09141a;padding:15px 19px;font:12px ui-monospace,monospace;white-space:nowrap}.hero-quick button:hover{background:white}.hero-quick-note{display:block;color:#9db3b4;font-size:12px;margin-top:9px}.actions{display:flex;gap:14px;align-items:center;flex-wrap:wrap;margin-top:34px}.btn{border:1px solid var(--line);padding:17px 23px;text-decoration:none;background:transparent;color:var(--ink);font-size:12px;font-family:ui-monospace,monospace;letter-spacing:.05em;transition:background .2s,transform .2s}.btn:hover{background:#e4e8df;color:#061016;transform:translateY(-3px)}.btn.primary{background:#dce8e7;color:#09141a;border-color:#dce8e7}.hero-coordinate{position:absolute;right:0;bottom:33px;color:#91a8aa;font-size:10px}.scope-ring{position:absolute;width:min(44vw,570px);aspect-ratio:1;right:8%;top:14%;border:1px solid #aac4c13c;border-radius:50%;animation:ring 13s linear infinite;pointer-events:none}.scope-ring:after{content:'';position:absolute;width:9px;height:9px;background:var(--amber);border-radius:50%;left:50%;top:-5px;box-shadow:0 0 20px var(--amber)}@keyframes ring{to{transform:rotate(360deg)}}.signal-horn{position:absolute;width:min(51vw,710px);aspect-ratio:1;right:-2%;top:2%;z-index:1;pointer-events:none;filter:drop-shadow(0 35px 60px #000b);animation:hornFloat 11s ease-in-out infinite alternate}.signal-horn svg{width:100%;height:100%;overflow:visible}.horn-waves path{opacity:.34;transform-origin:450px 360px;animation:signalPulse 3.5s ease-in-out infinite}.horn-waves path:nth-child(2){animation-delay:.5s}.horn-waves path:nth-child(3){animation-delay:1s}.horn-label{position:absolute;right:18%;bottom:14%;font:10px ui-monospace,monospace;letter-spacing:.17em;color:#e3bd80}.signal-horn:after{content:'';position:absolute;left:24%;top:19%;width:55%;height:64%;border-radius:50%;box-shadow:0 0 100px #d0a0601c;pointer-events:none}@keyframes signalPulse{0%,100%{opacity:.06;transform:scale(.95)}40%{opacity:.47;transform:scale(1.03)}}@keyframes hornFloat{to{transform:translateY(-10px) rotate(1deg)}}.ticker{display:grid;grid-template-columns:repeat(4,1fr);border-bottom:1px solid var(--line)}.ticker>div{padding:23px;border-right:1px solid var(--line)}.ticker>div:first-child{padding-left:max(45px,calc((100vw - 1400px)/2))}.ticker small{display:block;color:#82999e;font:10px ui-monospace,monospace;letter-spacing:.08em}.ticker b{display:block;font-size:18px;margin-top:8px;font-weight:400}.ticker .locked{color:#e4b682}.section{padding:72px 0}.section-head{display:flex;justify-content:space-between;align-items:end;gap:50px}.section h2{font-size:clamp(50px,6.4vw,92px);line-height:.96;letter-spacing:-.065em;font-weight:300;margin:20px 0}.section-head p{max-width:470px;color:var(--muted);line-height:1.7}.workbench{display:grid;grid-template-columns:1.15fr .85fr;gap:1px;background:var(--line);border:1px solid var(--line);margin-top:42px}.workbench>div{background:linear-gradient(145deg,#10222b,#0b171e);padding:36px}.workbench .number{color:var(--amber);font-size:11px;letter-spacing:.13em}.workbench h3{font-size:31px;font-weight:350;letter-spacing:-.035em}.workbench p{color:var(--muted);line-height:1.65}.caller-form{display:flex;gap:12px;margin-top:28px}.caller-form input{background:#08131a;border:1px solid #b8d4d24e;padding:17px;color:var(--ink);flex:1;min-width:0;font-size:16px}.caller-form button{white-space:nowrap}.stake-preference{margin-top:20px;display:grid;gap:9px}.stake-preference label{font:11px ui-monospace,monospace;color:var(--amber);letter-spacing:.08em}.stake-preference>div{display:flex;align-items:center;gap:12px}.stake-preference input{width:120px;background:#08131a;color:var(--ink);border:1px solid #b8d4d24e;padding:10px;font-size:16px}.stake-preference small{color:var(--muted);line-height:1.5}.watchlist{margin-top:24px}.call-row{display:flex;align-items:center;gap:15px;padding:15px;border:1px solid #b3d3d334;margin-top:7px;background:#07151b}.avatar{width:43px;height:43px;flex:none;border-radius:50%;border:1px solid #dcb57977;display:grid;place-items:center;background:radial-gradient(circle at 30% 20%,#31525a,#101b21);color:#ddb87c;font:22px Georgia,serif;overflow:hidden}.avatar img{width:100%;height:100%;object-fit:cover}.call-row a{flex:1;min-width:0;overflow-wrap:anywhere;color:var(--ink);font:14px ui-monospace,monospace}.call-row small{color:var(--amber);font-size:10px}.call-row button{background:none;border:0;color:#aabec1;font-size:11px}.empty{border:1px dashed #b3d3d340;padding:26px;color:#8ea5aa}.status{font-size:11px;line-height:1.65;color:var(--amber)}.rail{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:var(--line);border:1px solid var(--line);margin-top:24px}.feature{background:#0b171e;padding:27px}.feature small{color:var(--amber)}.feature b{display:block;margin:20px 0;font-size:23px;font-weight:350}.feature p{color:var(--muted);font-size:14px;line-height:1.55}.interlock{border-block:1px solid var(--line);background:radial-gradient(circle at 85% 20%,#d9a15b1a,transparent 38%),#0d181d}.interlock .wrap{display:grid;grid-template-columns:1fr 1fr;gap:60px;padding:75px 0}.interlock h2{font-size:clamp(43px,5vw,72px);font-weight:300;letter-spacing:-.06em;line-height:1;margin:16px 0}.interlock p{color:var(--muted);line-height:1.65}.gate{padding:18px 0;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;gap:20px;font:12px ui-monospace,monospace}.gate b{font-weight:400;color:var(--amber)}.research-link{padding:80px 0;display:flex;justify-content:space-between;gap:30px;align-items:center}.research-link h2{font-size:clamp(40px,5vw,68px);font-weight:300;letter-spacing:-.05em;margin:0 0 12px}.research-link p{color:var(--muted);max-width:600px}footer{padding:32px 0;border-top:1px solid var(--line);display:flex;justify-content:space-between;color:#81979b;font-size:11px}@media(max-width:850px){.wrap{width:calc(100% - 38px)}.nav{height:auto;min-height:70px;gap:12px;flex-wrap:wrap;padding:13px 0}.nav .logo{flex:1 0 100%}.nav>a:not(.logo){display:none}.nav>a[href="/portfolio"],.nav>a[href="/account"]{display:inline;color:#dce9e6}.pill{display:none}.hero{min-height:580px}.hero-quick{flex-wrap:wrap}.hero-quick button{width:100%}.hero:before{background:radial-gradient(ellipse at 78% 45%,#4265682c,transparent 48%),#08131a}.hero h1{font-size:clamp(62px,13vw,96px)}.ticker{grid-template-columns:1fr 1fr}.ticker>div{padding:16px!important}.workbench,.rail,.interlock .wrap{grid-template-columns:1fr}.section{padding:70px 0}.section-head{display:block}.workbench>div{padding:24px}.caller-form{display:block}.caller-form button{margin-top:12px}.call-row{flex-wrap:wrap}.research-link{display:block}.research-link .btn{display:inline-block}.scope-ring{width:80vw;right:-25%}.signal-horn{width:85vw;top:8%;right:-41%;opacity:.42}.horn-label{display:none}}@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}*,*:before,*:after{animation:none!important;transition:none!important}}

/* The horn fires a restrained transition into the caller field. Only opacity and transform move. */
.signal-sweep{position:fixed;inset:0;z-index:20;pointer-events:none;overflow:hidden;visibility:hidden}
.signal-sweep:before{content:'';position:absolute;inset:-20%;background:radial-gradient(ellipse at 85% 46%,#f0d3a3 0%,#b4d6d1 16%,#305159 39%,#07151c 73%);transform:translate3d(105%,0,0) skewX(-15deg);opacity:.95}
.signal-sweep:after{content:'';position:absolute;inset:0;background:linear-gradient(105deg,transparent 8%,#d3e6da2e 38%,#fff0c76b 51%,transparent 62%);transform:translate3d(110%,0,0) skewX(-15deg)}
body.calling .signal-sweep,body.call-arrived .signal-sweep{visibility:visible}
body.calling .signal-sweep:before{animation:call-wash .53s cubic-bezier(.25,.7,.2,1) both}
body.calling .signal-sweep:after{animation:call-streak .57s cubic-bezier(.24,.72,.28,1) both}
body.call-arrived .signal-sweep{animation:call-clear .38s ease-out both}
body.calling .signal-horn{animation:horn-call .54s cubic-bezier(.18,.8,.24,1) both}
body.calling .horn-waves path{animation:wave-call .5s ease-out both}
body.calling .hero .wrap{animation:hero-call .54s ease-out both}
@keyframes call-wash{0%{transform:translate3d(105%,0,0) skewX(-15deg)}100%{transform:translate3d(-3%,0,0) skewX(-15deg)}}
@keyframes call-streak{0%{transform:translate3d(110%,0,0) skewX(-15deg)}100%{transform:translate3d(-110%,0,0) skewX(-15deg)}}
@keyframes call-clear{from{opacity:1}to{opacity:0}}
@keyframes horn-call{0%{transform:translate3d(0,0,0) scale(1)}50%{transform:translate3d(-15px,0,0) scale(.98)}100%{transform:translate3d(42px,0,0) scale(1.1)}}
@keyframes wave-call{from{opacity:.15;transform:scale(.9)}to{opacity:.8;transform:scale(1.32)}}
@keyframes hero-call{from{transform:translate3d(0,0,0);opacity:1}to{transform:translate3d(-34px,0,0);opacity:.55}}
@media(prefers-reduced-motion:reduce){.signal-sweep{display:none!important}}
.live-watch{margin:26px 0;border:1px solid #a5c8c64d;background:#091820;padding:20px}.live-watch h4{font-size:21px;font-weight:400;margin:10px 0}.live-watch p{color:#b0c2c4;line-height:1.5;margin:8px 0;font-size:14px}.live-watch .paper-line{border-top:1px solid #a5c8c633;padding:13px 0;display:grid;gap:5px}.live-watch .paper-line a{color:#e6e8df;text-decoration:underline;text-decoration-color:#dcb57988;overflow-wrap:anywhere}.live-watch .paper-line small{color:#a8b8bb;font:12px ui-monospace,monospace}.live-watch .paper-line strong{color:#dcb579;font:12px ui-monospace,monospace}.live-watch .monitor-error{color:#efb5a1}
.hero{min-height:560px}.hero h1{font-size:clamp(52px,7vw,110px)}.hero-quick input{border-color:#e9c88e;box-shadow:0 0 0 3px #e9c88e16}.hero-quick button{background:#e9c88e;border-color:#e9c88e;font-weight:700}
@media(max-width:700px){.hero{min-height:0}.hero .wrap{padding:46px 0 54px}.hero h1{font-size:clamp(48px,11vw,70px);line-height:.98;margin:20px 0}.hero-quick{flex-direction:column}.hero-quick button{width:100%}}
</style></head><body><div class="signal-sweep" aria-hidden="true"></div><nav class="nav wrap"><a class="logo" href="/"><svg class="brand-mark" viewBox="0 0 32 32" fill="none" aria-hidden="true"><rect x="12" y="5" width="8" height="15" rx="4" stroke="currentColor" stroke-width="1.8"/><path d="M8.5 15.5a7.5 7.5 0 0 0 15 0M16 23v4m-5 0h10" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M4 9.5a14 14 0 0 0 0 13m24-13a14 14 0 0 1 0 13" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" opacity=".56"/></svg><span>scope</span></a><a href="#callerDesk">CALLERS</a><a href="/account">TRADING ACCOUNT ↗</a><a href="/portfolio">PHANTOM OPTION</a><span class="pill">CALLOUT FEED LIVE · SNIPES LOCKED</span></nav><main><section class="hero"><div class="scope-ring" aria-hidden="true"></div><div class="signal-horn" aria-hidden="true">__HERO_MIC_SVG__</div><div class="wrap"><div class="eyebrow">SCOPE / PUBLIC CALLS, PRIVATE DECISIONS</div><h1>Follow the call.<br><em>Set the snipe.</em></h1><p>Add Pump.fun callers here, then set your SOL size and sell targets in your Scope account. Your feed updates while this page is open; automatic orders are still locked.</p><form id="heroCallerForm" class="hero-quick"><label for="heroCaller" class="mono" style="position:absolute;left:-9999px">Pump username, join link or wallet</label><input id="heroCaller" placeholder="@username, pump.fun/join/… or wallet" maxlength="260" required><button type="submit">ADD TO WATCHLIST ↗</button></form><small class="hero-quick-note">Free setup · no wallet or token burn during prelaunch</small><div class="actions"><a class="btn primary" href="/account">OPEN SCOPE TRADING ACCOUNT ↗</a><a class="btn" href="/account#autoRules">SET TRADE RULES ↗</a></div><span class="hero-coordinate mono">SIGNAL FIRST / CAPITAL LAST</span></div></section><section class="section wrap" id="callerDesk"><div class="section-head"><div><span class="eyebrow">01 / CALLER FIELD</span><h2>Make your own<br>watchlist.</h2></div><p>Follow a caller, see their published coin, and set up how much you want to spend. Live orders remain locked until the trading account can execute safely.</p></div><div class="workbench"><div><span class="number">YOUR FIELD / THIS DEVICE</span><h3>Choose who to study.</h3><p>Paste a Pump username, profile link, join link, or Solana wallet. This browser checks your list while the page is open.</p><form class="caller-form" id="callerForm"><label for="callerProfile" class="mono" style="position:absolute;left:-9999px">Pump username, profile or join link, or wallet address</label><input id="callerProfile" placeholder="@username, pump.fun/join/…, or wallet" required maxlength="260"><button type="submit" class="btn primary">ADD CALLER</button></form><p id="callerStatus" class="status" role="status">No wallet, burn, or live trading is required for setup.</p><div id="watchlist" class="watchlist" aria-live="polite"></div><div class="live-watch" aria-label="Callout watch"><span class="eyebrow">LIVE SOURCE / PAPER OBSERVATION</span><h4>Watching your callers</h4><p id="calloutMonitorStatus" role="status">Add a caller to set up your watchlist. Callout monitoring begins when you add a caller and keep this page open.</p><div id="calloutMonitorList" aria-live="polite"></div><p>Calls from your selected profiles appear here while the page is open. No order, fill, or profit is claimed, and live spending is locked.</p></div> </div><div><span class="number">NEXT STEP / SNIPE RULES</span><h3>Set your snipe.</h3><p>Your Scope account is for automatic callout sniping. Choose a SOL amount per call, add optional market-cap ranges and exit targets, and fund its dedicated wallet. Orders remain locked until the execution service is verified.</p><a class="btn primary" href="/account">SET SNIPE RULES ↗</a><p style="margin-top:24px">Prefer to approve each trade in Phantom? <a href="/portfolio">Use the Phantom portfolio ↗</a></p><div class="gate"><span>Callout feed</span><b>LIVE WHILE OPEN</b></div><div class="gate"><span>Automatic orders</span><b>LOCKED</b></div></div></div></section></main><footer class="wrap"><span><a href="/launch-research" target="_blank" rel="noopener noreferrer" style="color:inherit;text-decoration:none;opacity:.52;font-size:10px">Research archive ↗</a></span><span>SCOPE / AUTOMATIC ORDERS OFF</span><span><a href="https://github.com/friskySacs18/ScatterScope" target="_blank" rel="noopener noreferrer">FRISKY GITHUB ↗</a> · <a href="https://x.com/ScatterScopeco" target="_blank" rel="noopener noreferrer">SCOPE ON X ↗</a></span></footer><script>
(()=>{const form=document.getElementById('callerForm'),input=document.getElementById('callerProfile'),list=document.getElementById('watchlist'),status=document.getElementById('callerStatus'),button=form.querySelector('button[type=submit]'),key='scope-caller-watchlist-v1',avatarKey='scope-caller-avatars-v1',wallet=/^(?:[1-9A-HJ-NP-Za-km-z]{32,44}|[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12})$/i;let callers=[],avatars={};try{const stored=JSON.parse(localStorage.getItem(avatarKey)||'{}');if(stored&&typeof stored==='object')avatars=stored}catch{}try{const saved=JSON.parse(localStorage.getItem(key)||'[]');if(Array.isArray(saved))callers=saved.map(x=>typeof x==='string'?{wallet:x,username:''}:x).filter(x=>x&&typeof x.wallet==='string'&&wallet.test(x.wallet)).slice(0,12)}catch{}function render(){list.replaceChildren();if(!callers.length){const empty=document.createElement('p');empty.className='empty';empty.textContent='Your field is empty. Add a caller to begin.';list.append(empty)}for(const caller of callers){const id=caller.wallet,row=document.createElement('div');row.className='call-row';const badge=document.createElement('span');badge.className='avatar';if(typeof avatars[id]==='string'&&((avatars[id].startsWith('data:image/jpeg;base64,')&&avatars[id].length<40000)||avatars[id].startsWith('https://socialimages.pump.fun/'))){const photo=document.createElement('img');photo.alt='Caller profile picture';photo.src=avatars[id];badge.append(photo)}else{badge.textContent='◉';badge.setAttribute('aria-label','No profile picture set')}const link=document.createElement('a');link.href='https://pump.fun/profile/'+encodeURIComponent(id);link.target='_blank';link.rel='noopener';link.textContent=caller.username?'@'+caller.username+' ↗':id.slice(0,9)+'…'+id.slice(-7)+' ↗';link.title=id;const label=document.createElement('small');label.textContent='SAVED · WATCHING WHILE OPEN';const remove=document.createElement('button');remove.type='button';remove.textContent='REMOVE';remove.setAttribute('aria-label','Remove caller '+(caller.username||id));remove.onclick=()=>{callers=callers.filter(x=>x.wallet!==id);delete avatars[id];try{localStorage.setItem(key,JSON.stringify(callers));localStorage.setItem(avatarKey,JSON.stringify(avatars))}catch{}render()};const upload=document.createElement('input');upload.type='file';upload.accept='image/png,image/jpeg,image/webp';upload.style.display='none';upload.setAttribute('aria-label','Choose profile picture for '+id);const setPhoto=document.createElement('button');setPhoto.type='button';setPhoto.textContent=avatars[id]?'CHANGE PFP':'ADD PFP';setPhoto.setAttribute('aria-label','Add Pump profile picture for '+id);setPhoto.onclick=()=>upload.click();upload.onchange=()=>{const file=upload.files&&upload.files[0];if(!file||file.size>2000000||!['image/png','image/jpeg','image/webp'].includes(file.type)){status.textContent='Choose a PNG, JPEG or WebP under 2 MB.';return}const image=new Image(),objectURL=URL.createObjectURL(file);image.onload=()=>{const canvas=document.createElement('canvas');canvas.width=96;canvas.height=96;const ctx=canvas.getContext('2d');if(!ctx){URL.revokeObjectURL(objectURL);return}const side=Math.min(image.width,image.height);ctx.drawImage(image,(image.width-side)/2,(image.height-side)/2,side,side,0,0,96,96);URL.revokeObjectURL(objectURL);avatars[id]=canvas.toDataURL('image/jpeg',.78);try{localStorage.setItem(avatarKey,JSON.stringify(avatars));status.textContent='Profile picture saved on this device.'}catch{status.textContent='Device storage unavailable; picture may reset.'}render()};image.onerror=()=>{URL.revokeObjectURL(objectURL);status.textContent='Could not read that picture.'};image.src=objectURL};row.append(badge,link,label,setPhoto,remove,upload);list.append(row)}}form.onsubmit=async e=>{e.preventDefault();button.disabled=true;status.textContent='Checking Pump profile…';try{const response=await fetch('/api/callouts/resolve?q='+encodeURIComponent(input.value.trim()),{signal:AbortSignal.timeout(9000)}),data=await response.json();if(!response.ok)throw Error(data.error||'Could not check this profile.');if(callers.some(x=>x.wallet===data.wallet)){status.textContent='Already in your list.';return}if(callers.length>=12){status.textContent='Maximum 12 profiles on this device.';return}callers.push({wallet:data.wallet,username:data.username||''});if(data.profileImage)avatars[data.wallet]=data.profileImage;try{localStorage.setItem(avatarKey,JSON.stringify(avatars))}catch{}try{localStorage.setItem(key,JSON.stringify(callers));status.textContent='Saved '+(data.username?'@'+data.username:'caller')+' on this device. Checking Pump Callouts every 8 seconds while this page is open.'}catch{status.textContent='Browser storage unavailable; this choice will reset.'}input.value='';render()}catch(error){status.textContent=error.message||'Could not check this profile.'}finally{button.disabled=false}};render()})();
(()=>{const field=document.getElementById('callerDesk'),reduced=window.matchMedia('(prefers-reduced-motion: reduce)');let moving=false;document.querySelectorAll('a[href="#callerDesk"]').forEach(link=>link.addEventListener('click',event=>{if(reduced.matches||moving||document.hidden)return;event.preventDefault();moving=true;document.body.classList.remove('call-arrived');document.body.classList.add('calling');window.setTimeout(()=>{field.scrollIntoView({behavior:'instant',block:'start'});history.replaceState(null,'','#callerDesk');document.body.classList.remove('calling');document.body.classList.add('call-arrived');window.setTimeout(()=>{document.body.classList.remove('call-arrived');moving=false},390)},520)}))})();
(()=>{const quick=document.getElementById('heroCallerForm');quick.addEventListener('submit',event=>{event.preventDefault();document.getElementById('callerProfile').value=document.getElementById('heroCaller').value;document.getElementById('callerForm').requestSubmit();document.getElementById('callerDesk').scrollIntoView({behavior:'smooth',block:'start'})})})();
</script><script src="/callout-watch.js"></script></body></html>`;

const portfolioPage = "__PORTFOLIO_HTML__";
const researchPage = "__RESEARCH_HTML__";
const accountPage = "__ACCOUNT_HTML__";
const accountScript = "__ACCOUNT_JS__";
const manualTradeScript = "__MANUAL_TRADE_JS__";
const calloutWatchScript = "__CALLOUT_WATCH_JS__";
let latestEvidence=null;
const executionControl=Object.freeze({mode:'shadow',killSwitch:'engaged',liveTrading:false,signerLoaded:false,spendCapSol:0,transactionRoutes:0,walletIsolation:'market-data-only'});
const calloutAccess=Object.freeze({paperSetupOpen:true,tokenRequired:false,tokenMintConfigured:false,entitlementEnforced:false,liveCopyTrading:false});
const solanaAddress=/^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
let recentCalloutCache=null;
let recentCalloutPending=null;
export function parseRecentPumpCallouts(payload, observedAt=Date.now()){
  if(!payload||!Array.isArray(payload.callouts))throw Error('Pump Callout response changed');
  const rows=[];
  for(const raw of payload.callouts.slice(0,100)){
    if(!raw||typeof raw!=='object')continue;
    const id=String(raw.calloutId||''),caller=String(raw.userId||''),mint=String(raw.coinMint||'');
    if(!/^[a-zA-Z0-9-]{8,80}$/.test(id)||!solanaAddress.test(caller)||!solanaAddress.test(mint))continue;
    const value=raw.createdAt;
    let publishedAt=typeof value==='string'&&!/^\d+$/.test(value)?Date.parse(value):Number(value);
    if(publishedAt>0&&publishedAt<1e11)publishedAt*=1000;
    if(!Number.isFinite(publishedAt)||publishedAt<1e12||publishedAt>observedAt+10000)continue;
    rows.push({id,calloutId:id,caller,mint,publishedAt,observedAt});
  }
  return rows;
}
const callerCalloutCache=new Map();
let lastPumpSourceAt=null;
async function fetchCallerCallouts(caller){
  const existing=callerCalloutCache.get(caller),now=Date.now();
  if(existing&&now-existing.at<4500)return existing.pending||existing.rows;
  const pending=(async()=>{
    const url='https://frontend-api-v3.pump.fun/callout/list/'+encodeURIComponent(caller)+'?limit=20&sortBy=TIMESTAMP&sortOrder=DESC';
    const response=await fetch(url,{headers:{accept:'application/json'},signal:AbortSignal.timeout(5000)});
    if(!response.ok)throw Error('Pump returned '+response.status);
    const body=await response.text();
    if(body.length>500000)throw Error('Oversized Pump response');
    const at=Date.now(),rows=parseRecentPumpCallouts(JSON.parse(body),at).filter(x=>x.caller===caller&&x.publishedAt>=at-600000);
    callerCalloutCache.set(caller,{at,rows});return rows;
  })();
  callerCalloutCache.set(caller,{at:now,pending});
  try{return await pending}catch(error){callerCalloutCache.delete(caller);throw error}
}
async function recentCallouts(request,env){
  if(request.method!=='GET')return json({error:'GET required'},405);
  const now=Date.now();
  if(env?.CALLOUT_INGEST_SECRET){
    if(!env.DB?.prepare)return json({error:'Callout storage unavailable.',callouts:[]},503);
    try{
      const state=await env.DB.prepare('SELECT last_seen_at AS lastSeenAt FROM callout_ingest_state WHERE source = ?').bind('tweetstream').first();
      if(!state||now-Number(state.lastSeenAt)>30000)return json({error:'Callout stream disconnected or stale. Monitoring paused.',callouts:[],source:'tweetstream',lastSeenAt:state?.lastSeenAt||null},503);
      const result=await env.DB.prepare('SELECT id, callout_id AS calloutId, caller_wallet AS caller, mint, published_at AS publishedAt, observed_at AS observedAt FROM callout_observations WHERE received_at >= ? ORDER BY received_at DESC LIMIT 100').bind(now-600000).all();
      return json({source:'tweetstream',fetchedAt:now,lastSeenAt:state.lastSeenAt,intervalMs:8000,mode:'paper-observation',callouts:result.results||[]});
    }catch(error){console.error('Callout storage:',String(error?.message||error));return json({error:'Callout storage unavailable. Monitoring paused.',callouts:[]},503)}
  }
  const value=new URL(request.url).searchParams.get('callers')||'';
  const callers=[...new Set(value.split(',').filter(Boolean))];
  if(!callers.length||callers.length>12||callers.some(x=>!solanaAddress.test(x)))return json({error:'Select 1 to 12 valid Solana callers.',callouts:[]},400);
  const settled=await Promise.allSettled(callers.map(fetchCallerCallouts));
  const failures=settled.map((x,i)=>x.status==='rejected'?{caller:callers[i],reason:String(x.reason?.message||x.reason).slice(0,100)}:null).filter(Boolean);
  if(failures.length)return json({error:'Callout source incomplete. Monitoring paused for this check.',source:'pump-per-caller',checkedAt:Date.now(),failures,callouts:[]},503);
  lastPumpSourceAt=Date.now();
  const callouts=settled.flatMap(x=>x.value).sort((a,b)=>b.publishedAt-a.publishedAt);
  return json({source:'pump-per-caller',fetchedAt:Date.now(),intervalMs:8000,mode:'paper-observation',callerCount:callers.length,callouts});
}
async function monitorTick(request,env){
  if(request.method!=='POST')return json({error:'POST required'},405);
  if(typeof env?.SCOPE_MONITOR_SECRET!=='string'||env.SCOPE_MONITOR_SECRET.length<32||!env.DB?.prepare)return json({error:'Monitor unavailable'},503);
  if(!request.headers.get('content-type')?.startsWith('application/json')||Number(request.headers.get('content-length')||0)>32)return json({error:'Invalid monitor request'},400);
  const timestamp=Number(request.headers.get('x-scope-timestamp'));
  if(!Number.isSafeInteger(timestamp)||Math.abs(Date.now()-timestamp)>20000)return json({error:'Expired monitor request'},401);
  const body=await request.text();
  if(body!=='{}')return json({error:'Invalid monitor request'},400);
  const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(env.SCOPE_MONITOR_SECRET),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const digest=await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(timestamp+'.'+body));
  const signature=[...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,'0')).join('');
  if(!equalHex(request.headers.get('x-scope-signature')||'',signature))return json({error:'Invalid monitor signature'},401);
  try{
    const result=await env.DB.prepare('SELECT callers_json AS callers FROM automation_drafts LIMIT 101').all();
    const drafts=result?.results||[];
    if(drafts.length>100)return json({error:'Monitor capacity exceeded; no callers checked'},503);
    const selected=new Set();
    for(const draft of drafts){const callers=JSON.parse(draft.callers);if(!Array.isArray(callers))throw Error('Invalid draft caller list');for(const entry of callers)if(solanaAddress.test(entry.wallet||''))selected.add(entry.wallet)}
    if(selected.size>50)return json({error:'Monitor capacity exceeded; no callers checked'},503);
    const now=Date.now();
    const checked=await Promise.allSettled([...selected].map(fetchCallerCallouts));
    if(checked.some(x=>x.status==='rejected'))return json({error:'Callout provider incomplete; no signals recorded',callerCount:selected.size,failed:checked.filter(x=>x.status==='rejected').length,executionEnabled:false},503);
    const rows=checked.flatMap(x=>x.value);
    const saturated=checked.some(x=>x.value.length>=20&&Math.min(...x.value.map(call=>call.publishedAt))>now-12000);
    if(saturated||rows.length>100)return json({error:'Callout provider returned a saturated result; coverage cannot be assured',callerCount:selected.size,executionEnabled:false},503);
    const fresh=new Map();
    for(const call of rows){if(call.publishedAt>=now-90000&&call.publishedAt<=now&&selected.has(call.caller))fresh.set(call.id,call)}
    const statements=[];
    for(const call of [...fresh.values()].sort((a,b)=>a.publishedAt-b.publishedAt)){
      statements.push(env.DB.prepare('INSERT OR IGNORE INTO monitored_callouts (id,caller_wallet,mint,published_at,observed_at,source) VALUES (?,?,?,?,?,?)').bind(call.id,call.caller,call.mint,call.publishedAt,call.observedAt,'pump-per-caller'));
      statements.push(env.DB.prepare('INSERT INTO caller_mint_history (id,caller_wallet,mint,first_callout_id,first_published_at,history_complete) VALUES (?,?,?,?,?,0) ON CONFLICT(id) DO UPDATE SET first_callout_id=CASE WHEN excluded.first_published_at<caller_mint_history.first_published_at THEN excluded.first_callout_id ELSE caller_mint_history.first_callout_id END,first_published_at=MIN(caller_mint_history.first_published_at,excluded.first_published_at)')
        .bind(call.caller+':'+call.mint,call.caller,call.mint,call.id,call.publishedAt));
    }
    let newlyObserved=0;
    for(let i=0;i<statements.length;i+=40){
      const results=await env.DB.batch(statements.slice(i,i+40));
      if(Array.isArray(results))for(let j=0;j<results.length;j++)if((i+j)%2===0&&results[j]?.meta?.changes===1)newlyObserved++;
    }
    await env.DB.prepare('INSERT INTO callout_ingest_state (source,last_seen_at,last_callout_at) VALUES (?,?,?) ON CONFLICT(source) DO UPDATE SET last_seen_at=excluded.last_seen_at,last_callout_at=COALESCE(excluded.last_callout_at,callout_ingest_state.last_callout_at)').bind('pump-monitor',Date.now(),newlyObserved?Date.now():null).run();
    return json({checked:true,callerCount:selected.size,observations:rows.length,newlyObserved,source:'pump-per-caller',executionEnabled:false});
  }catch(error){console.error('Monitor tick:',String(error?.message||error));return json({error:'Monitor unavailable; no orders placed',executionEnabled:false},503)}
}
function equalHex(a,b){if(!/^[a-f0-9]{64}$/i.test(a||'')||a.length!==b.length)return false;let diff=0;for(let i=0;i<a.length;i++)diff|=a.charCodeAt(i)^b.charCodeAt(i);return diff===0}
async function ingestCallout(request,env){
  if(request.method!=='POST')return json({error:'POST required'},405);
  if(!env?.CALLOUT_INGEST_SECRET||String(env.CALLOUT_INGEST_SECRET).length<32||!env.DB?.prepare)return json({error:'Intake is unavailable'},503);
  if(!request.headers.get('content-type')?.startsWith('application/json')||Number(request.headers.get('content-length')||0)>2048)return json({error:'Invalid intake payload'},400);
  const raw=await request.text();if(raw.length>2048)return json({error:'Invalid intake payload'},413);
  const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(env.CALLOUT_INGEST_SECRET),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const digest=await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(raw));
  const hex=[...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,'0')).join('');
  if(!equalHex(request.headers.get('x-scope-signature')||'',hex))return json({error:'Invalid intake signature'},401);
  let body;try{body=JSON.parse(raw)}catch{return json({error:'Invalid JSON'},400)}
  const now=Date.now(),at=Number(body.observedAt);
  if(!Number.isSafeInteger(at)||Math.abs(now-at)>30000)return json({error:'Expired intake payload'},400);
  if(body.type==='heartbeat'){
    await env.DB.prepare('INSERT INTO callout_ingest_state (source,last_seen_at) VALUES (?,?) ON CONFLICT(source) DO UPDATE SET last_seen_at = excluded.last_seen_at').bind('tweetstream',now).run();
    return json({accepted:true,mode:'paper-observation'});
  }
  const id=String(body.id||''),calloutId=String(body.calloutId||''),caller=String(body.caller||''),mint=String(body.mint||''),publishedAt=Number(body.publishedAt);
  if(body.type!=='callout'||!/^[a-zA-Z0-9._-]{8,100}$/.test(id)||!/^[a-zA-Z0-9-]{8,80}$/.test(calloutId)||!solanaAddress.test(caller)||!solanaAddress.test(mint)||!Number.isSafeInteger(publishedAt)||publishedAt>at+2000||at-publishedAt>90000)return json({error:'Invalid or stale callout'},400);
  const result=await env.DB.prepare('INSERT OR IGNORE INTO callout_observations (id,callout_id,caller_wallet,mint,published_at,observed_at,source,received_at) VALUES (?,?,?,?,?,?,?,?)').bind(id,calloutId,caller,mint,publishedAt,at,'tweetstream',now).run();
  await env.DB.prepare('INSERT INTO callout_ingest_state (source,last_seen_at,last_callout_at) VALUES (?,?,?) ON CONFLICT(source) DO UPDATE SET last_seen_at = excluded.last_seen_at, last_callout_at = excluded.last_callout_at').bind('tweetstream',now,now).run();
  return json({accepted:true,duplicate:result.meta?.changes===0,mode:'paper-observation'});
}
let privyCredentialCheck={at:0,result:null};
let privyPolicyCheck={at:0,result:null};
const SCOPE_SIGNER_QUORUM_ID='kzp9n6z4hxygbdqs4sf3dprc';
const SCOPE_SIGNER_PUBLIC_KEY='MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEaQph05zAtLWHumLVHHwRYs+O/WIxDCCI3Hvmu9RSOaGHPlhHm70K/LzCuab7v67SjL5I0yYbMejxw6H1sRAL8w==';
const PRIVY_APP_ID='cmuejmq9g00eg0cla13182nah';
let privyVerificationCache={at:0,key:null,pending:null};
async function privyVerificationKey(env){
  const configured=env?.PRIVY_ACCESS_TOKEN_VERIFICATION_KEY;
  if(typeof configured==='string'&&configured.includes('BEGIN PUBLIC KEY'))return configured;
  if(!env?.PRIVY_APP_SECRET)return null;
  if(privyVerificationCache.pending)return privyVerificationCache.pending;
  const age=Date.now()-privyVerificationCache.at;
  if(privyVerificationCache.at&&age<(privyVerificationCache.key?300000:30000))return privyVerificationCache.key;
  privyVerificationCache.pending=(async()=>{
    try{
      // Privy's server SDK retrieves this public key from the authenticated app-settings endpoint.
      const response=await fetch('https://auth.privy.io/api/v1/apps/'+PRIVY_APP_ID,{headers:{authorization:'Basic '+btoa(PRIVY_APP_ID+':'+env.PRIVY_APP_SECRET),'privy-app-id':PRIVY_APP_ID},signal:AbortSignal.timeout(5000)});
      if(!response.ok)return null;
      const data=await response.json(),key=data?.verification_key;
      return typeof key==='string'&&key.length<2000&&/^-----BEGIN PUBLIC KEY-----[\s\S]+-----END PUBLIC KEY-----\s*$/.test(key)?key:null;
    }catch{return null}
  })();
  try{privyVerificationCache.key=await privyVerificationCache.pending;privyVerificationCache.at=Date.now();return privyVerificationCache.key}
  finally{privyVerificationCache.pending=null}
}
function decodeBase64Url(value){
  if(!/^[A-Za-z0-9_-]+$/.test(value)||value.length>4096)throw Error('Invalid token encoding');
  return Uint8Array.from(atob(value.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-value.length%4)%4)),c=>c.charCodeAt(0));
}
async function verifiedPrivySubject(request,env){
  // Privy's public access-token verification key is distinct from the server signer key.
  const authorization=request.headers.get('authorization')||'';
  if(!/^Bearer [A-Za-z0-9._-]+$/.test(authorization)||authorization.length>4096)return {error:'Privy login required',status:401};
  const pem=await privyVerificationKey(env);
  if(!pem)return {error:'Account verification is temporarily unavailable',status:503};
  try{
    const parts=authorization.slice(7).split('.');
    if(parts.length!==3)return {error:'Invalid login token',status:401};
    const header=JSON.parse(new TextDecoder().decode(decodeBase64Url(parts[0])));
    if(!['ES256','EdDSA'].includes(header.alg)||(header.typ&&header.typ!=='JWT'))return {error:'Invalid login token',status:401};
    const der=Uint8Array.from(atob(pem.replace(/-----BEGIN PUBLIC KEY-----|-----END PUBLIC KEY-----|\s/g,'')),c=>c.charCodeAt(0));
    const algorithm=header.alg==='EdDSA'?'Ed25519':{name:'ECDSA',namedCurve:'P-256'};
    const key=await crypto.subtle.importKey('spki',der,algorithm,false,['verify']);
    const valid=await crypto.subtle.verify(header.alg==='EdDSA'?'Ed25519':{name:'ECDSA',hash:'SHA-256'},key,decodeBase64Url(parts[2]),new TextEncoder().encode(parts[0]+'.'+parts[1]));
    if(!valid)return {error:'Invalid login token',status:401};
    const payload=JSON.parse(new TextDecoder().decode(decodeBase64Url(parts[1]))),now=Math.floor(Date.now()/1000);
    if(payload.iss!=='privy.io'||payload.aud!==PRIVY_APP_ID||!/^did:privy:[a-zA-Z0-9_-]{8,120}$/.test(payload.sub||'')||
      !Number.isSafeInteger(payload.exp)||payload.exp<=now||!Number.isSafeInteger(payload.iat)||payload.iat>now+30||
      payload.exp-payload.iat>7200)return {error:'Expired or invalid login token',status:401};
    return {subject:payload.sub};
  }catch{return {error:'Invalid login token',status:401}}
}
function validateAutomationDraft(body){
  if(!body||typeof body!=='object'||Array.isArray(body)||!solanaAddress.test(body.wallet||''))return null;
  const callers=body.callers,r=body.rules;
  if(!Array.isArray(callers)||callers.length>12||!r||typeof r!=='object'||Array.isArray(r))return null;
  const wallets=new Set();
  for(const entry of callers){
    if(!entry||!solanaAddress.test(entry.wallet||'')||typeof entry.username!=='string'||entry.username.length>50||wallets.has(entry.wallet))return null;
    wallets.add(entry.wallet);
  }
  let marketCapBands;
  try{marketCapBands=normalizedBands(r.marketCapBands)}catch{return null}
  const {profit1Percent:p1,profit1Sell:s1,profit2Percent:p2,profit2Sell:s2,stopPercent:stop}=r;
  const optional=x=>x===null||x===undefined;
  if(![p1,s1,p2,s2,stop].every(x=>optional(x)||Number.isInteger(x)))return null;
  if((optional(p1)!==optional(s1))||(optional(p2)!==optional(s2))||(!optional(p2)&&optional(p1)))return null;
  if(!optional(p1)&&(p1<1||p1>10000||s1<1||s1>100))return null;
  if(!optional(p2)&&(p2<=p1||p2>10000||s2<1||s2>100||s1+s2>100))return null;
  if(!optional(stop)&&(stop<1||stop>99))return null;
  if(optional(p1)&&optional(stop))return null;
  return {wallet:body.wallet,callers:callers.map(({wallet,username})=>({wallet,username})),rules:{marketCapBands,profit1Percent:p1??null,profit1Sell:s1??null,profit2Percent:p2??null,profit2Sell:s2??null,stopPercent:stop??null}};
}
async function automationDraft(request,env){
  if(!['GET','PUT','DELETE'].includes(request.method))return json({error:'GET, PUT or DELETE required'},405);
  if(!env.DB?.prepare)return json({error:'Draft storage unavailable'},503);
  const auth=await verifiedPrivySubject(request,env);
  if(!auth.subject)return json({error:auth.error},auth.status);
  try{
    if(request.method==='GET'){
      const row=await env.DB.prepare('SELECT wallet_address AS wallet,callers_json AS callers,rules_json AS rules,updated_at AS updatedAt FROM automation_drafts WHERE auth_subject = ?').bind(auth.subject).first();
      return json({draft:row?{wallet:row.wallet,callers:JSON.parse(row.callers),rules:JSON.parse(row.rules),updatedAt:row.updatedAt}:null,executionEnabled:false});
    }
    if(request.method==='DELETE'){
      await env.DB.prepare('DELETE FROM automation_drafts WHERE auth_subject = ?').bind(auth.subject).run();
      return json({deleted:true,executionEnabled:false});
    }
    if(!request.headers.get('content-type')?.startsWith('application/json')||Number(request.headers.get('content-length')||0)>4000)return json({error:'Invalid draft'},400);
    const raw=await request.text();
    if(raw.length>4000)return json({error:'Draft too large'},413);
    let body;try{body=JSON.parse(raw)}catch{return json({error:'Invalid JSON'},400)}
    const draft=validateAutomationDraft(body);
    if(!draft)return json({error:'Invalid wallet, callers or trade limits'},400);
    const ownership=await verifyScopeWallet({subject:auth.subject,address:draft.wallet,appSecret:env.PRIVY_APP_SECRET});
    if(!ownership.verified)return json({error:'This Scope wallet is not linked to your Privy account'},403);
    const now=Date.now();
    const registration=await registerPendingAccount(env.DB,{subject:auth.subject,address:draft.wallet,walletId:ownership.walletId,now});
    await env.DB.prepare('INSERT INTO automation_drafts (auth_subject,wallet_address,callers_json,rules_json,updated_at) VALUES (?,?,?,?,?) ON CONFLICT(auth_subject) DO UPDATE SET wallet_address=excluded.wallet_address,callers_json=excluded.callers_json,rules_json=excluded.rules_json,updated_at=excluded.updated_at')
      .bind(auth.subject,draft.wallet,JSON.stringify(draft.callers),JSON.stringify(draft.rules),now).run();
    return json({saved:true,updatedAt:now,accountStatus:registration.status,executionEnabled:false});
  }catch(error){
    if(error?.message==='A different Scope wallet is already registered for this account')return json({error:'This account already has a different Scope wallet. Contact support before changing wallets.'},409);
    console.error('Draft storage:',String(error?.message||error));return json({error:'Draft storage or wallet verification unavailable'},503)
  }
}
async function automationWallet(request,env){
  if(request.method!=='GET')return json({error:'GET required'},405);
  const auth=await verifiedPrivySubject(request,env);
  if(!auth.subject)return json({error:auth.error},auth.status);
  const address=new URL(request.url).searchParams.get('wallet')||'';
  if(!solanaAddress.test(address))return json({error:'Invalid Solana address'},400);
  try{
    const result=await verifyScopeWallet({subject:auth.subject,address,appSecret:env.PRIVY_APP_SECRET});
    return json({wallet:address,verified:result.verified,executionEnabled:false});
  }catch{return json({error:'Privy wallet verification unavailable'},503)}
}
async function inspectBuyRequest(request){
  if(request.method!=='POST')return json({error:'POST required'},405);
  const origin=request.headers.get('origin');
  if(origin&&origin!==new URL(request.url).origin)return json({error:'Cross-origin request'},403);
  if(!request.headers.get('content-type')?.startsWith('application/json')||Number(request.headers.get('content-length')||0)>2100)return json({error:'Invalid request'},400);
  try{
    const raw=await request.text();if(raw.length>2100)return json({error:'Request too large'},413);
    const {transaction,wallet,mint,maxSpendSol}=JSON.parse(raw);
    return json({...inspectAutomatedBuy(transaction,{wallet,mint,maxSpendSol}),executionEnabled:false});
  }catch(error){return json({error:String(error?.message||'Transaction rejected').slice(0,110),executionEnabled:false},422)}
}
async function checkPrivyCredentials(env){
  if(!env?.PRIVY_APP_SECRET)return {configured:false,authenticated:false,signerRegistered:false};
  if(Date.now()-privyCredentialCheck.at<60000&&privyCredentialCheck.result)return privyCredentialCheck.result;
  let authenticated=false,reachable=false,signerRegistered=false;
  try{
    const appId='cmuejmq9g00eg0cla13182nah';
    const response=await fetch('https://api.privy.io/v1/key_quorums/'+SCOPE_SIGNER_QUORUM_ID,{headers:{'Authorization':'Basic '+btoa(appId+':'+env.PRIVY_APP_SECRET),'privy-app-id':appId},signal:AbortSignal.timeout(5000)});
    reachable=true;authenticated=response.ok;
    if(response.ok){const quorum=await response.json();signerRegistered=quorum.id===SCOPE_SIGNER_QUORUM_ID&&quorum.authorization_threshold===1&&quorum.authorization_keys?.length===1&&quorum.authorization_keys[0]?.public_key?.replace(/\s/g,'')===SCOPE_SIGNER_PUBLIC_KEY}
  }catch{}
  const result={configured:true,authenticated,reachable,signerRegistered};
  privyCredentialCheck={at:Date.now(),result};
  return result;
}
async function checkPrivyPolicy(env){
  const id=env?.SCOPE_PRIVY_POLICY_ID;
  if(!/^[a-z0-9]{24}$/.test(id||''))return {configured:false,verified:false};
  if(Date.now()-privyPolicyCheck.at<60000&&privyPolicyCheck.result)return privyPolicyCheck.result;
  let verified=false;
  try{
    const appId='cmuejmq9g00eg0cla13182nah';
    const response=await fetch('https://api.privy.io/v1/policies/'+id,{headers:{'Authorization':'Basic '+btoa(appId+':'+env.PRIVY_APP_SECRET),'privy-app-id':appId},signal:AbortSignal.timeout(5000)});
    if(response.ok){
      const policy=await response.json(),rules=policy.rules||[];
      const allowedPrograms=['6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P','ComputeBudget111111111111111111111111111111','ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL'];
      const program=rules.find(rule=>rule.action==='ALLOW'&&rule.method==='signAndSendTransaction'&&rule.conditions?.length===1&&rule.conditions[0].field_source==='solana_program_instruction'&&rule.conditions[0].field==='programId'&&rule.conditions[0].operator==='in'&&Array.isArray(rule.conditions[0].value)&&rule.conditions[0].value.length===allowedPrograms.length&&allowedPrograms.every(programId=>rule.conditions[0].value.includes(programId)));
      const transfer=rules.find(rule=>rule.action==='ALLOW'&&rule.method==='signAndSendTransaction'&&rule.conditions?.length===1&&rule.conditions[0].field_source==='solana_system_program_instruction'&&rule.conditions[0].field==='Transfer.lamports'&&rule.conditions[0].operator==='lte'&&Number.isSafeInteger(Number(rule.conditions[0].value))&&Number(rule.conditions[0].value)>=0&&Number(rule.conditions[0].value)<=10000000);
      verified=policy.id===id&&policy.chain_type==='solana'&&policy.owner_id===SCOPE_SIGNER_QUORUM_ID&&rules.length===2&&Boolean(program&&transfer&&program!==transfer);
    }
  }catch{}
  const result={configured:true,verified};privyPolicyCheck={at:Date.now(),result};return result;
}
async function signerSetup(env){
  const [privy,policy]=await Promise.all([checkPrivyCredentials(env),checkPrivyPolicy(env)]);
  const ready=privy.signerRegistered&&policy.verified&&Boolean(env?.SCOPE_PRIVY_SIGNER_PRIVATE_KEY_PEM)&&env?.SCOPE_DELEGATION_READY==='true';
  return json({ready,quorumId:ready?SCOPE_SIGNER_QUORUM_ID:null,policyId:ready?env.SCOPE_PRIVY_POLICY_ID:null,reason:ready?null:!privy.signerRegistered?'Signer verification pending':!policy.verified?'Restricted policy verification pending':'Server order controls and consent gate pending'});
}
async function automationReadiness(env){
  let lastSeenAt=null;
  const provider=env?.CALLOUT_INGEST_SECRET?'tweetstream':env?.SCOPE_MONITOR_SECRET?'pump-monitor':'pump-per-caller';
  if(provider!=='pump-per-caller'&&env.DB?.prepare){
    try{const row=await env.DB.prepare('SELECT last_seen_at AS lastSeenAt FROM callout_ingest_state WHERE source = ?').bind(provider).first();lastSeenAt=row?.lastSeenAt||null}catch{}
  }
  const observedAt=provider==='pump-per-caller'?lastPumpSourceAt:lastSeenAt;
  const sourceLive=Number.isSafeInteger(observedAt)&&Date.now()-observedAt<30000;
  const [privy,policy,verificationKey]=await Promise.all([checkPrivyCredentials(env),checkPrivyPolicy(env),privyVerificationKey(env)]);
  return json({mode:'paper-observation',draftStorageConfigured:Boolean(verificationKey),monitorConfigured:Boolean(env?.SCOPE_MONITOR_SECRET),sourceConfigured:true,sourceLive,lastSeenAt:observedAt,source:provider,privy,policy,signingKeyStored:Boolean(env?.SCOPE_PRIVY_SIGNER_PRIVATE_KEY_PEM),signerRegistered:privy.signerRegistered,signerConfigured:false,orderExecutionEnabled:false,spendCapSol:0,blocking:[...(!verificationKey?['Privy account verification unavailable; account draft sync paused']:[]),...(!env?.SCOPE_MONITOR_SECRET?['Always-on callout monitor is not connected']:[]),...(env?.SCOPE_MONITOR_SECRET&&!sourceLive?['Callout monitor has no recent successful heartbeat']:[]),'Per-caller feed needs prospective coverage, latency and complete caller history','Current USD market-cap quote must be connected and freshness checked','Obtain user authorization after server order controls are ready','Guarded order execution and reconciliation are not available','No funded canary execution']});
}
const secure={"content-security-policy":"default-src 'self'; style-src 'unsafe-inline'; script-src 'self' 'unsafe-inline'; img-src data:; connect-src 'self' wss:; frame-ancestors 'none'; base-uri 'none'; form-action 'none'","referrer-policy":"no-referrer","x-content-type-options":"nosniff","x-frame-options":"DENY","permissions-policy":"camera=(), microphone=(), geolocation=()"};
const pageHeaders={"content-type":"text/html; charset=utf-8","cache-control":"no-store, no-cache, must-revalidate, max-age=0","cdn-cache-control":"no-store","surrogate-control":"no-store","pragma":"no-cache","expires":"0","clear-site-data":"\"cache\"","x-scatterscope-build":BUILD_ID,...secure};
const accountCsp="default-src 'self'; script-src 'self' https://*.privy.io https://*.privy.app; style-src 'self' 'unsafe-inline' https://*.privy.io; img-src 'self' data: https://*.privy.io https://*.privy.app; connect-src 'self' https://*.privy.io https://*.privy.app https://api.mainnet-beta.solana.com wss:; frame-src https://*.privy.io https://*.privy.app; frame-ancestors 'none'; base-uri 'none'; form-action 'self' https://*.privy.io https://*.privy.app";
const accountHeaders={...pageHeaders,"content-security-policy":accountCsp};
function json(data,status=200){return new Response(JSON.stringify(data),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store",...secure}})}
async function accountRpc(request,env,method){
  if(request.method!=="GET")return json({error:"GET required"},405);
  const wallet=new URL(request.url).searchParams.get("wallet")||"";
  if(method==="getBalance"&&!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(wallet))return json({error:"Invalid Solana address."},400);
  if(method==="getBalance"){
    const auth=await verifiedPrivySubject(request,env);
    if(!auth.subject)return json({error:auth.error},auth.status);
    try{
      const ownership=await verifyScopeWallet({subject:auth.subject,address:wallet,appSecret:env.PRIVY_APP_SECRET});
      if(!ownership.verified)return json({error:'This wallet is not linked to your Privy account.'},403);
      try{
        const response=await fetch('https://api.privy.io/v1/wallets/'+ownership.walletId+'/balance?asset=sol&chain=solana',{
          headers:{authorization:'Basic '+btoa(PRIVY_APP_ID+':'+env.PRIVY_APP_SECRET),'privy-app-id':PRIVY_APP_ID},signal:AbortSignal.timeout(8000)
        });
        if(!response.ok)throw Error('Balance service unavailable');
        const lamports=nativeSolLamports(await response.json());
        return json({wallet,lamports,source:'privy'});
      }catch{
        // Some Privy app configurations do not include native SOL in their
        // balance response. Fall back to RPC, without weakening ownership.
        const response=await fetch(env?.SOLANA_RPC_URL||'https://api.mainnet.solana.com',{
          method:'POST',headers:{'content-type':'application/json'},
          body:JSON.stringify({jsonrpc:'2.0',id:1,method:'getBalance',params:[wallet,{commitment:'confirmed'}]}),
          signal:AbortSignal.timeout(8000)
        });
        if(!response.ok)throw Error('Balance providers unavailable');
        const data=await response.json(),lamports=data.result?.value;
        if(data.error||!Number.isSafeInteger(lamports)||lamports<0)throw Error('Invalid RPC balance');
        return json({wallet,lamports,source:'solana'});
      }
    }catch(error){console.error('Scope balance read:',String(error?.message||error));return json({error:'Could not read this wallet’s SOL balance. Your deposit remains in the wallet; check its address in a Solana explorer and try again.'},502)}
  }
  const endpoints=[env?.SOLANA_RPC_URL,'https://solana-rpc.publicnode.com','https://api.mainnet.solana.com'].filter(Boolean);
  for(const endpoint of [...new Set(endpoints)]){
    try{
      const response=await fetch(endpoint,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({jsonrpc:"2.0",id:1,method,params:method==="getBalance"?[wallet,{commitment:"confirmed"}]:[{commitment:"confirmed"}]}),signal:AbortSignal.timeout(5500)});
      if(!response.ok)throw Error('RPC HTTP '+response.status);
      const data=await response.json();if(data.error)throw Error('RPC JSON error');
      if(method==="getBalance"){
        const lamports=data.result?.value;
        if(!Number.isSafeInteger(lamports)||lamports<0)throw Error('Invalid balance');
        return json({wallet,lamports});
      }
      const blockhash=data.result?.value?.blockhash;
      if(!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(blockhash||''))throw Error('Invalid blockhash');
      return json({blockhash});
    }catch(error){console.warn('Scope RPC read failed',method,new URL(endpoint).hostname,String(error?.message||error));}
  }
  return json({error:'Solana blockhash service unavailable. Your SOL has not moved; please try again later.'},502);
}
async function broadcastWithdrawal(request,env){
  if(request.method!=='POST')return json({error:'POST required'},405);
  const origin=request.headers.get('origin');
  if(origin&&origin!==new URL(request.url).origin)return json({error:'Cross-origin request rejected'},403);
  if(!request.headers.get('content-type')?.startsWith('application/json'))return json({error:'JSON required'},415);
  if(Number(request.headers.get('content-length')||0)>4096)return json({error:'Request too large'},413);
  const auth=await verifiedPrivySubject(request,env);
  if(!auth.subject)return json({error:auth.error},auth.status);
  let body;try{body=await request.json()}catch{return json({error:'Invalid transfer request'},400)}
  const wallet=body?.wallet,destination=body?.destination,lamports=body?.lamports;
  if(!mintPattern.test(wallet||'')||!mintPattern.test(destination||'')||wallet===destination||!Number.isSafeInteger(lamports)||lamports<=0)return json({error:'Invalid withdrawal details'},400);
  let ownership;try{ownership=await verifyScopeWallet({subject:auth.subject,address:wallet,appSecret:env.PRIVY_APP_SECRET})}catch{return json({error:'Wallet ownership verification unavailable. Signed transfer was not submitted by Scope.'},502)}
  if(!ownership.verified)return json({error:'Wallet does not belong to this account'},403);
  let signed;
  try{signed=await validateSignedWithdrawal(body.transaction,{wallet,destination,lamports})}
  catch(error){return json({error:String(error?.message||'Invalid signed withdrawal')},400)}
  const endpoints=[env?.SOLANA_RPC_URL,'https://solana-rpc.publicnode.com','https://api.mainnet.solana.com'].filter(Boolean);
  for(const endpoint of [...new Set(endpoints)]){
    try{
      const response=await fetch(endpoint,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'sendTransaction',params:[signed.transaction,{encoding:'base64',skipPreflight:false,preflightCommitment:'confirmed',maxRetries:0}]}),signal:AbortSignal.timeout(9500)});
      if(!response.ok)throw Error('RPC HTTP '+response.status);
      const data=await response.json();
      if(data.error)throw Error('RPC rejected signed transfer: '+String(data.error.message||'unknown').slice(0,130));
      if(data.result!==signed.signature)throw Error('RPC signature mismatch');
      return json({signature:signed.signature,state:'submitted'});
    }catch(error){console.warn('Scope withdrawal broadcast',new URL(endpoint).hostname,String(error?.message||error));}
  }
  return json({error:'Broadcast could not be confirmed. Check this signature before retrying.',signature:signed.signature,state:'unknown'},502);
}
async function portfolioBalances(request,env){
  if(request.method!=="GET")return json({error:"GET required"},405);
  const wallet=new URL(request.url).searchParams.get("wallet")||"";
  if(!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(wallet))return json({error:"Enter a valid Solana wallet address."},400);
  const methods=[
    {jsonrpc:"2.0",id:1,method:"getBalance",params:[wallet,{commitment:"confirmed"}]},
    {jsonrpc:"2.0",id:2,method:"getTokenAccountsByOwner",params:[wallet,{programId:"TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"},{encoding:"jsonParsed",commitment:"confirmed"}]},
    {jsonrpc:"2.0",id:3,method:"getTokenAccountsByOwner",params:[wallet,{programId:"TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"},{encoding:"jsonParsed",commitment:"confirmed"}]}
  ];
  try{
    const endpoint=env?.SOLANA_RPC_URL||"https://api.mainnet-beta.solana.com";
    const results=[];
    // The public Solana RPC throttles batched indexed calls; keep these separate.
    for(const method of methods){
      const response=await fetch(endpoint,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(method),signal:AbortSignal.timeout(8000)});
      if(!response.ok)throw Error("RPC unavailable");
      results.push(await response.json());
    }
    const byId=new Map(results.map(item=>[item.id,item]));
    if([1,2,3].some(id=>!byId.get(id)||byId.get(id).error))throw Error("RPC unavailable");
    const lamports=byId.get(1).result?.value;
    if(!Number.isSafeInteger(lamports)||lamports<0)throw Error("Invalid balance");
    const holdings=new Map();
    for(const id of [2,3])for(const account of byId.get(id).result?.value||[]){
      const info=account.account?.data?.parsed?.info,amount=info?.tokenAmount;
      if(typeof info?.mint!=="string"||!mintPattern.test(info.mint)||!amount||!/^\d+$/.test(String(amount.amount))||BigInt(amount.amount)===0n)continue;
      const decimals=Number(amount.decimals);
      if(!Number.isInteger(decimals)||decimals<0||decimals>18)continue;
      const previous=holdings.get(info.mint);
      if(previous&&previous.decimals!==decimals)continue;
      holdings.set(info.mint,{decimals,raw:(previous?.raw||0n)+BigInt(amount.amount)});
    }
    const tokens=[...holdings].map(([mint,{decimals,raw}])=>{
      const text=raw.toString().padStart(decimals+1,"0"),split=text.length-decimals;
      const uiAmount=decimals?(text.slice(0,split)+"."+text.slice(split)).replace(/0+$/,"").replace(/\.$/,""):text;
      return{mint,uiAmount};
    }).sort((a,b)=>a.mint.localeCompare(b.mint));
    return json({wallet,sol:lamports/1e9,tokens:tokens.slice(0,200),updatedAt:new Date().toISOString()});
  }catch{return json({error:"Solana balance service is unavailable. Try refreshing shortly."},502)}
}
async function buildManualTrade(request,env){
  if(request.method!=="POST")return json({error:"POST required"},405);
  const origin=request.headers.get("origin");
  if(origin&&origin!==new URL(request.url).origin)return json({error:"Cross-origin requests are unavailable."},403);
  if(!request.headers.get("content-type")?.startsWith("application/json"))return json({error:"JSON required"},415);
  if(Number(request.headers.get("content-length")||0)>2048)return json({error:"Request too large"},413);
  let body;try{body=await request.json()}catch{return json({error:"Invalid request"},400)}
  const wallet=body?.wallet,mint=body?.mint,action=body?.action,amount=Number(body?.amount),slippage=Number(body?.slippage);
  if(typeof wallet!=="string"||!mintPattern.test(wallet)||typeof mint!=="string"||!mintPattern.test(mint)||mint===wallet)return json({error:"Check the wallet and token mint addresses."},400);
  if(action!=="buy"&&action!=="sell")return json({error:"Choose buy or sell."},400);
  if(action==="buy"&&(!Number.isFinite(amount)||amount<.001||amount>5||Math.round(amount*1e9)!==amount*1e9))return json({error:"Buy amount must be 0.001–5 SOL, with at most nine decimals."},400);
  if(action==="sell"&&(!Number.isInteger(amount)||amount<1||amount>100))return json({error:"Sell 1–100% of this token."},400);
  if(!Number.isFinite(slippage)||slippage<.5||slippage>10)return json({error:"Slippage must be 0.5–10%."},400);
  const trade={publicKey:wallet,action,mint,amount:action==="buy"?amount:`${amount}%`,denominatedInSol:action==="buy"?"true":"false",slippage,priorityFee:.00005,pool:"pump"};
  try{
    const response=await fetch("https://pumpportal.fun/api/trade-local",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(trade),signal:AbortSignal.timeout(12000)});
    if(!response.ok)return json({error:"Could not build this trade. Check the token and try again."},502);
    const bytes=new Uint8Array(await response.arrayBuffer());
    if(bytes.length<100||bytes.length>1232)return json({error:"Trade builder returned an invalid transaction."},502);
    const transaction=btoa(String.fromCharCode(...bytes));
    const simulation=await fetch(env?.SOLANA_RPC_URL||"https://api.mainnet-beta.solana.com",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({jsonrpc:"2.0",id:1,method:"simulateTransaction",params:[transaction,{encoding:"base64",sigVerify:false,replaceRecentBlockhash:true,commitment:"confirmed"}]}),signal:AbortSignal.timeout(9000)});
    if(!simulation.ok)throw Error("RPC unavailable");
    const result=await simulation.json();
    if(result.error)throw Error("RPC unavailable");
    if(result.result?.value?.err)return json({error:"Trade preflight failed. Check the token pool, wallet balance and slippage. No transaction was sent."},422);
    if(!result.result?.value)return json({error:"Trade preflight was incomplete. No transaction was sent."},502);
    return json({transaction,wallet,mint,action,amount,slippage,priorityFee:trade.priorityFee,pool:"pump",preflight:true});
  }catch{return json({error:"Trade builder is unavailable. No transaction was sent."},502)}
}
async function manualTradeStatus(request,env){
  if(request.method!=="GET")return json({error:"GET required"},405);
  const signature=new URL(request.url).searchParams.get("signature")||"";
  if(!/^[1-9A-HJ-NP-Za-km-z]{80,90}$/.test(signature))return json({error:"Invalid transaction signature."},400);
  const endpoints=[env?.SOLANA_RPC_URL,'https://solana-rpc.publicnode.com','https://api.mainnet.solana.com'].filter(Boolean);
  for(const endpoint of [...new Set(endpoints)]){
    try{
      const response=await fetch(endpoint,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'getSignatureStatuses',params:[[signature],{searchTransactionHistory:true}]}),signal:AbortSignal.timeout(6500)});
      if(!response.ok)throw Error('RPC unavailable');
      const data=await response.json();if(data.error)throw Error('RPC error');
      const status=data.result?.value?.[0];
      return json({signature,state:status?.err?'failed':status?.confirmationStatus||'pending',error:status?.err||null});
    }catch(error){console.warn('Scope status read',new URL(endpoint).hostname,String(error?.message||error));}
  }
  return json({error:'Confirmation status unavailable. Check the transaction explorer.',signature},502);
}
async function runD1Batch(db,statements){for(let i=0;i<statements.length;i+=50)await db.batch(statements.slice(i,i+50))}
export async function persistCampaignEvidence(db,evidence){
  if(!db?.prepare||!db?.batch)return {state:'unavailable',storedLaunches:0,storedTrades:0};
  const runId=crypto.randomUUID(),launches=evidence.events.filter(x=>x.kind==='launch'),trades=evidence.events.filter(x=>x.kind==='trade'&&x.signature);
  const statements=[];
  for(const x of launches)statements.push(db.prepare('INSERT OR IGNORE INTO campaign_launches (mint, observed_at, name, symbol, launch_market_cap_sol, run_id) VALUES (?, ?, ?, ?, ?, ?)').bind(x.mint,x.at,x.name||'',x.symbol||'',x.marketCapSol??null,runId));
  for(const x of trades)statements.push(db.prepare('INSERT OR IGNORE INTO campaign_trades (signature, mint, observed_at, side, price_sol, sol_amount, token_amount, market_cap_sol, trader, run_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').bind(x.signature,x.mint,x.at,x.side,x.priceSol,x.solAmount,x.tokenAmount,x.marketCapSol??null,x.trader||'',runId));
  await runD1Batch(db,statements);
  await db.prepare('INSERT INTO campaign_runs (id, started_at, finished_at, reason, token_count, trade_count, persistence_state) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(runId,Date.parse(evidence.startedAt),Date.parse(evidence.finishedAt),evidence.reason,evidence.tokenCount,evidence.tradeCount,'stored').run();
  return {state:'stored',runId,storedLaunches:launches.length,storedTrades:trades.length};
}
async function readCampaignStatus(db){
  if(!db?.prepare)return {available:false,targetLaunches:500,launches:0,trades:0,runs:0,progressPercent:0};
  const [launches,trades,runs,latest]=await Promise.all([
    db.prepare('SELECT COUNT(*) AS count, MIN(observed_at) AS firstAt, MAX(observed_at) AS lastAt FROM campaign_launches').first(),
    db.prepare('SELECT COUNT(*) AS count FROM campaign_trades').first(),
    db.prepare('SELECT COUNT(*) AS count FROM campaign_runs').first(),
    db.prepare('SELECT id, started_at AS startedAt, finished_at AS finishedAt, reason, token_count AS tokenCount, trade_count AS tradeCount FROM campaign_runs ORDER BY started_at DESC LIMIT 1').first()
  ]),launchCount=Number(launches?.count||0);
  return {available:true,targetLaunches:500,launches:launchCount,trades:Number(trades?.count||0),runs:Number(runs?.count||0),progressPercent:Math.min(100,launchCount/5),firstObservedAt:launches?.firstAt||null,lastObservedAt:launches?.lastAt||null,latestRun:latest||null,complete:launchCount>=500};
}
async function readCampaignRows(db,sql,pageSize=1000,maxRows=200000){const rows=[];for(let offset=0;offset<maxRows;offset+=pageSize){const page=await db.prepare(sql+' LIMIT ? OFFSET ?').bind(pageSize,offset).all(),batch=page?.results||[];rows.push(...batch);if(batch.length<pageSize)break}return rows}
const FORWARD_FREEZE_LAUNCHES=283,forwardCandidateRules=[
  {id:'time45',label:'45s full exit',entryRule:'c45-d4000-raw-x112',exitRule:'time45'},
  {id:'target15',label:'1.5× target / −35% stop',entryRule:'c45-d4000-raw-x112',exitRule:'tp15-sl35'},
  {id:'stagedTrail',label:'50% at 1.25× / rest 20% trail',entryRule:'c45-d4000-raw-x112',exitRule:'scale125-trail20'}
];
function bootstrapNet(outcomes,seedText){if(!outcomes?.length)return {attempts:0,probabilityPositive:0,p05:0,p50:0,p95:0,method:'pending'};let seed=[...seedText].reduce((s,c)=>(s*31+c.charCodeAt(0))>>>0,2166136261),rand=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296),totals=[];for(let round=0;round<1200;round++){let total=0;for(let i=0;i<outcomes.length;i++)total+=outcomes[Math.floor(rand()*outcomes.length)];totals.push(total)}totals.sort((a,b)=>a-b);const q=p=>totals[Math.min(totals.length-1,Math.floor((totals.length-1)*p))];return {attempts:outcomes.length,probabilityPositive:totals.filter(x=>x>0).length/totals.length,p05:q(.05),p50:q(.5),p95:q(.95),method:'1,200 deterministic attempt-level bootstrap resamples; unresolved exits charged as full stake losses'}}
async function analyzeCampaign(db){
  const status=await readCampaignStatus(db);if(!status.available)return {...status,comparisons:0,leaders:[],sellTiming:[]};
  const [launches,trades]=await Promise.all([
    readCampaignRows(db,'SELECT mint, observed_at AS at, name, symbol, launch_market_cap_sol AS marketCapSol FROM campaign_launches ORDER BY observed_at'),
    readCampaignRows(db,'SELECT mint, observed_at AS at, side, price_sol AS priceSol, sol_amount AS solAmount, token_amount AS tokenAmount, market_cap_sol AS marketCapSol, signature, trader FROM campaign_trades ORDER BY observed_at')
  ]),splitIndex=Math.max(1,Math.floor(launches.length*.7)),developmentLaunches=launches.slice(0,splitIndex),holdoutLaunches=launches.slice(splitIndex),eventsFor=sample=>{const mints=new Set(sample.map(x=>x.mint));return [...sample.map(x=>({kind:'launch',...x})),...trades.filter(x=>mints.has(x.mint)).map(x=>({kind:'trade',...x}))]},development=compareSample(eventsFor(developmentLaunches)),holdout=compareSample(eventsFor(holdoutLaunches)),minDevelopmentClosed=Math.max(5,Math.floor(developmentLaunches.length*.08)),minHoldoutClosed=Math.max(3,Math.floor(holdoutLaunches.length*.05));
  const rank=x=>({...x,winRate:x.closed?x.wins/x.closed:0,netPerClose:x.closed?x.netSol/x.closed:0}),holdoutById=new Map(holdout.map(x=>[x.entryRule+'|'+x.exitRule,x])),eligible=development.filter(x=>x.closed>=minDevelopmentClosed),selected=eligible.slice().sort((a,b)=>b.netSol-a.netSol||b.closed-a.closed),leaders=selected.slice(0,24).map(x=>({development:rank(x),holdout:rank(holdoutById.get(x.entryRule+'|'+x.exitRule))})),exitRules=[...new Set(development.map(x=>x.exitRule))];
  const exitFamilies=exitRules.map(exitRule=>{const best=selected.find(x=>x.exitRule===exitRule),test=best&&holdoutById.get(best.entryRule+'|'+best.exitRule);return {exitRule,label:best?.exitLabel||exitRule,development:best?rank(best):null,holdout:test?rank(test):null,holdoutReady:Boolean(test&&test.closed>=minHoldoutClosed)}}),familyByRule=new Map(exitFamilies.map(x=>[x.exitRule,x])),sellTiming=['time5','time10','time15','time20','time30','time45','time60'].map(exitRule=>familyByRule.get(exitRule)),forwardLaunches=launches.slice(FORWARD_FREEZE_LAUNCHES),forwardEvents=eventsFor(forwardLaunches),candidateKeys=new Set(forwardCandidateRules.map(x=>x.entryRule+'|'+x.exitRule)),scenarioDefs=[{id:'base',label:'3% per side',adverse:.03},{id:'hostile',label:'5% per side',adverse:.05},{id:'severe',label:'8% per side',adverse:.08}],scenarioMaps=scenarioDefs.map(scenario=>({scenario,map:new Map(compareSample(forwardEvents,{adverse:scenario.adverse,collectOutcomes:candidateKeys}).map(x=>[x.entryRule+'|'+x.exitRule,x]))})),cleanRank=x=>{const {outcomes,...clean}=x;return rank(clean)},hostileMap=scenarioMaps.find(x=>x.scenario.id==='hostile').map,forwardCandidates=forwardCandidateRules.map(candidate=>{const key=candidate.entryRule+'|'+candidate.exitRule,hostile=hostileMap.get(key);return {...candidate,result:cleanRank(hostile),uncertainty:bootstrapNet(hostile.outcomes,candidate.id),costSensitivity:scenarioMaps.map(({scenario,map})=>({...scenario,result:cleanRank(map.get(key))}))}});
  return {...status,comparisons:development.length,minDevelopmentClosed,minHoldoutClosed,split:{developmentLaunches:developmentLaunches.length,holdoutLaunches:holdoutLaunches.length},leaders,sellTiming,exitFamilies,forwardValidation:{frozenAfterLaunch:FORWARD_FREEZE_LAUNCHES,launches:forwardLaunches.length,targetLaunches:500-FORWARD_FREEZE_LAUNCHES,minClosedForDecision:20,candidates:forwardCandidates,status:forwardLaunches.length>=500-FORWARD_FREEZE_LAUNCHES?'complete':'collecting'},method:'Models are selected only on the earliest 70% of launches, then scored on the untouched latest 30% with identical adverse-fill and friction assumptions. The frozen launches 284–500 were evaluated after their collection; because the tape has since been inspected, a new prospective sample is required for a promotion decision.'};
}
const GEN2_FOLDS=6,GEN2_STAKE=.002,GEN2_FRICTION=.00002;
function generation2Policies(){
  const entries=[],entryCaps=[32,36,45],delays=[500,1000,2000,3000,5000,8000],chases=[1.08,1.15,1.25],gates=[
    {id:'p50-b1-f0',pressure:.5,buyers:1,flow:.005,concentration:1,label:'≥50% buy · 1 buyer · ≥0.005 SOL flow'},
    {id:'p58-b3-f5',pressure:.58,buyers:3,flow:.05,concentration:.85,label:'≥58% buy · 3 buyers · ≥0.05 SOL flow · ≤85% whale'},
    {id:'p62-b4-f8',pressure:.62,buyers:4,flow:.08,concentration:.75,label:'≥62% buy · 4 buyers · ≥0.08 SOL flow · ≤75% whale'},
    {id:'p66-b5-f12',pressure:.66,buyers:5,flow:.12,concentration:.65,label:'≥66% buy · 5 buyers · ≥0.12 SOL flow · ≤65% whale'}
  ];
  for(const entryCap of entryCaps)for(const delayMs of delays)for(const gate of gates)for(const maxChase of chases)entries.push({id:'e'+entryCap+'-d'+delayMs+'-'+gate.id+'-x'+Math.round(maxChase*100),entryCap,delayMs,maxChase,...gate,label:'≤'+entryCap+' SOL entry · '+(delayMs/1000).toFixed(delayMs%1000?1:0)+'s · '+gate.label+' · ≤'+Math.round((maxChase-1)*100)+'% chase'});
  const exits=[
    {id:'t1',label:'1s full exit',holdMs:1000},{id:'t2',label:'2s full exit',holdMs:2000},{id:'t3',label:'3s full exit',holdMs:3000},{id:'t5',label:'5s full exit',holdMs:5000},{id:'t8',label:'8s full exit',holdMs:8000},{id:'t10',label:'10s full exit',holdMs:10000},{id:'t15',label:'15s full exit',holdMs:15000},{id:'t20',label:'20s full exit',holdMs:20000},{id:'t30',label:'30s full exit',holdMs:30000},{id:'t45',label:'45s full exit',holdMs:45000},
    {id:'tp112-sl10',label:'1.12× target / −10% stop',holdMs:15000,target:1.12,stop:.9},{id:'tp120-sl15',label:'1.20× target / −15% stop',holdMs:20000,target:1.2,stop:.85},{id:'tp135-sl25',label:'1.35× target / −25% stop',holdMs:30000,target:1.35,stop:.75},{id:'tp150-sl35',label:'1.50× target / −35% stop',holdMs:45000,target:1.5,stop:.65},
    {id:'tr10-a112',label:'10% trail after 1.12× / −12% stop',holdMs:30000,trail:.1,activate:1.12,stop:.88},{id:'tr15-a115',label:'15% trail after 1.15× / −20% stop',holdMs:45000,trail:.15,activate:1.15,stop:.8},{id:'tr20-a120',label:'20% trail after 1.20× / −30% stop',holdMs:60000,trail:.2,activate:1.2,stop:.7},
    {id:'sc115-tr10',label:'50% at 1.15× / rest 10% trail',holdMs:45000,scaleTarget:1.15,scaleWeight:.5,trail:.1,activate:1.15,stop:.85},{id:'sc125-tr15',label:'50% at 1.25× / rest 15% trail',holdMs:60000,scaleTarget:1.25,scaleWeight:.5,trail:.15,activate:1.2,stop:.75},{id:'sc150-t30',label:'50% at 1.50× / rest 30s',holdMs:30000,scaleTarget:1.5,scaleWeight:.5,stop:.7}
  ];
  return {entries,exits};
}
function gen2Exit(path,entry,policy){
  const after=path.filter(t=>t.at>entry.at&&t.at<=entry.at+policy.holdMs+2500);let high=entry.priceSol,scaled=null;
  for(const tick of after){const ratio=tick.priceSol/entry.priceSol;high=Math.max(high,tick.priceSol);if(policy.scaleTarget&&!scaled&&ratio>=policy.scaleTarget)scaled=tick;if(policy.target&&ratio>=policy.target)return [{tick,weight:1}];if(policy.stop&&ratio<=policy.stop)return scaled?[{tick:scaled,weight:policy.scaleWeight},{tick,weight:1-policy.scaleWeight}]:[{tick,weight:1}];if(policy.trail&&high>=entry.priceSol*(policy.activate||1.15)&&tick.priceSol<=high*(1-policy.trail))return scaled?[{tick:scaled,weight:policy.scaleWeight},{tick,weight:1-policy.scaleWeight}]:[{tick,weight:1}]}
  const timed=after.find(t=>t.at>=entry.at+policy.holdMs);if(!timed)return null;return scaled?[{tick:scaled,weight:policy.scaleWeight},{tick:timed,weight:1-policy.scaleWeight}]:[{tick:timed,weight:1}];
}
function gen2Net(grossRatio,adverse){return grossRatio===null?-(GEN2_STAKE+GEN2_FRICTION):GEN2_STAKE*(grossRatio*((1-adverse)/(1+adverse))-1)-GEN2_FRICTION}
function gen2BlockBootstrap(folds,seedText){let seed=[...seedText].reduce((s,c)=>(s*33+c.charCodeAt(0))>>>0,2166136261),rand=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296),totals=[];for(let r=0;r<1600;r++){let total=0;for(let i=0;i<folds.length;i++)total+=folds[Math.floor(rand()*folds.length)].net5;totals.push(total)}totals.sort((a,b)=>a-b);const q=p=>totals[Math.floor((totals.length-1)*p)];return {resamples:1600,probabilityPositive:totals.filter(x=>x>0).length/totals.length,p05:q(.05),p50:q(.5),p95:q(.95),unit:'chronological launch block'} }
function gen2BreakEven(outcomes){let lo=0,hi=.2;for(let i=0;i<26;i++){const mid=(lo+hi)/2,net=outcomes.reduce((s,x)=>s+gen2Net(x,mid),0);if(net>0)lo=mid;else hi=mid}return lo}
async function analyzeGeneration2(db){
  const [launches,trades]=await Promise.all([
    readCampaignRows(db,'SELECT mint, observed_at AS at, name, symbol, launch_market_cap_sol AS marketCapSol, run_id AS runId FROM campaign_launches ORDER BY observed_at'),
    readCampaignRows(db,'SELECT mint, observed_at AS at, side, price_sol AS priceSol, sol_amount AS solAmount, market_cap_sol AS marketCapSol, trader FROM campaign_trades ORDER BY observed_at')
  ]),paths=new Map(),seen=new Set(),eligible=[];
  for(const trade of trades){if(!(trade.priceSol>0))continue;if(!paths.has(trade.mint))paths.set(trade.mint,[]);paths.get(trade.mint).push(trade)}for(const path of paths.values())path.sort((a,b)=>a.at-b.at);
  for(let i=0;i<launches.length;i++){const launch=launches[i],identity=(String(launch.name||'')+'|'+String(launch.symbol||'')).toLowerCase().replace(/[^a-z0-9|]/g,'');if(!identity||seen.has(identity))continue;seen.add(identity);eligible.push({...launch,fold:Math.min(GEN2_FOLDS-1,Math.floor(i/Math.max(1,launches.length/GEN2_FOLDS)))})}
  const {entries,exits}=generation2Policies(),results=[];
  for(const entryPolicy of entries){
    const entrants=[];
    for(const launch of eligible){if(!(launch.marketCapSol>0&&launch.marketCapSol<=entryPolicy.entryCap))continue;const path=paths.get(launch.mint)||[],first=path[0];if(!first)continue;const signal=path.filter(t=>t.at>=launch.at&&t.at<=launch.at+entryPolicy.delayMs),buys=signal.filter(t=>t.side!=='sell'),buySol=buys.reduce((s,t)=>s+(Number(t.solAmount)||0),0),sellSol=signal.filter(t=>t.side==='sell').reduce((s,t)=>s+(Number(t.solAmount)||0),0),pressure=buySol+sellSol?buySol/(buySol+sellSol):0,buyerFlow=new Map();for(const t of buys)buyerFlow.set(t.trader||'',(buyerFlow.get(t.trader||'')||0)+(Number(t.solAmount)||0));const buyers=[...buyerFlow.keys()].filter(Boolean).length,concentration=buySol?Math.max(0,...buyerFlow.values())/buySol:1;if(pressure<entryPolicy.pressure||buyers<entryPolicy.buyers||buySol<entryPolicy.flow||concentration>entryPolicy.concentration)continue;const entry=path.find(t=>t.at>=launch.at+entryPolicy.delayMs&&t.at<=launch.at+entryPolicy.delayMs+2500);if(!entry)continue;const entryCap=Number(entry.marketCapSol)||Number(launch.marketCapSol);if(entryCap>entryPolicy.entryCap||entry.priceSol>first.priceSol*entryPolicy.maxChase)continue;entrants.push({launch,path,entry})}
    for(const exitPolicy of exits){const outcomes=[],folds=Array.from({length:GEN2_FOLDS},(_,index)=>({index,attempts:0,closed:0,wins:0,net5:0,net8:0}));let closed=0,unresolved=0,wins=0,net5=0,net8=0;for(const item of entrants){const legs=gen2Exit(item.path,item.entry,exitPolicy),gross=legs?legs.reduce((s,x)=>s+x.weight*(x.tick.priceSol/item.entry.priceSol),0):null,a=gen2Net(gross,.05),b=gen2Net(gross,.08),fold=folds[item.launch.fold];outcomes.push(gross);fold.attempts++;fold.net5+=a;fold.net8+=b;net5+=a;net8+=b;if(legs){closed++;fold.closed++;if(a>0){wins++;fold.wins++}}else unresolved++}if(!outcomes.length)continue;const positiveFolds=folds.filter(x=>x.attempts&&x.net5>0).length,worstFold=Math.min(...folds.filter(x=>x.attempts).map(x=>x.net5)),bootstrap=gen2BlockBootstrap(folds,entryPolicy.id+'|'+exitPolicy.id),breakEven=gen2BreakEven(outcomes),robust=outcomes.length>=24&&closed>=20&&positiveFolds>=4&&net5>0&&net8>=0&&bootstrap.p05>0&&breakEven>=.08,score=net5+net8*.65+bootstrap.p05*2+Math.min(0,worstFold)*1.4;results.push({id:entryPolicy.id+'|'+exitPolicy.id,entry:entryPolicy,exit:exitPolicy,attempts:outcomes.length,closed,unresolved,wins,winRate:closed?wins/closed:0,net5,net8,positiveFolds,worstFold,breakEvenAdverse:breakEven,bootstrap,folds,robust,score})}
  }
  const sampled=results.filter(x=>x.attempts>=24&&x.closed>=20);sampled.sort((a,b)=>Number(b.robust)-Number(a.robust)||b.score-a.score||b.net8-a.net8);const top=sampled.slice(0,18),robust=sampled.filter(x=>x.robust),mostObserved=results.slice().sort((a,b)=>b.attempts-a.attempts||b.closed-a.closed)[0]||null;return {buildId:BUILD_ID,generation:2,status:'discovery',launches:launches.length,trades:trades.length,formulas:entries.length*exits.length,entryPolicies:entries.length,exitPolicies:exits.length,folds:GEN2_FOLDS,sampledFormulas:sampled.length,maxAttempts:mostObserved?.attempts||0,unresolvedTreatment:'full stake plus fixed friction is charged as a loss',costs:{hostile:.05,severe:.08,fixedFrictionSol:GEN2_FRICTION,stakeSol:GEN2_STAKE},robustCount:robust.length,leader:top[0]||null,top,prospective:{required:true,targetLaunches:250,collected:0,parametersFrozen:false},capitalUnlocked:false,interpretation:robust.length?'Discovery produced candidates that clear the internal robustness contract. They are not approved until frozen and tested on a new prospective sample.':top.length?'No adequately sampled candidate clears the full Generation 2 robustness contract. The leading formula is descriptive only.':'No formula reached the minimum 24 attempts and 20 closed exits; there is no Generation 2 leader yet.',method:'4,320 curated formulas; rankings require at least 24 attempts and 20 closed exits; six chronological blocks; unresolved exits charged as full losses; 5% and 8% adverse fills; block bootstrap; all '+launches.length+' launches are discovery data because they have already been inspected.'};
}
function generation3Policies(){const entries=[],caps=[32,36,45],delays=[500,1000,2000,3000],accelerations=[1,1.2,1.5],buyers=[1,2],pullbacks=[0,.02,.04];for(const cap of caps)for(const delayMs of delays)for(const acceleration of accelerations)for(const minBuyers of buyers)for(const pullback of pullbacks)entries.push({id:'g3-c'+cap+'-d'+delayMs+'-a'+Math.round(acceleration*10)+'-b'+minBuyers+'-p'+Math.round(pullback*100),cap,delayMs,acceleration,minBuyers,pullback,label:'≤'+cap+' SOL · '+(delayMs/1000)+'s · ≥'+acceleration.toFixed(1)+'× flow acceleration · '+minBuyers+' buyer'+(minBuyers===1?'':'s')+' · '+Math.round(pullback*100)+'% pullback'});const exits=[500,1000,2000,3000,5000,8000].map(holdMs=>({id:'g3-t'+holdMs,label:(holdMs/1000)+'s exit',holdMs}));return{entries,exits}}
async function analyzeGeneration3(db){
  const [launches,trades]=await Promise.all([readCampaignRows(db,'SELECT mint, observed_at AS at, name, symbol, launch_market_cap_sol AS marketCapSol FROM campaign_launches ORDER BY observed_at'),readCampaignRows(db,'SELECT mint, observed_at AS at, side, price_sol AS priceSol, sol_amount AS solAmount, market_cap_sol AS marketCapSol, trader FROM campaign_trades ORDER BY observed_at')]),paths=new Map(),eligible=[],seen=new Set();for(const trade of trades){if(!(trade.priceSol>0))continue;if(!paths.has(trade.mint))paths.set(trade.mint,[]);paths.get(trade.mint).push(trade)}for(const path of paths.values())path.sort((a,b)=>a.at-b.at);for(let i=0;i<launches.length;i++){const launch=launches[i],identity=(String(launch.name||'')+'|'+String(launch.symbol||'')).toLowerCase().replace(/[^a-z0-9|]/g,'');if(!identity||seen.has(identity))continue;seen.add(identity);eligible.push({...launch,fold:Math.min(GEN2_FOLDS-1,Math.floor(i/Math.max(1,launches.length/GEN2_FOLDS)))})}
  const oracleOutcomes=[];for(const launch of eligible){const path=paths.get(launch.mint)||[],entry=path.find(t=>t.at>=launch.at+1000&&t.at<=launch.at+3500);if(!entry)continue;const future=path.filter(t=>t.at>entry.at&&t.at<=entry.at+15000);if(!future.length)continue;oracleOutcomes.push(gen2Net(Math.max(...future.map(t=>t.priceSol/entry.priceSol)),.05))}oracleOutcomes.sort((a,b)=>a-b);const oracle={attempts:oracleOutcomes.length,positive:oracleOutcomes.filter(x=>x>0).length,positiveRate:oracleOutcomes.length?oracleOutcomes.filter(x=>x>0).length/oracleOutcomes.length:0,medianNet:oracleOutcomes.length?oracleOutcomes[Math.floor(oracleOutcomes.length*.5)]:0,p90Net:oracleOutcomes.length?oracleOutcomes[Math.floor(oracleOutcomes.length*.9)]:0,note:'Impossible 15-second best-exit ceiling using hindsight; diagnostic only, never tradable.'};
  const {entries,exits}=generation3Policies(),results=[];for(const policy of entries){const entrants=[];for(const launch of eligible){if(!(launch.marketCapSol>0&&launch.marketCapSol<=policy.cap))continue;const path=paths.get(launch.mint)||[],first=path[0];if(!first)continue;const signal=path.filter(t=>t.at>=launch.at&&t.at<=launch.at+policy.delayMs),mid=launch.at+policy.delayMs/2,buys=signal.filter(t=>t.side!=='sell'),sells=signal.filter(t=>t.side==='sell'),early=buys.filter(t=>t.at<mid).reduce((s,t)=>s+(Number(t.solAmount)||0),0),late=buys.filter(t=>t.at>=mid).reduce((s,t)=>s+(Number(t.solAmount)||0),0),sellSol=sells.reduce((s,t)=>s+(Number(t.solAmount)||0),0),buyers=new Set(buys.map(t=>t.trader).filter(Boolean)).size,acceleration=late/Math.max(.002,early),pressure=early+late+sellSol?(early+late)/(early+late+sellSol):0;if(buyers<policy.minBuyers||acceleration<policy.acceleration||pressure<.5)continue;const entry=path.find(t=>t.at>=launch.at+policy.delayMs&&t.at<=launch.at+policy.delayMs+2000);if(!entry)continue;const entryCap=Number(entry.marketCapSol)||Number(launch.marketCapSol),high=Math.max(...signal.map(t=>t.priceSol),entry.priceSol);if(entryCap>policy.cap||entry.priceSol>first.priceSol*1.25||entry.priceSol>high*(1-policy.pullback))continue;entrants.push({launch,path,entry})}
    for(const exit of exits){const folds=Array.from({length:GEN2_FOLDS},(_,index)=>({index,attempts:0,closed:0,wins:0,net5:0,net8:0})),outcomes=[];let closed=0,unresolved=0,wins=0,net5=0,net8=0;for(const item of entrants){const tick=item.path.find(t=>t.at>=item.entry.at+exit.holdMs&&t.at<=item.entry.at+exit.holdMs+2500),gross=tick?tick.priceSol/item.entry.priceSol:null,a=gen2Net(gross,.05),b=gen2Net(gross,.08),fold=folds[item.launch.fold];outcomes.push(gross);fold.attempts++;fold.net5+=a;fold.net8+=b;net5+=a;net8+=b;if(tick){closed++;fold.closed++;if(a>0){wins++;fold.wins++}}else unresolved++}if(!outcomes.length)continue;const activeFolds=folds.filter(x=>x.attempts),positiveFolds=activeFolds.filter(x=>x.net5>0).length,worstFold=Math.min(...activeFolds.map(x=>x.net5)),bootstrap=gen2BlockBootstrap(folds,policy.id+'|'+exit.id),breakEven=gen2BreakEven(outcomes),robust=outcomes.length>=24&&closed>=20&&positiveFolds>=4&&net5>0&&net8>=0&&bootstrap.p05>0&&breakEven>=.08,score=net5+net8*.65+bootstrap.p05*2+Math.min(0,worstFold)*1.4;results.push({id:policy.id+'|'+exit.id,entry:policy,exit,attempts:outcomes.length,closed,unresolved,wins,winRate:closed?wins/closed:0,net5,net8,positiveFolds,worstFold,breakEvenAdverse:breakEven,bootstrap,folds,robust,score})}}
  const sampled=results.filter(x=>x.attempts>=24&&x.closed>=20);sampled.sort((a,b)=>Number(b.robust)-Number(a.robust)||b.score-a.score||b.net8-a.net8);const robust=sampled.filter(x=>x.robust),leader=sampled[0]||null,maxAttempts=results.reduce((m,x)=>Math.max(m,x.attempts),0);return{buildId:BUILD_ID,generation:3,status:'discovery',launches:launches.length,trades:trades.length,formulas:entries.length*exits.length,entryPolicies:entries.length,exitPolicies:exits.length,sampledFormulas:sampled.length,maxAttempts,robustCount:robust.length,leader,top:sampled.slice(0,18),oracle,capitalUnlocked:false,prospective:{required:true,targetLaunches:250,collected:0,parametersFrozen:false},interpretation:robust.length?'Acceleration and pullback candidates cleared the internal discovery contract; prospective evidence is still required.':oracle.positiveRate>.1?'The tape contains hindsight opportunity, but no acceleration/pullback rule captured it robustly after costs. Selection remains the research problem.':'Even the hindsight ceiling rarely survives costs. Execution friction or venue choice is likely the binding problem.',method:'1,296 acceleration/pullback systems across six chronological blocks. Rankings require 24 attempts and 20 closed exits. Unresolved exits are full losses. The oracle statistic uses the best future tick with hindsight and is diagnostic only.'}
}
// Discovery replay: later prints are liquidity proxies, never executable quotes.
export function replayGeneration4(events){
  const launches=events.filter(x=>x.kind==='launch').sort((a,b)=>a.at-b.at),paths=new Map(),seen=new Set();
  for(const tick of events){if(tick.kind!=='trade'||!(tick.priceSol>0))continue;if(!paths.has(tick.mint))paths.set(tick.mint,[]);paths.get(tick.mint).push(tick)}
  for(const path of paths.values())path.sort((a,b)=>a.at-b.at);
  const eligible=launches.map((x,i)=>({...x,fold:Math.min(GEN2_FOLDS-1,Math.floor(i*GEN2_FOLDS/Math.max(1,launches.length)))})).filter(x=>{const key=(String(x.name||'')+'|'+String(x.symbol||'')).toLowerCase().replace(/[^a-z0-9|]/g,'');if(!key||seen.has(key))return false;seen.add(key);return true});
  const entries=[];for(const cap of [30,32,36])for(const delayMs of [1000,2500,5000])for(const pressure of [.5,.6,.7])entries.push({cap,delayMs,pressure,id:`c${cap}-d${delayMs}-p${Math.round(pressure*100)}`});
  const exits=[2000,5000,10000,20000].map(holdMs=>({holdMs,id:`t${holdMs}`})),results=[];
  for(const policy of entries){const entrants=[];let noEntry=0,noSignal=0;
    for(const launch of eligible){const path=paths.get(launch.mint)||[];if(!(launch.marketCapSol>0&&launch.marketCapSol<=policy.cap))continue;
      const signal=path.filter(t=>t.at>=launch.at&&t.at<=launch.at+policy.delayMs),buy=signal.filter(t=>t.side==='buy').reduce((s,t)=>s+(Number(t.solAmount)||0),0),sell=signal.filter(t=>t.side==='sell').reduce((s,t)=>s+(Number(t.solAmount)||0),0);
      if(!buy||buy/(buy+sell)<policy.pressure){noSignal++;continue}
      const arrival=launch.at+policy.delayMs+350,entry=path.find(t=>t.side==='buy'&&t.at>=arrival&&t.at<=arrival+1800&&Number(t.solAmount)>=GEN2_STAKE);
      if(!entry||Number(entry.marketCapSol)>policy.cap){noEntry++;continue}
      entrants.push({launch,path,entry})
    }
    for(const exitPolicy of exits){const folds=Array.from({length:GEN2_FOLDS},(_,index)=>({index,attempts:0,closed:0,net5:0,net8:0}));let net5=0,net8=0,closed=0,unresolved=0,late=0;
      for(const {launch,path,entry} of entrants){const signalAt=entry.at+exitPolicy.holdMs,exit=path.find(t=>t.side==='buy'&&t.at>=signalAt+350&&t.at<=signalAt+2550&&Number(t.solAmount)>=GEN2_STAKE),fold=folds[launch.fold],gross=exit?exit.priceSol/entry.priceSol:null,a=gen2Net(gross,.05),b=gen2Net(gross,.08);net5+=a;net8+=b;fold.attempts++;fold.net5+=a;fold.net8+=b;if(exit){closed++;fold.closed++;late+=exit.at-signalAt}else unresolved++}
      const active=folds.filter(f=>f.attempts),boot=active.length?gen2BlockBootstrap(active,'g4-'+policy.id+'-'+exitPolicy.id):null,positiveFolds=active.filter(f=>f.net5>0).length,attempts=entrants.length;
      results.push({id:policy.id+'|'+exitPolicy.id,entry:policy,exit:exitPolicy,attempts,closed,unresolved,noEntry,noSignal,net5,net8,positiveFolds,averageExitDelayMs:closed?Math.round(late/closed):null,bootstrapP05:boot?.p05??null,robust:attempts>=24&&closed>=20&&active.length===GEN2_FOLDS&&positiveFolds>=4&&net5>0&&net8>=0&&boot.p05>0})
    }
  }
  const sampled=results.filter(r=>r.attempts>=24&&r.closed>=20).sort((a,b)=>Number(b.robust)-Number(a.robust)||b.net5-a.net5);return{buildId:BUILD_ID,generation:4,status:'discovery',launches:launches.length,trades:[...paths.values()].reduce((n,p)=>n+p.length,0),formulas:results.length,sampledFormulas:sampled.length,robustCount:sampled.filter(r=>r.robust).length,mostObserved:results.slice().sort((a,b)=>b.attempts-a.attempts)[0]||null,leader:sampled[0]||null,top:sampled.slice(0,12),costs:{stakeSol:GEN2_STAKE,fixedFrictionSol:GEN2_FRICTION,hostileAdversePerSide:.05,severeAdversePerSide:.08,entryLatencyMs:350,exitLatencyMs:350},capitalUnlocked:false,limitations:['Observed buy prints proxy available liquidity; they are not executable quotes or our fills','No transaction simulation, landed-fill reconciliation, or independent prospective holdout','Missing exit print within 2.2 seconds is charged as full stake loss','All historical launches are discovery data'],method:'108 fixed cap/flow/hold policies; signals use prior events; first later buy print after 350ms latency and at least 0.002 SOL observed size proxies each fill; 5% and 8% adverse fill on both sides; six chronological blocks and 1,600 block resamples.'}
}
async function analyzeGeneration4(db){if(!db?.prepare)return replayGeneration4([]);const [launches,trades]=await Promise.all([readCampaignRows(db,'SELECT mint, observed_at AS at, name, symbol, launch_market_cap_sol AS marketCapSol FROM campaign_launches ORDER BY observed_at'),readCampaignRows(db,'SELECT mint, observed_at AS at, side, price_sol AS priceSol, sol_amount AS solAmount, market_cap_sol AS marketCapSol FROM campaign_trades ORDER BY observed_at')]);return replayGeneration4([...launches.map(x=>({...x,kind:'launch'})),...trades.map(x=>({...x,kind:'trade'}))])}
const SWEEP_SIZES=[.002,.005,.01,.02],SWEEP_VENUE_FEE=.005;
const SWEEP_RULES=[{id:'early',cap:30,delayMs:1000,pressure:.5},{id:'balanced',cap:32,delayMs:2500,pressure:.6},{id:'selective',cap:36,delayMs:5000,pressure:.7}];
// Trade prints reveal activity and an observed price, not executable depth.
export function replaySizeSweep(events){
  const launches=events.filter(x=>x.kind==='launch').sort((a,b)=>a.at-b.at),paths=new Map(),seen=new Set();
  for(const tick of events){if(tick.kind!=='trade'||!(tick.priceSol>0))continue;if(!paths.has(tick.mint))paths.set(tick.mint,[]);paths.get(tick.mint).push(tick)}
  for(const path of paths.values())path.sort((a,b)=>a.at-b.at);
  const eligible=launches.map((x,i)=>({...x,fold:Math.min(GEN2_FOLDS-1,Math.floor(i*GEN2_FOLDS/Math.max(1,launches.length)))})).filter(x=>{const key=(String(x.name||'')+'|'+String(x.symbol||'')).toLowerCase().replace(/[^a-z0-9|]/g,'');if(!key||seen.has(key))return false;seen.add(key);return true});
  const net=(stake,gross,adverse,fee=SWEEP_VENUE_FEE)=>gross===null?-(stake+GEN2_FRICTION):stake*(gross*(1-adverse)/(1+adverse)*(1-fee)/(1+fee)-1)-GEN2_FRICTION;
  const results=[];
  for(const policy of SWEEP_RULES){const signals=[];
    for(const launch of eligible){if(!(launch.marketCapSol>0&&launch.marketCapSol<=policy.cap))continue;const path=paths.get(launch.mint)||[],signal=path.filter(t=>t.at>=launch.at&&t.at<=launch.at+policy.delayMs),buy=signal.filter(t=>t.side==='buy').reduce((n,t)=>n+(Number(t.solAmount)||0),0),sell=signal.filter(t=>t.side==='sell').reduce((n,t)=>n+(Number(t.solAmount)||0),0);if(buy>0&&buy/(buy+sell)>=policy.pressure)signals.push({launch,path})}
    for(const stake of SWEEP_SIZES){const entrants=[];for(const {launch,path} of signals){const arrival=launch.at+policy.delayMs+350,entry=path.find(t=>t.side==='buy'&&t.at>=arrival&&t.at<=arrival+1800&&Number(t.solAmount)>=stake);if(entry&&Number(entry.marketCapSol)<=policy.cap)entrants.push({launch,path,entry})}
      for(const holdMs of [2000,5000,10000,20000]){let closed=0,unresolved=0,net0=0,net3=0,net5=0,net8=0,netLightning5=0,exitPrintSol=0;const folds=Array.from({length:GEN2_FOLDS},(_,i)=>({index:i,attempts:0,net5:0}));
        for(const {launch,path,entry} of entrants){const exitAt=entry.at+holdMs+350,exit=path.find(t=>t.side==='buy'&&t.at>=exitAt&&t.at<=exitAt+2200&&Number(t.solAmount)>=stake),ratio=exit?exit.priceSol/entry.priceSol:null,a=net(stake,ratio,.05),b=net(stake,ratio,.08),c=net(stake,ratio,0),d=net(stake,ratio,.03),lightning=net(stake,ratio,.05,.01),fold=folds[launch.fold];fold.attempts++;fold.net5+=a;net0+=c;net3+=d;net5+=a;net8+=b;netLightning5+=lightning;if(exit){closed++;exitPrintSol+=Number(exit.solAmount)}else unresolved++}
        const active=folds.filter(f=>f.attempts),boot=active.length?gen2BlockBootstrap(folds,policy.id+'|'+stake+'|'+holdMs):null,qualified=entrants.length>=24&&closed>=20,robust=qualified&&active.length===GEN2_FOLDS&&active.filter(f=>f.net5>0).length>=4&&net5>0&&net8>=0&&netLightning5>0&&boot.p05>0;
        results.push({policy:policy.id,stakeSol:stake,holdMs,signals:signals.length,attempts:entrants.length,entryPrintsMissing:signals.length-entrants.length,closed,unresolved,net0,net3,net5,net8,netLightning5,netPerAttempt5:entrants.length?net5/entrants.length:null,returnOnAttemptedStake5:entrants.length?net5/(entrants.length*stake):null,averageExitPrintSol:closed?exitPrintSol/closed:null,bootstrapP05:boot?.p05??null,qualified,robust})
      }
    }
  }
  const bySize=SWEEP_SIZES.map(stakeSol=>{const rows=results.filter(x=>x.stakeSol===stakeSol).sort((a,b)=>Number(b.robust)-Number(a.robust)||Number(b.qualified)-Number(a.qualified)||b.net5-a.net5);return{stakeSol,formulas:rows.length,qualified:rows.filter(x=>x.qualified).length,robust:rows.filter(x=>x.robust).length,bestExploratory:rows.find(x=>x.qualified)||null,mostAttempted:rows.slice().sort((a,b)=>b.attempts-a.attempts)[0]||null,rows}});
  return{buildId:BUILD_ID,status:'discovery',launches:launches.length,trades:[...paths.values()].reduce((n,p)=>n+p.length,0),sizesSol:SWEEP_SIZES,policies:SWEEP_RULES,holdTimesMs:[2000,5000,10000,20000],bySize,costs:{adversePerSide:[0,.03,.05,.08],localFeePerSide:SWEEP_VENUE_FEE,lightningFeePerSide:.01,fixedFrictionSol:GEN2_FRICTION,latencyPerSideMs:350},capitalUnlocked:false,limitations:['Trade print size is an activity proxy, not available order-book depth or an executable quote','Larger positions can move the price further than these fixed adverse assumptions','All historical launches were inspected; only new prospective data can validate a selected rule'],method:'Three entry rules and four exit times held fixed across four sizes; later buy prints must match each stake; missing exits are full stake losses; 0.5% local venue fee plus 1% Lightning sensitivity on each side, 0.00002 SOL fixed friction and 0%/3%/5%/8% adverse fill sensitivity. No live orders.'}
}
async function analyzeSizeSweep(db){if(!db?.prepare)return replaySizeSweep([]);const [launches,trades]=await Promise.all([readCampaignRows(db,'SELECT mint, observed_at AS at, name, symbol, launch_market_cap_sol AS marketCapSol FROM campaign_launches ORDER BY observed_at'),readCampaignRows(db,'SELECT mint, observed_at AS at, side, price_sol AS priceSol, sol_amount AS solAmount, market_cap_sol AS marketCapSol FROM campaign_trades ORDER BY observed_at')]);return replaySizeSweep([...launches.map(x=>({...x,kind:'launch'})),...trades.map(x=>({...x,kind:'trade'}))])}
const CALLOUT_SIZES=[.002,.005,.01],CALLOUT_HOLDS=[2000,5000,10000,20000],CALLOUT_FEES=.0125+.005;
const mintPattern=/^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
// Offline, unverified callout observations. Received time is the earliest actionable time.
export function replayCalloutSignals(callouts,trades,options={}){
  const maxEntryPriceSol=Number(options.maxEntryPriceSol),limitActive=Number.isFinite(maxEntryPriceSol)&&maxEntryPriceSol>0;
  const sessionBudgetSol=Number(options.sessionBudgetSol) || .5;
  const requestedStake=Number(options.stakeSol);
  const sizes=Number.isFinite(requestedStake)&&requestedStake>0?[requestedStake]:CALLOUT_SIZES;
  const paths=new Map(),seen=new Set(),unique=[];
  for(const t of trades){if(!mintPattern.test(String(t.mint||''))||!(Number(t.priceSol)>0)||!Number.isFinite(Number(t.at)))continue;if(!paths.has(t.mint))paths.set(t.mint,[]);paths.get(t.mint).push(t)}
  for(const path of paths.values())path.sort((a,b)=>Number(a.at)-Number(b.at));
  for(const call of callouts){const key=String(call.id||''),mint=String(call.mint||''),detectedAt=Number(call.detectedAt),publishedAt=Number(call.publishedAt);if(!key||seen.has(key)||!mintPattern.test(mint)||!Number.isFinite(detectedAt)||!Number.isFinite(publishedAt)||detectedAt<publishedAt||detectedAt-publishedAt>86400000)continue;seen.add(key);unique.push({id:key,mint,caller:String(call.caller||'').slice(0,80),detectedAt,publishedAt})}
  const net=(stake,gross,adverse)=>gross===null?-(stake+GEN2_FRICTION):stake*(gross*(1-adverse)/(1+adverse)*(1-CALLOUT_FEES)/(1+CALLOUT_FEES)-1)-GEN2_FRICTION;
  const rows=[];
  unique.sort((a,b)=>a.detectedAt-b.detectedAt);
  for(const stakeSol of sizes)for(const holdMs of CALLOUT_HOLDS){let attempts=0,closed=0,missingEntry=0,missingExit=0,limitRejected=0,budgetRejected=0,net3=0,net5=0,lagSum=0;for(const call of unique){if((attempts+1)*stakeSol>sessionBudgetSol+1e-10){budgetRejected++;continue}const path=paths.get(call.mint)||[],earliest=call.detectedAt+350,eligible=path.filter(t=>t.side==='buy'&&t.at>=earliest&&t.at<=earliest+2500&&Number(t.solAmount)>=stakeSol),entry=eligible.find(t=>!limitActive||Number(t.priceSol)<=maxEntryPriceSol);if(!entry){if(limitActive&&eligible.length)limitRejected++;else missingEntry++;continue}attempts++;lagSum+=entry.at-call.publishedAt;const exitAt=entry.at+holdMs+350,exit=path.find(t=>t.side==='buy'&&t.at>=exitAt&&t.at<=exitAt+2500&&Number(t.solAmount)>=stakeSol),gross=exit?exit.priceSol/entry.priceSol:null;net3+=net(stakeSol,gross,.03);net5+=net(stakeSol,gross,.05);if(exit)closed++;else missingExit++}rows.push({stakeSol,holdMs,signals:unique.length,attempts,closed,missingEntry,missingExit,limitRejected,budgetRejected,net3,net5,meanPublicationToEntryMs:attempts?Math.round(lagSum/attempts):null,sufficientDepth:attempts>=24&&closed>=20})}
  return{buildId:BUILD_ID,mode:'offline-paper',callouts:unique.length,tradePrints:trades.length,rows,capitalUnlocked:false,sourceStatus:'UNVERIFIED_SUBMITTED_CALLOUTS',sessionBudgetSol,maxEntryPriceSol:limitActive?maxEntryPriceSol:null,limitations:['Callout identity, publication time and mint must be verified by a first-party source before a prospective test','Later buy prints are activity proxies, not executable quotes or landed fills','No official real-time Callouts feed has been connected','A price ceiling is a paper filter after detection, not an exchange resting order','Bonding-curve and Local API fees are stress assumptions and may be counted differently by the venue'],costs:{bondingCurveFeePerSide:.0125,localApiFeePerSide:.005,fixedFrictionSol:GEN2_FRICTION,adversePerSide:[.03,.05],latencyMs:350},method:'Each signal is acted on only after detectedAt plus 350 ms; later eligible buy print must meet stake size and optional absolute price ceiling; missing exits lose full stake. The paper session ceiling is configurable up to 50 SOL and the per-call stake up to 5 SOL. No live orders.'}
}
async function handleCalloutReplay(request){
  if(request.method!=='POST')return json({error:'POST required'},405);const origin=request.headers.get('Origin');if(origin&&origin!==new URL(request.url).origin)return json({error:'Same-origin request required'},403);
  const length=Number(request.headers.get('content-length')||0);if(length>500000)return json({error:'Replay payload too large'},413);
  let body;try{body=await request.json()}catch{return json({error:'Valid JSON required'},400)}
  if(!Array.isArray(body.callouts)||!Array.isArray(body.trades)||body.callouts.length>500||body.trades.length>10000)return json({error:'Replay requires up to 500 callouts and 10,000 trade prints'},400);
  if(body.maxEntryPriceSol!==undefined&&(!Number.isFinite(Number(body.maxEntryPriceSol))||Number(body.maxEntryPriceSol)<=0))return json({error:'Price ceiling must be a positive number in SOL per token'},400);
  if(body.stakeSol!==undefined&&(!Number.isFinite(Number(body.stakeSol))||Number(body.stakeSol)<=0||Number(body.stakeSol)>5))return json({error:'Paper stake must be over 0 and at most 5 SOL per call'},400);
  if(body.sessionBudgetSol!==undefined&&(!Number.isFinite(Number(body.sessionBudgetSol))||Number(body.sessionBudgetSol)<=0||Number(body.sessionBudgetSol)>50||Number(body.sessionBudgetSol)<Number(body.stakeSol||0)))return json({error:'Paper session ceiling must cover one stake and be at most 50 SOL'},400);
  return json(replayCalloutSignals(body.callouts,body.trades,{maxEntryPriceSol:body.maxEntryPriceSol,stakeSol:body.stakeSol,sessionBudgetSol:body.sessionBudgetSol}))
}
const canaryPolicy=Object.freeze({maxOpenPositions:1,maxOrderSol:.002,maxSessionSol:.01,maxSessionLossSol:.003,maxQuoteAgeMs:750,requireSimulation:true,requireMinOutput:true,requireIdempotency:true,autoRollback:true});
function executionReadinessFromAnalysis(analysis){
  const forward=analysis.forwardValidation||{launches:0,targetLaunches:217,candidates:[]},candidates=forward.candidates||[],severeFor=candidate=>(candidate.costSensitivity||[]).find(x=>x.id==='severe')?.result,depthCandidates=candidates.filter(x=>(x.result?.closed||0)>=20),hostileCandidates=depthCandidates.filter(x=>(x.result?.netSol||0)>0),stressCandidates=hostileCandidates.filter(x=>(severeFor(x)?.netSol||0)>0);
  const gates=[
    {id:'campaign',label:'500-launch campaign',pass:(analysis.launches||0)>=500,detail:(analysis.launches||0)+' / 500 launches stored'},
    {id:'forward',label:'New prospective set',pass:false,detail:'Historical frozen set inspected ('+forward.launches+' launches); new collection required'},
    {id:'exit_depth',label:'Exit depth',pass:depthCandidates.length>0,detail:depthCandidates.length?depthCandidates.map(x=>x.result.closed+' closes · '+x.label).join(' / '):'No candidate has 20 closed exits'},
    {id:'hostile_edge',label:'5% hostile fills',pass:hostileCandidates.length>0,detail:hostileCandidates.length?hostileCandidates.map(x=>x.label).join(' / '):'No depth-qualified candidate is positive'},
    {id:'severe_stress',label:'8% stress survival',pass:stressCandidates.length>0,detail:stressCandidates.length?stressCandidates.map(x=>x.label).join(' / '):'No candidate survives severe fill stress'},
    {id:'quote_replay',label:'Executable quote replay',pass:false,detail:'Venue quotes and landed-fill reconciliation not built'},
    {id:'isolation',label:'Signer isolation',pass:executionControl.signerLoaded===false&&executionControl.spendCapSol===0,detail:'No key loaded · spending cap 0 SOL'},
    {id:'canary_route',label:'Canary transaction route',pass:false,detail:'Builder, simulation and broadcast route absent'}
  ],passed=gates.filter(x=>x.pass).length,next=gates.find(x=>!x.pass);
  return {buildId:BUILD_ID,capitalUnlocked:false,mode:'shadow',passed,gates,nextGate:next?.detail||'Human approval required',eligibleCandidates:stressCandidates.map(x=>x.id),policy:canaryPolicy,executionControl};
}
async function executionReadiness(db){return executionReadinessFromAnalysis(await analyzeCampaign(db))}
function metadataUrl(value){if(typeof value!=="string"||value.length>500)return null;let raw=value.trim();if(raw.startsWith("ipfs://"))raw="https://ipfs.io/ipfs/"+raw.slice(7).replace(/^ipfs\//,"");let url;try{url=new URL(raw)}catch{return null}if(url.protocol!=="https:")return null;const host=url.hostname.toLowerCase(),allowed=["ipfs.io","gateway.pinata.cloud","cloudflare-ipfs.com","nftstorage.link","arweave.net"];if(!allowed.includes(host)&&!host.endsWith(".mypinata.cloud"))return null;return url.toString()}
function normIdentity(value){return String(value||"").toLowerCase().replace(/[^a-z0-9]/g,"")}
async function inspectMetadata(request){
  let body;try{body=await request.json()}catch{return json({eligible:false,reasons:["INVALID_INSPECTION_REQUEST"]},400)}
  const mint=String(body.mint||""),url=metadataUrl(body.uri);if(!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(mint))return json({eligible:false,reasons:["INVALID_MINT"]});if(!url)return json({eligible:false,reasons:["UNTRUSTED_METADATA_URI"]});
  let response;try{response=await fetch(url,{redirect:"manual",signal:AbortSignal.timeout(2800),headers:{accept:"application/json"}})}catch{return json({eligible:false,reasons:["METADATA_UNREACHABLE"]})}if(!response.ok||response.status>=300)return json({eligible:false,reasons:["METADATA_UNREACHABLE"]});const size=Number(response.headers.get("content-length")||0);if(size>131072)return json({eligible:false,reasons:["METADATA_TOO_LARGE"]});let data;try{const text=(await response.text()).slice(0,131073);if(text.length>131072)throw new Error();data=JSON.parse(text)}catch{return json({eligible:false,reasons:["INVALID_METADATA"]})}
  const reasons=[],name=String(data.name||""),symbol=String(data.symbol||""),description=String(data.description||""),website=String(data.website||""),twitter=String(data.twitter||""),telegram=String(data.telegram||""),scan=[name,symbol,description,website,twitter,telegram].join(" ");if(!name.trim()||!symbol.trim())reasons.push("MISSING_METADATA_IDENTITY");if(normIdentity(name)!==normIdentity(body.name)||normIdentity(symbol)!==normIdentity(body.symbol))reasons.push("IDENTITY_MISMATCH");if(/(?:it'?s real|dev bought|look.{0,12}dev|dev.{0,12}bought|not a scam|guaranteed|100x|official.{0,8}coin|same dev)/i.test(scan))reasons.push("PROMOTIONAL_BAIT");
  const coinLinks=[...scan.matchAll(/pump\.fun\/(?:coin|board)\/([1-9A-HJ-NP-Za-km-z]{32,44})/gi)].map(x=>x[1]);if(coinLinks.some(x=>x!==mint))reasons.push("LINKS_OTHER_COIN");const addresses=[...scan.matchAll(/(?:^|[^1-9A-HJ-NP-Za-km-z])([1-9A-HJ-NP-Za-km-z]{32,44})(?=$|[^1-9A-HJ-NP-Za-km-z])/g)].map(x=>x[1]);if(addresses.some(x=>x!==mint))reasons.push("REFERENCES_OTHER_MINT");return json({eligible:reasons.length===0,reasons:[...new Set(reasons)]})
}
let sharedHub=null,openingHub=null,activeTest=false;
async function acquireHub(env){
  if(sharedHub&&!sharedHub.closed)return sharedHub;
  if(openingHub)return openingHub;
  openingHub=(async()=>{
    if(!env.PUMPPORTAL_API_KEY)throw Error('Data credential is not configured');
    let response;try{response=await fetch('https://pumpportal.fun/api/data?api-key='+encodeURIComponent(env.PUMPPORTAL_API_KEY),{headers:{Upgrade:'websocket'}})}catch{throw Error('PumpPortal connection failed')}
    const ws=response.webSocket;if(response.status!==101||!ws)throw Error('PumpPortal rejected the connection');
    const hub={ws,listeners:new Set(),closed:false,send(message){if(!this.closed)ws.send(JSON.stringify(message))},release(listener){this.listeners.delete(listener);if(!this.listeners.size){this.closed=true;try{ws.close(1000,'sample complete')}catch{}if(sharedHub===this)sharedHub=null}}};
    ws.accept();ws.addEventListener('message',e=>{let data;try{data=JSON.parse(e.data)}catch{return}for(const fn of [...hub.listeners]){try{fn(data)}catch{}}});
    const ended=()=>{if(hub.closed)return;hub.closed=true;for(const fn of [...hub.listeners]){try{fn({type:'upstream_closed'})}catch{}}hub.listeners.clear();if(sharedHub===hub)sharedHub=null};
    ws.addEventListener('close',ended);ws.addEventListener('error',ended);sharedHub=hub;hub.send({method:'subscribeNewToken'});return hub;
  })();
  try{return await openingHub}finally{openingHub=null}
}
async function relay(request,env){
  if(request.headers.get('Upgrade')?.toLowerCase()!=='websocket')return json({error:'WebSocket upgrade required'},426);
  let hub;try{hub=await acquireHub(env)}catch(e){return json({error:e.message},503)}
  const pair=new WebSocketPair(),downstream=pair[1];downstream.accept();
  const listener=data=>{if(data.type==='upstream_closed'){try{downstream.close(1011,'upstream closed')}catch{}return}if(data.txType==='buy'||data.txType==='sell')return;try{downstream.send(JSON.stringify(data))}catch{hub.release(listener)}};
  hub.listeners.add(listener);downstream.addEventListener('close',()=>hub.release(listener));downstream.addEventListener('error',()=>hub.release(listener));
  downstream.send(JSON.stringify({type:'relay_status',message:'Launch stream connected; no live orders'}));return new Response(null,{status:101,webSocket:pair[0]});
}
export function compareSample(events,costs={}){
  const adverse=Number.isFinite(costs.adverse)?Math.max(0,Math.min(.25,costs.adverse)):.05,fixedFriction=Number.isFinite(costs.fixedFriction)?Math.max(0,costs.fixedFriction):.00002,collectOutcomes=costs.collectOutcomes instanceof Set?costs.collectOutcomes:null,launches=events.filter(e=>e.kind==='launch'),trades=events.filter(e=>e.kind==='trade'&&e.priceSol>0),seen=new Set();
  const paths=new Map();for(const trade of trades){if(!paths.has(trade.mint))paths.set(trade.mint,[]);paths.get(trade.mint).push(trade)}for(const path of paths.values())path.sort((a,b)=>a.at-b.at);
  const eligible=launches.map(x=>{const key=(String(x.name||'')+'|'+String(x.symbol||'')).toLowerCase().replace(/[^a-z0-9|]/g,'');const duplicate=seen.has(key);seen.add(key);return {...x,unique:Boolean(x.name&&x.symbol&&!duplicate)}});
  const caps=[30,32,36,45],delays=[500,1500,2500,4000],chases=[1.12,1.2],gates=[
    {id:'raw',label:'raw flow',pressure:0,traders:0},
    {id:'p50',label:'≥50% buy · 1+ buyer',pressure:.5,traders:1},
    {id:'p55',label:'≥55% buy · 2+ buyers',pressure:.55,traders:2},
    {id:'p60',label:'≥60% buy · 3+ buyers',pressure:.6,traders:3},
    {id:'p65',label:'≥65% buy · 5+ buyers',pressure:.65,traders:5}
  ],entryPolicies=[];
  for(const cap of caps)for(const delayMs of delays)for(const gate of gates)for(const maxChase of chases)entryPolicies.push({id:'c'+cap+'-d'+delayMs+'-'+gate.id+'-x'+Math.round(maxChase*100),label:'≤'+cap+' SOL · '+delayMs+'ms · '+gate.label+' · ≤'+Math.round((maxChase-1)*100)+'% chase',cap,delayMs,confirmMs:gate.id==='raw'?0:delayMs,minPressure:gate.pressure,minTraders:gate.traders,maxChase});
  const exitPolicies=[
    {id:'time5',label:'5s time exit',holdMs:5000},{id:'time10',label:'10s time exit',holdMs:10000},{id:'time15',label:'15s time exit',holdMs:15000},{id:'time20',label:'20s time exit',holdMs:20000},{id:'time30',label:'30s time exit',holdMs:30000},{id:'time45',label:'45s time exit',holdMs:45000},{id:'time60',label:'60s time exit',holdMs:60000},
    {id:'tp125-sl20',label:'1.25× / −20%',holdMs:30000,target:1.25,stop:.8},
    {id:'tp15-sl35',label:'1.5× / −35%',holdMs:30000,target:1.5,stop:.65},
    {id:'tp2-sl40',label:'2× / −40%',holdMs:30000,target:2,stop:.6},
    {id:'trail20',label:'20% trail / −35%',holdMs:30000,trail:.2,stop:.65},
    {id:'scale125-time30',label:'50% at 1.25× / rest 30s',holdMs:30000,scaleTarget:1.25,scaleWeight:.5,stop:.8},
    {id:'scale15-time45',label:'50% at 1.5× / rest 45s',holdMs:45000,scaleTarget:1.5,scaleWeight:.5,stop:.7},
    {id:'scale125-trail20',label:'50% at 1.25× / rest 20% trail',holdMs:60000,scaleTarget:1.25,scaleWeight:.5,trail:.2,stop:.7}
  ];
  function chooseExit(path,entry,policy){const after=path.filter(t=>t.at>entry.at&&t.at<=entry.at+policy.holdMs+3000).sort((a,b)=>a.at-b.at);let high=entry.priceSol,scaled=null;for(const tick of after){const ratio=tick.priceSol/entry.priceSol;high=Math.max(high,tick.priceSol);if(policy.scaleTarget&&!scaled&&ratio>=policy.scaleTarget)scaled=tick;if(policy.target&&ratio>=policy.target)return [{tick,weight:1}];if(policy.stop&&ratio<=policy.stop)return scaled?[{tick:scaled,weight:policy.scaleWeight},{tick,weight:1-policy.scaleWeight}]:[{tick,weight:1}];if(policy.trail&&high>=entry.priceSol*1.2&&tick.priceSol<=high*(1-policy.trail))return scaled?[{tick:scaled,weight:policy.scaleWeight},{tick,weight:1-policy.scaleWeight}]:[{tick,weight:1}]}const timed=after.find(t=>t.at>=entry.at+policy.holdMs&&t.at<=entry.at+policy.holdMs+3000);if(!timed)return null;return scaled?[{tick:scaled,weight:policy.scaleWeight},{tick:timed,weight:1-policy.scaleWeight}]:[{tick:timed,weight:1}]}
  const results=[];
  for(const entryPolicy of entryPolicies)for(const exitPolicy of exitPolicies){
    const outcomeKey=entryPolicy.id+'|'+exitPolicy.id,outcomes=collectOutcomes?.has(outcomeKey)?[]:null;let closed=0,unresolved=0,noEntry=0,noSignal=0,tooExpensive=0,chased=0,netSol=0,wins=0;
    for(const launch of eligible){
      if(!launch.unique)continue;
      const path=paths.get(launch.mint)||[],first=path[0];
      if(!(launch.marketCapSol>0&&launch.marketCapSol<=entryPolicy.cap)){tooExpensive++;continue}
      const signal=path.filter(t=>t.at>=launch.at&&t.at<=launch.at+entryPolicy.confirmMs),buySol=signal.filter(t=>t.side!=='sell').reduce((s,t)=>s+(Number(t.solAmount)||0),0),sellSol=signal.filter(t=>t.side==='sell').reduce((s,t)=>s+(Number(t.solAmount)||0),0),pressure=buySol+sellSol?buySol/(buySol+sellSol):0,traders=new Set(signal.map(t=>t.trader).filter(Boolean)).size;
      if(entryPolicy.confirmMs&&(pressure<entryPolicy.minPressure||traders<entryPolicy.minTraders)){noSignal++;continue}
      const entry=path.find(t=>t.at>=launch.at+entryPolicy.delayMs&&t.at<=launch.at+entryPolicy.delayMs+3000);
      if(!entry){noEntry++;continue}
      const entryCap=Number(entry.marketCapSol)||Number(launch.marketCapSol);if(entryCap>entryPolicy.cap){tooExpensive++;continue}
      if(first&&entry.priceSol>first.priceSol*entryPolicy.maxChase){chased++;continue}
      const exits=chooseExit(path,entry,exitPolicy);
      if(!exits){unresolved++;const loss=-(.002+fixedFriction);netSol+=loss;if(outcomes)outcomes.push(loss);continue}
      const exitRatio=exits.reduce((sum,leg)=>sum+leg.weight*(leg.tick.priceSol*(1-adverse)/(entry.priceSol*(1+adverse))),0),pnl=.002*(exitRatio-1)-fixedFriction;
      closed++;netSol+=pnl;if(outcomes)outcomes.push(pnl);if(pnl>0)wins++;
    }
    results.push({entryRule:entryPolicy.id,entryLabel:entryPolicy.label,exitRule:exitPolicy.id,exitLabel:exitPolicy.label,delayMs:entryPolicy.delayMs,holdMs:exitPolicy.holdMs,closed,unresolved,noEntry,noSignal,tooExpensive,chased,wins,netSol,adverseFillPerSide:adverse,fixedFrictionSol:fixedFriction,...(outcomes?{outcomes}:{})});
  }
  return results;
}
export function buildPaperTrades(events){
  const launches=events.filter(e=>e.kind==='launch'),trades=events.filter(e=>e.kind==='trade'&&e.priceSol>0),seen=new Set(),paper=[];
  for(const launch of launches){
    const identity=(String(launch.name||'')+'|'+String(launch.symbol||'')).toLowerCase().replace(/[^a-z0-9|]/g,'');if(!identity||seen.has(identity))continue;seen.add(identity);
    if(!(launch.marketCapSol>0&&launch.marketCapSol<=32))continue;
    const path=trades.filter(t=>t.mint===launch.mint).sort((a,b)=>a.at-b.at),first=path[0];if(!first)continue;
    const signal=path.filter(t=>t.at>=launch.at&&t.at<=launch.at+2500),buySol=signal.filter(t=>t.side!=='sell').reduce((s,t)=>s+(Number(t.solAmount)||0),0),sellSol=signal.filter(t=>t.side==='sell').reduce((s,t)=>s+(Number(t.solAmount)||0),0),pressure=buySol+sellSol?buySol/(buySol+sellSol):0,traders=new Set(signal.map(t=>t.trader).filter(Boolean)).size;if(pressure<.55||traders<2)continue;
    const entry=path.find(t=>t.at>=launch.at+2500&&t.at<=launch.at+5500);if(!entry||entry.priceSol>first.priceSol*1.2||(Number(entry.marketCapSol)||launch.marketCapSol)>34)continue;
    let high=entry.priceSol,exit=null,exitReason='15s exit unavailable';for(const tick of path.filter(t=>t.at>entry.at&&t.at<=entry.at+33000)){const ratio=tick.priceSol/entry.priceSol;high=Math.max(high,tick.priceSol);if(ratio>=1.5){exit=tick;exitReason='1.5× target';break}if(ratio<=.65){exit=tick;exitReason='35% hard stop';break}if(high>=entry.priceSol*1.2&&tick.priceSol<=high*.75){exit=tick;exitReason='25% trailing stop';break}if(tick.at>=entry.at+15000){exit=tick;exitReason='15s time exit';break}}
    const entryFill=entry.priceSol*1.05,exitFill=exit?exit.priceSol*.95:null,netSol=(exit&&exit.priceSol>0)?0.002*(exitFill/entryFill-1)-0.00002:null;
    paper.push({mint:launch.mint,name:launch.name,symbol:launch.symbol,status:exit?'closed':'unresolved',sizeSol:.002,entryAt:entry.at,entryPriceSol:entryFill,observedEntryPriceSol:entry.priceSol,entryReason:'≤32 SOL launch · ≤34 SOL entry · ≥55% buy flow · 2+ buyers · ≤20% chase',exitAt:exit?.at||null,exitPriceSol:exitFill,observedExitPriceSol:exit?.priceSol||null,exitReason,netSol,buyPressure:pressure,uniqueBuyers:traders,killSwitch:'engaged',submittedTransaction:false})
  }
  return paper;
}
async function forwardTest(request,env,options={}){
  if(request.method!=='POST')return json({error:'POST required'},405);
  const origin=request.headers.get('Origin');if(origin&&origin!==new URL(request.url).origin)return json({error:'Same-origin request required'},403);
  if(activeTest)return json({error:'A bounded test is already running. Wait for it to finish.'},409);
  activeTest=true;let hub;
  try{hub=await acquireHub(env)}catch(e){activeTest=false;return json({error:e.message},503)}
  const durationMs=options.durationMs||45000,intakeMs=options.intakeMs||12000,maxTokens=options.maxTokens||8,maxTradeMessages=options.maxTradeMessages||1000;
  const startedAt=Date.now(),events=[],messages=[],mints=new Set(),signatures=new Set();let tradeCount=0;
  return await new Promise(resolve=>{
    let ended=false,timer;
    const finish=async reason=>{if(ended)return;ended=true;clearTimeout(timer);request.signal.removeEventListener('abort',cancel);if(mints.size){try{hub.send({method:'unsubscribeTokenTrade',keys:[...mints]})}catch{}}hub.release(listener);
      const evidence={schemaVersion:3,startedAt:new Date(startedAt).toISOString(),finishedAt:new Date().toISOString(),reason,tokenCount:mints.size,tradeCount,events,messages,comparisons:compareSample(events),paperTrades:buildPaperTrades(events),executionControl,tradingEnabled:false,submittedTransactions:0,limits:{durationSeconds:durationMs/1000,intakeSeconds:intakeMs/1000,maxTokens,maxTradeMessages},evidence:'REAL_EVENTS_SIMULATED_FILLS',limitations:['Observed trades are not executable quotes or fills','No independent holdout','Unresolved exits have no realized P&L','No profitability certification','Shared connection and concurrency lock apply per worker instance']};
      try{evidence.persistence=await persistCampaignEvidence(env.DB,evidence)}catch(e){evidence.persistence={state:'error',message:String(e?.message||e).slice(0,180)}}latestEvidence=evidence;activeTest=false;resolve(json(evidence));
    };
    const cancel=()=>{void finish('request_cancelled')};
    const listener=x=>{
      if(ended)return;if(x.type==='upstream_closed'){void finish('upstream_closed');return}
      const now=Date.now(),isTrade=x.txType==='buy'||x.txType==='sell';
      
      if(x.message||x.errors){messages.push(String(x.message||(typeof x.errors==='string'?x.errors:JSON.stringify(x.errors))).replaceAll(env.PUMPPORTAL_API_KEY,'[redacted]').slice(0,240));if(messages.length>20)messages.shift();if(/funded with at least|invalid api|invalid key|insufficient balance/i.test(messages.at(-1))){void finish('trade_access_denied');return}}
      if(!x.mint)return;
      if(x.txType==='create'&&mints.size<maxTokens&&now-startedAt<intakeMs&&!mints.has(x.mint)){
        mints.add(x.mint);events.push({kind:'launch',at:now,mint:String(x.mint),name:String(x.name||'').slice(0,100),symbol:String(x.symbol||'').slice(0,30),marketCapSol:Number(x.marketCapSol)||null});
        try{hub.send({method:'subscribeTokenTrade',keys:[x.mint]})}catch{void finish('subscription_failed')}return;
      }
      if(isTrade&&mints.has(x.mint)){
        const signature=String(x.signature||'');if(signature&&signatures.has(signature))return;if(signature)signatures.add(signature);
        const tokens=Number(x.tokenAmount),sol=Number(x.solAmount),price=sol/tokens;
        if(tokens>0&&sol>0&&Number.isFinite(price)){events.push({kind:'trade',at:now,mint:String(x.mint),side:x.txType,priceSol:price,solAmount:sol,tokenAmount:tokens,marketCapSol:Number(x.marketCapSol)||null,signature,trader:String(x.traderPublicKey||'')});tradeCount++;if(tradeCount>=maxTradeMessages)void finish('message_limit')}
      }
    };
    hub.listeners.add(listener);timer=setTimeout(()=>{void finish('time_limit')},durationMs);request.signal.addEventListener('abort',cancel,{once:true});if(request.signal.aborted)cancel();
  });
}
async function resolveCaller(request){
  if(request.method!=='GET')return json({error:'GET required'},405);
  const raw=new URL(request.url).searchParams.get('q')?.trim()||'';
  if(raw.length>260)return json({error:'Link is too long.'},400);
  let identity=raw;
  if(/^(?:https?:\/\/|(?:www\.)?pump\.fun\/)/i.test(raw)){
    let link;try{link=new URL(/^https?:\/\//i.test(raw)?raw:'https://'+raw)}catch{return json({error:'Invalid Pump link.'},400)}
    if(link.protocol!=='https:'||!['pump.fun','www.pump.fun'].includes(link.hostname))return json({error:'Use a pump.fun profile or join link.'},400);
    const parts=link.pathname.split('/').filter(Boolean);
    if(parts.length!==2||!['profile','join'].includes(parts[0]))return json({error:'This link does not identify one caller. Use their profile or join link.'},400);
    identity=decodeURIComponent(parts[1]);
  }else identity=identity.replace(/^@/,'');
  if(!/^[a-zA-Z0-9_.-]{2,40}$/.test(identity)&&!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(identity))return json({error:'Enter a Pump username, profile or join link, or wallet address.'},400);
  try{
    const upstream=await fetch('https://frontend-api-v3.pump.fun/users/'+encodeURIComponent(identity),{headers:{accept:'application/json'},signal:AbortSignal.timeout(6500)});
    if(upstream.status===404)return json({error:'No Pump profile found for that username.'},404);
    if(!upstream.ok)return json({error:'Pump profile lookup is unavailable. Try again shortly.'},502);
    const profile=await upstream.json();
    const wallet=profile.wallet||profile.wallet_address||profile.address;
    if(typeof wallet!=='string'||!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(wallet))return json({error:'Pump did not return a wallet for this profile.'},422);
    const username=typeof profile.username==='string'&&/^[a-zA-Z0-9_.-]{2,40}$/.test(profile.username)?profile.username:'';
    if(!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(identity)&&(!username||username.toLowerCase()!==identity.toLowerCase()))return json({error:'Pump did not confirm that username. Open the caller’s profile and use its link.'},422);
    let profileImage='';try{const image=new URL(profile.profile_image||profile.profile_image_url||'');if(image.protocol==='https:'&&image.hostname==='socialimages.pump.fun')profileImage=image.href}catch{}
    return json({wallet,username,profileImage});
  }catch{return json({error:'Pump profile lookup is unavailable. Try again shortly.'},502)}
}

export default{async fetch(request,env){const url=new URL(request.url);if(url.pathname==="/api/automation/draft")return automationDraft(request,env);if(url.pathname==="/api/automation/wallet")return automationWallet(request,env);if(url.pathname==="/api/automation/inspect-buy")return inspectBuyRequest(request);if(url.pathname==="/api/automation/monitor-tick")return monitorTick(request,env);if(url.pathname==="/api/build")return json({buildId:BUILD_ID});if(url.pathname==="/account.js")return new Response(accountScript,{headers:{"content-type":"text/javascript; charset=utf-8","cache-control":"no-store",...secure}});if(url.pathname==="/api/account/balance")return accountRpc(request,env,"getBalance");if(url.pathname==="/api/account/blockhash")return accountRpc(request,env,"getLatestBlockhash");if(url.pathname==="/api/account/withdraw")return broadcastWithdrawal(request,env);if(url.pathname==="/manual-trade.js")return new Response(manualTradeScript,{headers:{"content-type":"text/javascript; charset=utf-8","cache-control":"no-store",...secure}});if(url.pathname==="/callout-watch.js")return new Response(calloutWatchScript,{headers:{"content-type":"text/javascript; charset=utf-8","cache-control":"no-store",...secure}});if(url.pathname==="/api/manual-trade/build")return buildManualTrade(request,env);if(url.pathname==="/api/manual-trade/status")return manualTradeStatus(request,env);if(url.pathname==="/api/portfolio")return portfolioBalances(request,env);if(url.pathname==="/api/callouts/recent")return recentCallouts(request,env);if(url.pathname==="/api/callouts/ingest")return ingestCallout(request,env);if(url.pathname==="/api/callouts/resolve")return resolveCaller(request);if(url.pathname==="/api/callouts/access")return json(calloutAccess);if(url.pathname==="/api/latest-test")return json(latestEvidence||{pending:true});if(url.pathname==="/api/execution-status")return json(executionControl);if(url.pathname==="/api/automation/readiness")return automationReadiness(env);if(url.pathname==="/api/automation/signer-setup")return signerSetup(env);if(url.pathname==="/api/execution-readiness")return json(await executionReadiness(env.DB));if(url.pathname==="/api/research-snapshot"){const analysis=await analyzeCampaign(env.DB);return json({analysis,readiness:executionReadinessFromAnalysis(analysis)})}if(url.pathname==="/api/generation-2")return json(await analyzeGeneration2(env.DB));if(url.pathname==="/api/generation-3")return json(await analyzeGeneration3(env.DB));if(url.pathname==="/api/generation-4")return json(await analyzeGeneration4(env.DB));if(url.pathname==="/api/size-sweep")return json(await analyzeSizeSweep(env.DB));if(url.pathname==="/api/callouts/replay")return handleCalloutReplay(request);if(url.pathname==="/api/execution/canary"&&request.method==="POST")return json({error:"Live-capital interlock is locked",readiness:await executionReadiness(env.DB)},423);if(url.pathname==="/api/campaign/status")return json(await readCampaignStatus(env.DB));if(url.pathname==="/api/campaign/analysis")return json(await analyzeCampaign(env.DB));if(url.pathname==="/api/campaign/batch")return forwardTest(request,env,{durationMs:90000,intakeMs:30000,maxTokens:20,maxTradeMessages:3000});if(url.pathname==="/api/forward-test")return forwardTest(request,env);if(url.pathname==="/api/status")return json({configured:Boolean(env.PUMPPORTAL_API_KEY),stream:"new-token-and-trades",buildId:BUILD_ID,...executionControl});if(url.pathname==="/api/inspect"&&request.method==="POST")return inspectMetadata(request);if(url.pathname==="/api/stream")return relay(request,env);if(url.pathname==="/account")return new Response(accountPage,{headers:accountHeaders});if(url.pathname==="/portfolio")return new Response(portfolioPage,{headers:pageHeaders});if(url.pathname==="/launch-research")return new Response(researchPage,{headers:pageHeaders});if(url.pathname==="/")return new Response(calloutPage,{headers:pageHeaders});return new Response("Not found",{status:404,headers:secure})}};
