/* Photobylens app: UI, upload, AI retouch (visitor's own Gemini key, browser only), framing, standard + paid HD export. */
(function(){
const P=window.PBL,{LENSES,CATS,DEF,byId,zoomR,fDef,Nat,stops,fText,nText,fmt,E,clamp}=P;
const $=s=>document.querySelector(s);
const STD_LONG=1280,HD_MAX=6000;
const CFG=window.PBL_CONFIG||{},REPO=CFG.repo||'diyaraprestige/photobylens';
let API_BASE=(CFG.apiBase||'').trim();if(API_BASE&&!API_BASE.endsWith('/'))API_BASE+='/';
const api=p=>API_BASE+'api/'+p;
const CAP=window.Capacitor,NATIVE=!!(CAP&&CAP.isNativePlatform&&CAP.isNativePlatform()),EXT=/^(chrome|moz|edge)-extension:$/.test(location.protocol);
if(NATIVE||EXT)document.documentElement.classList.add('is-app');if(NATIVE)document.documentElement.classList.add('is-native');
const DLURL={apk:`https://github.com/${REPO}/releases/latest/download/Photobylens.apk`,ext:`https://github.com/${REPO}/releases/latest/download/Photobylens-extension.zip`,src:`https://github.com/${REPO}`};
document.querySelectorAll('[data-dl]').forEach(a=>{a.href=DLURL[a.dataset.dl];a.target='_blank';a.rel='noopener';});

/* ---------- runtime ---------- */
let CONFIG={live:false,payments:false,price:0,currency:'MYR'},SAMPLE=null,DL=null;
async function loadConfig(){
 if(!((NATIVE||EXT)&&!API_BASE))try{const r=await fetch(api('config'),{cache:'no-store'});if(r.ok){const j=await r.json();CONFIG=Object.assign({live:true},j);}}catch(e){}
 if(!CONFIG.live&&!NATIVE&&!EXT&&window.claude&&typeof claude.use==='function'){
  try{const [s,d]=await Promise.all([claude.use('sample'),claude.use('downloads')]);DL=d||null;if(s){try{const lim=await s.limits();if(lim&&lim.images)SAMPLE=s;}catch(e){}}}catch(e){}
 }
 const money=priceText();
 if(!HD_READY)$('#hdPrice').textContent=money?`${money} · full original size`:'Full original size';
 $('#priceBig').textContent=money||(CONFIG.live?'Soon':'Paid');
 refreshAIBadge();
}
function priceText(){if(!CONFIG.price)return '';const v=CONFIG.price/100;return (CONFIG.currency==='MYR'?'RM':CONFIG.currency+' ')+(v%1?v.toFixed(2):v);}

/* ---------- state ---------- */
let SRC=null,DEPTH=null,AI=null,LOCAL=null,raf=0,thumbTok=0,thumbTimer=0,unlocked=null,HD_READY=null;
const st={id:'canon-70-200',f:200,N:2.8,amt:1,edit:1,fx:.5,fy:.5,fd:.3,view:0,cmp:false,split:.5,mode:'focus',crop:{z:1,cx:.5,cy:.5,manual:false},lastCrop:null};
try{const s=localStorage.getItem('pbl-lens');if(s&&byId[s])st.id=s;}catch(e){}
const lens=()=>byId[st.id];
const out=$('#out'),octx=out.getContext('2d'),bef=$('#before'),bctx=bef.getContext('2d');
const toast=t=>{const e=$('#toast');e.textContent=t;e.classList.add('on');clearTimeout(e._t);e._t=setTimeout(()=>e.classList.remove('on'),3400);};
const busy=t=>{$('#busytxt').textContent=t||'';$('#busy').classList.toggle('on',!!t);};
const tick=()=>new Promise(r=>setTimeout(r,30));

/* ---------- retouch (white balance, exposure, tone, colour) ---------- */
function localAuto(B){
 const n=B.w*B.h,L=new Float32Array(n);let sr=0,sg=0,sb=0,c=0;
 for(let i=0;i<n;i++){const r=B.rgb[i*3],g=B.rgb[i*3+1],b=B.rgb[i*3+2],l=.2126*r+.7152*g+.0722*b;L[i]=l;if(l>.08&&l<.95){sr+=r;sg+=g;sb+=b;c++;}}
 const s=Array.from(L).sort((a,b)=>a-b),q=p=>s[Math.min(n-1,Math.floor(n*p))];
 let wb=[1,1,1];
 if(c>50){const m=[sr/c,sg/c,sb/c],ml=.2126*m[0]+.7152*m[1]+.0722*m[2];wb=m.map(v=>1+(clamp(ml/Math.max(v,1e-3),.8,1.25)-1)*.65);const k=.2126*wb[0]+.7152*wb[1]+.0722*wb[2];wb=wb.map(v=>v/k);}
 const med=q(.5),p05=q(.05),p98=q(.98);
 return {wb,exp:clamp(Math.log2(.46/Math.max(med,.02)),-.8,.8)*.55,shd:clamp((.14-q(.1))*3,0,.6),hi:clamp((p98-.9)*5,0,.8),con:(p98-p05)<.7?.14:.05,vib:.15,warm:0};
}
function grade(){
 const base=LOCAL||{wb:[1,1,1],exp:0,shd:0,hi:0,con:0,vib:0,warm:0},a=AI&&AI.edit,e=st.edit;
 const num=(v,lo,hi,d)=>typeof v==='number'&&isFinite(v)?clamp(v,lo,hi):d;
 const g={wb:base.wb.slice(),exp:a?num(a.exposure,-1.5,1.5,0)*.85:base.exp,shd:a?num(a.shadows,0,1,0):base.shd,hi:a?num(a.highlights,0,1,0):base.hi,con:a?num(a.contrast,-.3,.5,0):base.con,vib:a?num(a.vibrance,-.3,.6,0):base.vib,warm:a?num(a.warmth,-.4,.4,0):0};
 g.wb=[g.wb[0]*(1+g.warm*.12),g.wb[1],g.wb[2]*(1-g.warm*.12)];
 return {wb:g.wb.map(v=>1+(v-1)*e),exp:g.exp*e,shd:g.shd*e,hi:g.hi*e,con:g.con*e,vib:g.vib*e};
}

/* ---------- aperture + framing ---------- */
function apFor(L,f){
 const base=Nat(L,f),S=stops(L,f),want=AI&&typeof AI.aperture==='number'?AI.aperture:0;
 if(!want||L.id==='phone')return base;
 const t=Math.max(base,want);return S.find(s=>s>=t-.05)||S[S.length-1];
}
const maxZ=()=>SRC?clamp(Math.max(SRC.w,SRC.h)/1400,1,3.2):1;
function lensZoom(L,f){const c=Object.assign({},DEF,L.ch);if(c.fish||L.id==='phone'||f<=30)return 1;return Math.min(f/26*(c.macro?1.25:1),maxZ());}
function autoFrame(L,f,subj){
 let z=lensZoom(L,f);
 const box=subj||(AI&&AI.box)||null,head=AI&&AI.head;
 if(z<=1.01)return {z:1,cx:.5,cy:.5,manual:false};
 if(box){const need=Math.max(box[3]*1.08,box[2]*1.08);if(need>1/z)z=Math.max(1,1/need);}
 const h=1/z,w=1/z;
 let cx,y0;
 if(box){cx=box[0]+box[2]/2;y0=Math.min(box[1]+box[3]/2-h/2,box[1]-.05*h);if(head)y0=Math.min(y0,head[1]-.06*h);}
 else{cx=st.fx;y0=st.fy-h/2;}
 const x0=clamp(cx-w/2,0,1-w);y0=clamp(y0,0,1-h);
 return {z,cx:x0+w/2,cy:y0+h/2,manual:false};
}
function cropRect(c){const w=1/c.z,h=1/c.z;return {x0:clamp(c.cx-w/2,0,1-w),y0:clamp(c.cy-h/2,0,1-h),cw:w,ch:h};}

/* ---------- build render params ---------- */
function build(L,s,long,n,full){
 const c=Object.assign({},DEF,L.ch),a=s.amt,f=s.f,N=s.N,A=SRC.w/SRC.h;
 const W=A>=1?long:Math.round(long*A),H=A>=1?Math.round(long/A):long;
 const fish=c.fish===2?2:c.fish===1?(f<=10?2:1):0;
 const T=full?{x0:0,y0:0,cw:1,ch:1}:cropRect(s.crop);
 let dof=L.id==='phone'?0:Math.pow(f/50,1.25)*(1.8/N)*(c.macro?2.2*c.macro:1)*(fish?.5:1);
 if(c.tilt)dof=Math.max(dof,1.6)*(2.8/N);
 const maxRf=Math.min(.055,.0145*dof),glow=c.glow*Math.min(1,Math.pow(L.N/N,1.5)),g=grade();
 return {W,H,n,fish,T,crop:[T.x0,1-T.y0-T.ch,T.cw,T.ch],focus:s.fd,maxRf,kbF:maxRf*3.4,kfF:maxRf*5.1,sq:c.sq,cat:c.cat,bub:c.bub,hl:c.hl,
  tilt:c.tilt?1:0,tiltY:clamp(1-(s.fy-T.y0)/T.ch,0,1),tiltBand:.05+N/16*.12,fishT:fish===2?1.25:1.12,
  wb:g.wb,exp:g.exp,hi:g.hi,shd:g.shd,
  dist:c.dist*a,ca:c.ca*a,vig:c.vig*a,con:c.con*a+g.con,sat:c.sat*a,vib:c.vib*a+g.vib,warm:c.warm*a,clar:c.clar*a,sharp:c.sharp*a,glow:glow*a,flare:c.flare*a,grain:c.grain*a,fade:c.fade*a,view:s.view};
}
function setSource(canvas,info){
 SRC=Object.assign({c:canvas,w:canvas.width,h:canvas.height},info||{});
 P.upload(E.src,canvas,true);
 $('#stripOut').textContent=`${SRC.ow||SRC.w}×${SRC.oh||SRC.h}`;
}
function setDepth(arr,w,h){DEPTH={a:arr,w,h};P.upload(E.dep,P.depthCanvas(arr,w,h),false);}
const depthAt=(x,y)=>DEPTH?DEPTH.a[clamp(Math.floor(y*DEPTH.h),0,DEPTH.h-1)*DEPTH.w+clamp(Math.floor(x*DEPTH.w),0,DEPTH.w-1)]:.3;

/* ---------- rendering ---------- */
function schedule(){if(!raf)raf=requestAnimationFrame(()=>{raf=0;renderMain();});}
function renderMain(){
 if(!SRC)return;
 const L=lens(),r=$('#view').getBoundingClientRect(),dpr=Math.min(window.devicePixelRatio||1,2),framing=st.mode==='frame';
 const long=Math.round(clamp(Math.max(r.width-24,320)*dpr,480,1800));
 const t0=performance.now(),Pm=build(L,st,long,260,framing);P.renderGL(Pm);
 if(out.width!==Pm.W)out.width=Pm.W;if(out.height!==Pm.H)out.height=Pm.H;
 octx.drawImage(E.cv,0,0);
 const T=Pm.T;st.lastCrop=T;
 if(st.cmp&&!framing){bef.width=Pm.W;bef.height=Pm.H;bctx.drawImage(SRC.c,T.x0*SRC.w,T.y0*SRC.h,T.cw*SRC.w,T.ch*SRC.h,0,0,Pm.W,Pm.H);clipSplit();}
 const cropped=st.crop.z>1.01;
 $('#stat').textContent=`${SRC.ow||SRC.w}×${SRC.oh||SRC.h} · ${cropped?`${st.crop.z.toFixed(1)}× lens crop`:'full frame'} · ${Math.round(performance.now()-t0)} ms`;
 const ox=(st.fx-T.x0)/T.cw,oy=(st.fy-T.y0)/T.ch,ret=$('#ret');
 ret.style.display=(framing||Pm.fish||L.id==='phone'||ox<0||ox>1||oy<0||oy>1)?'none':'';ret.style.left=ox*100+'%';ret.style.top=oy*100+'%';
 const cb=$('#cropbox');
 if(framing){const C=cropRect(st.crop);cb.hidden=false;Object.assign(cb.style,{left:C.x0*100+'%',top:C.y0*100+'%',width:C.cw*100+'%',height:C.ch*100+'%'});}else cb.hidden=true;
 $('#tagR').textContent=L.name;
 updateFramingUI();
}
function clipSplit(){bef.style.clipPath=`inset(0 ${(1-st.split)*100}% 0 0)`;$('#split').style.left=st.split*100+'%';}
function renderThumbs(delay){
 clearTimeout(thumbTimer);
 thumbTimer=setTimeout(()=>{
  const tok=++thumbTok;let i=0;
  const step=()=>{if(tok!==thumbTok||!SRC)return;
   for(let k=0;k<3&&i<LENSES.length;k++,i++){const L=LENSES[i],cv=document.querySelector(`.lcard[data-id="${L.id}"] canvas`);if(!cv)continue;
    const f=fDef(L),s=Object.assign({},st,{id:L.id,f,N:apFor(L,f),amt:1,view:0});s.crop=autoFrame(L,f);
    const Pm=build(L,s,440,120,false);P.renderGL(Pm);cv.width=Pm.W;cv.height=Pm.H;cv.getContext('2d').drawImage(E.cv,0,0);}
   if(i<LENSES.length)requestAnimationFrame(step);};
  requestAnimationFrame(step);
 },delay||0);
}
const lensImg=L=>L.img||(P.lens3d?P.lens3d.still(L):'');
function fillLensImages(){
 const imgs=[...document.querySelectorAll('.lcard img.lensimg')];let i=0;
 const step=()=>{const im=imgs[i++];if(!im)return;try{im.src=lensImg(byId[im.dataset.id]);}catch(e){}requestAnimationFrame(step);};
 requestAnimationFrame(step);
}

/* ---------- lens selection + controls ---------- */
let viewer3d=null;
function selectLens(id,keep){
 st.id=id;const L=lens();
 try{localStorage.setItem('pbl-lens',id);}catch(e){}
 if(!keep){st.f=fDef(L);st.N=apFor(L,st.f);if(SRC)st.crop=autoFrame(L,st.f);st.mode='focus';}
 let src='';try{src=lensImg(L);}catch(e){}
 $('#pImg').src=src;$('#stripImg').src=src;$('#pImg').alt=L.name;
 $('#lname').textContent=L.name;$('#stripName').textContent=L.name;$('#stripSpec').textContent=`${fText(L)} · ${nText(L)} · ${L.cat}`;
 $('#lchips').innerHTML=[fText(L),nText(L),L.cat].map((c,i)=>`<span class="chip${i?'':' a'}">${c}</span>`).join('')+`<span class="chip">${L.best}</span>`;
 $('#llook').textContent=L.look;
 const z=zoomR(L),rF=$('#rF');$('#cFocal').hidden=!z;
 if(z){rF.min=z[0];rF.max=z[1];rF.step=1;rF.value=st.f;}
 syncAperture();labels();
 document.querySelectorAll('.lcard').forEach(c=>c.classList.toggle('sel',c.dataset.id===id));
 if(viewer3d)viewer3d.show(L);
 setMode('focus');
}
function syncAperture(){const L=lens(),S=stops(L,st.f),rN=$('#rN');let i=S.findIndex(s=>s>=st.N-.01);if(i<0)i=S.length-1;st.N=S[i];rN.max=S.length-1;rN.value=i;rN._s=S;}
function labels(){const L=lens();$('#oF').textContent=st.f+'mm';$('#oN').textContent=(L.t?'T':'f/')+fmt(st.N)+(AI&&AI.aperture&&Math.abs(apFor(L,st.f)-st.N)<.01?' · AI':'');$('#oA').textContent=Math.round(st.amt*100)+'%';$('#oE').textContent=Math.round(st.edit*100)+'%';}
function updateFramingUI(){
 const can=lensZoom(lens(),st.f)>1.01;$('#cFrame').hidden=!can;$('#bFrame').hidden=!can;
 if(!can)return;const rZ=$('#rZ');rZ.min=1;rZ.max=maxZ().toFixed(2);rZ.step=.01;if(document.activeElement!==rZ)rZ.value=st.crop.z;
 $('#oZ').textContent=st.crop.z<=1.01?'Full frame':st.crop.z.toFixed(1)+'×'+(st.crop.manual?'':' · auto');
}
$('#rF').addEventListener('input',e=>{st.f=+e.target.value;const m=Nat(lens(),st.f);if(st.N<m)st.N=m;syncAperture();if(!st.crop.manual)st.crop=autoFrame(lens(),st.f);labels();schedule();});
$('#rN').addEventListener('input',e=>{st.N=e.target._s[+e.target.value];labels();schedule();});
$('#rA').addEventListener('input',e=>{st.amt=e.target.value/100;labels();schedule();});
$('#rE').addEventListener('input',e=>{st.edit=e.target.value/100;labels();schedule();renderThumbs(600);});
$('#rZ').addEventListener('input',e=>{st.crop.z=clamp(+e.target.value,1,maxZ());st.crop.manual=true;const C=cropRect(st.crop);st.crop.cx=C.x0+C.cw/2;st.crop.cy=C.y0+C.ch/2;schedule();});
$('#bReframe').addEventListener('click',()=>{st.crop=autoFrame(lens(),st.f);schedule();toast('Framed around your subject.');});

/* ---------- library ---------- */
let cat='All',query='';
function buildLibrary(){
 $('#cats').innerHTML=['All',...CATS].map(c=>`<button aria-pressed="${c===cat}" data-c="${c}">${c}<span>${c==='All'?LENSES.length-1:LENSES.filter(l=>l.cat===c).length}</span></button>`).join('');
 $('#grid').innerHTML=LENSES.map(L=>`<button class="lcard" data-id="${L.id}"><div class="th"><canvas width="440" height="330"></canvas><img class="lensimg" data-id="${L.id}" alt=""></div><div class="ci"><b>${L.name}</b><span class="m">${fText(L)} · ${nText(L)} · ${L.cat}</span><p>${L.look}</p></div></button>`).join('');
}
function filterLib(){
 let shown=0;const q=query.trim().toLowerCase();
 document.querySelectorAll('.lcard').forEach(c=>{const L=byId[c.dataset.id];const ok=(cat==='All'||L.cat===cat)&&(!q||(L.name+' '+L.cat+' '+L.best+' '+fText(L)+' '+L.look).toLowerCase().includes(q));c.hidden=!ok;if(ok)shown++;});
 $('#empty').hidden=shown>0;
}
$('#cats').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;cat=b.dataset.c;document.querySelectorAll('#cats button').forEach(x=>x.setAttribute('aria-pressed',x===b));filterLib();});
$('#q').addEventListener('input',e=>{query=e.target.value;filterLib();});
$('#grid').addEventListener('click',e=>{const c=e.target.closest('.lcard');if(!c)return;selectLens(c.dataset.id);$('#studio').scrollIntoView();});

/* ---------- viewer: focus, frame, compare ---------- */
const frame=$('#frame');let drag=null;
function setMode(m){
 st.mode=m;$('#view').classList.toggle('framing',m==='frame');$('#bFrame').setAttribute('aria-pressed',m==='frame');
 $('#bFrame').lastChild.textContent=m==='frame'?'Done framing':'Frame';
 if(m==='frame'&&st.cmp){st.cmp=false;$('#bCmp').setAttribute('aria-pressed','false');$('#view').classList.remove('cmp');}
 $('#tapnote').textContent=m==='frame'?'Drag the box to frame your shot':'Tap to set focus';$('#tapnote').classList.remove('off');
 schedule();
}
function moveSplit(e){const r=out.getBoundingClientRect();st.split=clamp((e.clientX-r.left)/r.width,0,1);clipSplit();}
frame.addEventListener('pointerdown',e=>{
 if(!SRC)return;
 const r=out.getBoundingClientRect();
 if(st.mode==='frame'){drag={kind:'crop',x:e.clientX,y:e.clientY,cx:st.crop.cx,cy:st.crop.cy,w:r.width,h:r.height};frame.setPointerCapture(e.pointerId);return;}
 if(st.cmp){drag={kind:'split'};frame.setPointerCapture(e.pointerId);moveSplit(e);return;}
 const T=st.lastCrop||{x0:0,y0:0,cw:1,ch:1},ox=(e.clientX-r.left)/r.width,oy=(e.clientY-r.top)/r.height;
 st.fx=clamp(T.x0+ox*T.cw,0,1);st.fy=clamp(T.y0+oy*T.ch,0,1);st.fd=depthAt(st.fx,st.fy);
 $('#tapnote').classList.add('off');schedule();renderThumbs(800);
});
frame.addEventListener('pointermove',e=>{
 if(!drag)return;
 if(drag.kind==='split')return moveSplit(e);
 const C=cropRect(st.crop),nx=drag.cx+(e.clientX-drag.x)/drag.w,ny=drag.cy+(e.clientY-drag.y)/drag.h;
 st.crop.cx=clamp(nx,C.cw/2,1-C.cw/2);st.crop.cy=clamp(ny,C.ch/2,1-C.ch/2);st.crop.manual=true;$('#tapnote').classList.add('off');schedule();
});
frame.addEventListener('pointerup',()=>{drag=null;});
frame.addEventListener('wheel',e=>{if(st.mode!=='frame')return;e.preventDefault();st.crop.z=clamp(st.crop.z*(e.deltaY<0?1.05:1/1.05),1,maxZ());st.crop.manual=true;schedule();},{passive:false});
$('#bFrame').addEventListener('click',()=>setMode(st.mode==='frame'?'focus':'frame'));
$('#bCmp').addEventListener('click',e=>{if(st.mode==='frame')setMode('focus');st.cmp=!st.cmp;e.currentTarget.setAttribute('aria-pressed',st.cmp);$('#view').classList.toggle('cmp',st.cmp);schedule();});
$('#bDepth').addEventListener('click',e=>{st.view=st.view?0:1;e.currentTarget.setAttribute('aria-pressed',!!st.view);schedule();});
$('#bAF').addEventListener('click',()=>{autoFocus();if(!st.crop.manual)st.crop=autoFrame(lens(),st.f);schedule();renderThumbs(300);toast('Focus set on the main subject.');});
function autoFocus(){
 if(AI&&AI.focus){st.fx=AI.focus[0];st.fy=AI.focus[1];}
 else if(DEPTH){let best=1,bx=.5,by=.5;const {w,h,a}=DEPTH;for(let y=Math.floor(h*.2);y<h*.8;y++)for(let x=Math.floor(w*.2);x<w*.8;x++){if(a[y*w+x]<best){best=a[y*w+x];bx=x/w;by=y/h;}}st.fx=bx;st.fy=by;}
 st.fd=depthAt(st.fx,st.fy);
}
new ResizeObserver(()=>schedule()).observe($('#view'));

/* ---------- upload ---------- */
async function decode(file){
 try{return await createImageBitmap(file,{imageOrientation:'from-image'});}
 catch(e){return await new Promise((res,rej)=>{const im=new Image();im.onload=()=>res(im);im.onerror=()=>rej(new Error('decode'));im.src=URL.createObjectURL(file);});}
}
async function prepare(file){
 const bmp=await decode(file),cap=Math.min(HD_MAX,E.maxTex||4096),s=Math.min(1,cap/Math.max(bmp.width,bmp.height));
 const c=document.createElement('canvas');c.width=Math.round(bmp.width*s);c.height=Math.round(bmp.height*s);c.getContext('2d').drawImage(bmp,0,0,c.width,c.height);
 return {c,ow:bmp.width,oh:bmp.height};
}
async function loadFile(file){
 if(!file||(file.type&&!/^image\//.test(file.type))){toast('Please choose an image file.');return;}
 busy('Developing your photo…');
 try{
  const {c,ow,oh}=await prepare(file);
  setSource(c,{file,ow,oh,id:Math.random().toString(36).slice(2,10)});unlocked=null;AI=null;setHDReady(null);
  busy('Reading depth and light…');await tick();
  const B=P.depthBase(c);LOCAL=localAuto(B);setDepth(P.fuse(B,null),B.w,B.h);autoFocus();
  st.N=apFor(lens(),st.f);syncAperture();st.crop=autoFrame(lens(),st.f);labels();
  $('#ai').hidden=true;setMode('focus');
  $('#srcnote').textContent=`Your photo, ${ow}×${oh}. The original file is never changed; everything happens in your browser.`;
  busy('');schedule();renderThumbs(300);$('#studio').scrollIntoView();
  runAI(c,B);
 }catch(err){busy('');toast('That image could not be opened. Try a JPEG or PNG.');}
}
$('#file').addEventListener('change',e=>{loadFile(e.target.files[0]);e.target.value='';});
const view=$('#view');
['dragenter','dragover'].forEach(ev=>view.addEventListener(ev,e=>{e.preventDefault();view.classList.add('dragging');}));
['dragleave','drop'].forEach(ev=>view.addEventListener(ev,e=>{e.preventDefault();if(ev==='dragleave'&&view.contains(e.relatedTarget))return;view.classList.remove('dragging');}));
view.addEventListener('drop',e=>{const f=e.dataTransfer&&e.dataTransfer.files[0];if(f)loadFile(f);});
document.addEventListener('paste',e=>{if(e.target&&e.target.closest&&e.target.closest('input'))return;const it=[...((e.clipboardData&&e.clipboardData.items)||[])].find(i=>i.type.startsWith('image/'));if(it)loadFile(it.getAsFile());});

/* ---------- Gemini (visitor's own free key, called straight from the browser) ---------- */
const GK='pbl-gemini-key',GM='pbl-gemini-models',API='https://generativelanguage.googleapis.com/v1beta/';
const getKey=()=>{try{return localStorage.getItem(GK)||'';}catch(e){return '';}};
function setKey(k){try{k?localStorage.setItem(GK,k):localStorage.removeItem(GK);localStorage.removeItem(GM);}catch(e){}}
async function listModels(key){
 const r=await fetch(API+'models?pageSize=200',{headers:{'x-goog-api-key':key}});
 const j=await r.json().catch(()=>({}));
 if(!r.ok){const m=(j.error&&j.error.message)||'';const e=new Error(m||('HTTP '+r.status));e.status=r.status;throw e;}
 const ver=n=>{const m=n.match(/gemini-(\d+(?:\.\d+)?)/);return m?parseFloat(m[1]):0;};
 const names=(j.models||[]).filter(m=>(m.supportedGenerationMethods||[]).includes('generateContent')).map(m=>m.name.replace(/^models\//,''))
  .filter(n=>/flash/.test(n)&&!/image|tts|audio|live|embed|native|robotics|computer|thinking-exp/.test(n));
 names.sort((a,b)=>(ver(b)-ver(a))||((/lite/.test(a)?1:0)-(/lite/.test(b)?1:0))||((/preview|exp/.test(a)?1:0)-(/preview|exp/.test(b)?1:0)));
 const list=[...new Set([...names.slice(0,4),'gemini-flash-latest'])];
 try{localStorage.setItem(GM,JSON.stringify({t:Date.now(),list}));}catch(e){}
 return list;
}
async function models(key){try{const c=JSON.parse(localStorage.getItem(GM)||'null');if(c&&Date.now()-c.t<864e5&&c.list.length)return c.list;}catch(e){}return listModels(key);}
async function geminiAnalyze(blob){
 const key=getKey();
 const b64=await new Promise(r=>{const fr=new FileReader();fr.onload=()=>r(String(fr.result).split(',')[1]);fr.readAsDataURL(blob);});
 const body=JSON.stringify({contents:[{role:'user',parts:[{inline_data:{mime_type:'image/jpeg',data:b64}},{text:P.aiPrompt()}]}],generationConfig:{temperature:.2,responseMimeType:'application/json'}});
 let last=null;
 for(const m of await models(key)){
  const r=await fetch(`${API}models/${m}:generateContent`,{method:'POST',headers:{'content-type':'application/json','x-goog-api-key':key},body});
  const j=await r.json().catch(()=>({}));
  if(r.ok){const t=((j.candidates&&j.candidates[0]&&j.candidates[0].content&&j.candidates[0].content.parts)||[]).map(p=>p.text||'').join('');if(t)return t;last=new Error('empty');continue;}
  const msg=(j.error&&j.error.message)||'';last=new Error(msg);last.status=r.status;
  if(r.status===400&&/API key/i.test(msg)){last.code='badkey';break;}
  if(r.status===403){last.code='badkey';break;}
 }
 if(last&&last.status===429)last.code='quota';
 throw last||new Error('no model');
}
function refreshAIBadge(){
 const k=getKey();
 $('#aiBadge').textContent=k?'Gemini connected':SAMPLE?'Claude preview':'On-device auto';
 $('#bGem').textContent=k?'Change Gemini key':'Connect free Gemini';
 $('#stripAI').textContent=AI&&AI.raw?'AI retouch':k?'Gemini ready':'On-device';
}
async function askAI(blob){
 if(getKey())return await geminiAnalyze(blob);
 if(SAMPLE){const r=await SAMPLE(P.aiPrompt(),{images:[blob],modelTier:'default'});return (r&&r.text)||'';}
 return null;
}
async function runAI(c,B){
 if(!getKey()&&!SAMPLE){refreshAIBadge();$('#gemCta').hidden=false;return;}
 $('#gemCta').hidden=true;$('#aiBadge').textContent='AI analysing…';
 try{
  const s=Math.min(1,1280/Math.max(c.width,c.height)),k=document.createElement('canvas');k.width=Math.round(c.width*s);k.height=Math.round(c.height*s);k.getContext('2d').drawImage(c,0,0,k.width,k.height);
  const blob=await new Promise(r=>k.toBlob(r,'image/jpeg',.88));
  const text=await askAI(blob);if(text==null)return;
  const m=text.match(/\{[\s\S]*\}/);if(!m)throw new Error('no json');
  const j=JSON.parse(m[0]),num=v=>typeof v==='number'&&isFinite(v),box4=v=>Array.isArray(v)&&v.length===4&&v.every(num)?v.map(x=>clamp(x,0,1)):null,ai={};
  if(Array.isArray(j.depth)&&j.depth.length>=4&&j.depth.every(r=>Array.isArray(r)&&r.length>=4&&r.length===j.depth[0].length&&r.every(num)))ai.depth=j.depth.map(r=>r.map(v=>clamp(v,0,1)));
  ai.box=box4(j.subject&&j.subject.box);ai.head=box4(j.head);
  if(Array.isArray(j.focus)&&j.focus.length===2&&j.focus.every(num))ai.focus=j.focus.map(v=>clamp(v,0,1));
  if(SRC.c!==c)return;
  setDepth(P.fuse(B,ai),B.w,B.h);
  AI={focus:ai.focus,box:ai.box,head:ai.head,edit:j.edit&&typeof j.edit==='object'?j.edit:null,aperture:num(j.aperture)?clamp(j.aperture,.95,16):0,raw:j};
  autoFocus();st.N=apFor(lens(),st.f);syncAperture();if(!st.crop.manual)st.crop=autoFrame(lens(),st.f);labels();
  showAI(j);refreshAIBadge();
  schedule();renderThumbs(200);toast('AI retouch applied: focus, aperture, white balance and tone.');
 }catch(e){
  refreshAIBadge();
  if(e&&e.code==='badkey'){toast('Your Gemini key was refused. Please check it.');openGem();}
  else if(e&&e.code==='quota')toast('Your free Gemini limit is used up for now. Using on-device retouch.');
  else toast('AI retouch unavailable right now, using on-device retouch.');
 }
}
function showAI(j){
 const t=v=>typeof v==='string'?v:'';
 $('#aiScene').textContent=t(j.scene)||'—';$('#aiSubj').textContent=t(j.subject&&j.subject.label)||'—';$('#aiLight').textContent=t(j.lighting)||'—';$('#aiTip').textContent=t(j.tip);
 const box=$('#aiPicks');box.textContent='';
 (Array.isArray(j.picks)?j.picks:[]).filter(p=>p&&byId[p.id]).slice(0,3).forEach(p=>{const b=document.createElement('button');b.className='pk';const n=document.createElement('span');n.textContent='Try '+byId[p.id].name;const w=document.createElement('small');w.textContent=t(p.why);b.append(n,w);b.addEventListener('click',()=>selectLens(p.id));box.append(b);});
 $('#ai').hidden=false;
}
function openGem(){$('#gemKey').value=getKey();$('#gemErr').textContent='';$('#gemDel').hidden=!getKey();$('#gemModal').classList.add('on');setTimeout(()=>$('#gemKey').focus(),50);}
$('#bGem').addEventListener('click',openGem);$('#gemCtaBtn').addEventListener('click',openGem);
$('#gemX').addEventListener('click',()=>$('#gemModal').classList.remove('on'));
$('#gemDel').addEventListener('click',()=>{setKey('');refreshAIBadge();$('#gemModal').classList.remove('on');toast('Gemini key removed from this browser.');});
$('#gemSave').addEventListener('click',async()=>{
 const k=$('#gemKey').value.trim(),btn=$('#gemSave');
 if(!/^[A-Za-z0-9_\-]{20,}$/.test(k)){$('#gemErr').textContent='That does not look like a Gemini API key. It usually starts with "AI".';return;}
 btn.disabled=true;btn.textContent='Checking…';$('#gemErr').textContent='';
 try{const list=await listModels(k);setKey(k);try{localStorage.setItem(GM,JSON.stringify({t:Date.now(),list}));}catch(e){}
  $('#gemModal').classList.remove('on');refreshAIBadge();toast('Gemini connected. Your key stays in this browser only.');
  if(SRC&&SRC.file){const B=P.depthBase(SRC.c);runAI(SRC.c,B);}
 }catch(e){$('#gemErr').textContent=e.status?'Google did not accept this key. Copy it again from AI Studio.':CONFIG.live?'Could not reach Google. Check your connection and try again.':'This preview cannot reach Google. Your key will work on the live website.';}
 btn.disabled=false;btn.textContent='Save and connect';
});

/* ---------- export: standard (free) and HD (paid) ---------- */
async function renderBlob(long,q){
 const L=lens(),Pm=build(L,Object.assign({},st,{view:0}),long,320,false);P.renderGL(Pm);
 const blob=await new Promise(r=>E.cv.toBlob(r,'image/jpeg',q));schedule();return blob;
}
const fileName=hd=>`photobylens-${lens().id}-${st.f}mm-f${fmt(st.N)}${hd?'-HD':''}.jpg`;
const plug=n=>CAP&&((CAP.Plugins&&CAP.Plugins[n])||(CAP.registerPlugin&&CAP.registerPlugin(n)));
async function nativeSave(blob,name){
 const b64=await new Promise(r=>{const fr=new FileReader();fr.onload=()=>r(String(fr.result).split(',')[1]);fr.readAsDataURL(blob);});
 const FS=plug('Filesystem'),SH=plug('Share');
 const w=await FS.writeFile({path:name,data:b64,directory:'CACHE'});
 await SH.share({title:'Photobylens photo',text:name,files:[w.uri],dialogTitle:'Save or share your photo'});
}
async function save(blob,name){
 if(NATIVE){try{await nativeSave(blob,name);toast('Choose "Save" or your gallery to keep the photo.');}catch(e){if(!/cancel/i.test(String(e&&e.message)))toast('Could not open the save sheet.');}return;}
 if(DL){try{await DL.save({filename:name,data:blob});toast('Saved '+name);return;}catch(e){if(e&&e.code==='declined'){toast('Download cancelled.');return;}}
  $('#mimg').src=URL.createObjectURL(blob);$('#imgModal').classList.add('on');return;}
 const u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),8000);toast('Downloaded '+name);
}
$('#bStd').addEventListener('click',async()=>{
 if(!SRC)return;busy('Rendering standard download…');await tick();
 try{const blob=await renderBlob(Math.min(STD_LONG,Math.max(SRC.w,SRC.h)),.86);busy('');await save(blob,fileName(false));}catch(e){busy('');toast('Could not render the image.');}
});
async function generateHD(){
 busy('Generating your HD photo at full resolution…');await tick();
 const long=Math.min(E.maxTex||4096,HD_MAX,Math.max(SRC.ow||SRC.w,SRC.oh||SRC.h,SRC.w,SRC.h));
 const blob=await renderBlob(long,.95);busy('');
 setHDReady({blob,name:fileName(true)});
}
function setHDReady(x){
 if(HD_READY&&HD_READY.url)URL.revokeObjectURL(HD_READY.url);
 HD_READY=x;if(x)x.url=URL.createObjectURL(x.blob);
 $('#bHD').classList.toggle('ready',!!x);
 $('#hdLabel').textContent=x?'Download HD · ready':'Download HD';
 $('#hdPrice').textContent=x?`${(x.blob.size/1048576).toFixed(1)} MB · click to save`:(priceText()?`${priceText()} · full original size`:'Full original size');
 if(x){$('#hdImg').src=x.url;const a=$('#hdLink');a.href=x.url;a.download=x.name;$('#hdMeta').textContent=`${x.name} · ${(x.blob.size/1048576).toFixed(1)} MB`;$('#hdModal').classList.add('on');}
}
$('#hdLink').addEventListener('click',e=>{if(!HD_READY)return;if(NATIVE||DL){e.preventDefault();save(HD_READY.blob,HD_READY.name);}else toast('Saving '+HD_READY.name);});
$('#hdX').addEventListener('click',()=>$('#hdModal').classList.remove('on'));
$('#bHD').addEventListener('click',async()=>{
 if(!SRC)return;
 if(HD_READY){$('#hdModal').classList.add('on');return;}
 if(unlocked&&SRC.id&&unlocked===SRC.id){await generateHD();return;}
 if(!SRC.file){toast('Upload your own photo to get it in HD.');return;}
 const L=lens(),money=priceText(),can=CONFIG.live&&CONFIG.payments&&CONFIG.price>0;
 $('#payLens').textContent=`${L.name} · ${SRC.ow}×${SRC.oh}`;$('#payAmt').textContent=money||'';
 $('#payGo').hidden=!can;$('#payNote').hidden=!can;
 $('#payText').textContent=can?'Your retouched photo at its full original resolution with this lens. It generates automatically as soon as payment is confirmed.':CONFIG.live?'HD checkout is being set up. Please check back soon, or take the free standard download now.':DL?'HD checkout runs on the live website. This preview offers the free standard download.':'HD checkout is being set up. Please check back soon, or take the free standard download now.';
 $('#payModal').classList.add('on');
});
$('#payX').addEventListener('click',()=>$('#payModal').classList.remove('on'));
$('#payGo').addEventListener('click',async()=>{
 const b=$('#payGo');b.disabled=true;b.textContent='Opening checkout…';
 let win=null;if(!NATIVE){try{win=window.open('','_blank');}catch(e){}}
 if(win){try{win.document.write('<p style="font:16px system-ui;padding:24px">Opening secure checkout…</p>');}catch(e){}}
 try{
  await saveSession();
  const r=await fetch(api('checkout'),{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({photoId:SRC.id,lens:lens().name,size:`${SRC.ow}x${SRC.oh}`,mode:(win||NATIVE)?'tab':'redirect'})});
  const j=await r.json();if(!r.ok||!j.url)throw new Error(j.error||'checkout');
  b.disabled=false;b.textContent='Pay securely';$('#payModal').classList.remove('on');
  if(win){win.location.href=j.url;waitForPayment(j.id);}
  else if(NATIVE){waitForPayment(j.id);location.href=j.url;}
  else location.href=j.url;
 }catch(e){if(win)try{win.close();}catch(_){}b.disabled=false;b.textContent='Pay securely';toast('Checkout could not start. Please try again.');}
});
let waitTimer=0;
function waitForPayment(id){
 clearInterval(waitTimer);const t0=Date.now();let busyCheck=false;
 $('#waitModal').classList.add('on');
 const check=async()=>{
  if(busyCheck)return;busyCheck=true;
  try{const r=await fetch(api('verify'),{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({session_id:id,photoId:SRC.id})});const j=await r.json();
   if(j.paid){clearInterval(waitTimer);document.removeEventListener('visibilitychange',vis);$('#waitModal').classList.remove('on');unlocked=SRC.id;await generateHD();}}catch(e){}
  busyCheck=false;
  if(Date.now()-t0>20*60*1000){clearInterval(waitTimer);$('#waitModal').classList.remove('on');toast('Checkout timed out. If you paid, contact us with your receipt.');}
 };
 const vis=()=>{if(!document.hidden)check();};
 document.addEventListener('visibilitychange',vis);
 waitTimer=setInterval(check,3000);
 $('#waitX').onclick=()=>{clearInterval(waitTimer);document.removeEventListener('visibilitychange',vis);$('#waitModal').classList.remove('on');};
}
$('#mclose').addEventListener('click',()=>$('#imgModal').classList.remove('on'));
document.addEventListener('keydown',e=>{if(e.key==='Escape')document.querySelectorAll('.modal.on').forEach(m=>m.classList.remove('on'));});

/* ---------- keep the session across the payment redirect (stays in this browser) ---------- */
function idb(){return new Promise((res,rej)=>{const q=indexedDB.open('photobylens',1);q.onupgradeneeded=()=>q.result.createObjectStore('s');q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error);});}
async function idbSet(k,v){const db=await idb();return new Promise((res,rej)=>{const t=db.transaction('s','readwrite');t.objectStore('s').put(v,k);t.oncomplete=res;t.onerror=()=>rej(t.error);});}
async function idbGet(k){const db=await idb();return new Promise((res,rej)=>{const t=db.transaction('s');const q=t.objectStore('s').get(k);q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error);});}
async function saveSession(){
 await idbSet('session',{file:SRC.file,id:SRC.id,depth:DEPTH?{a:DEPTH.a,w:DEPTH.w,h:DEPTH.h}:null,local:LOCAL,ai:AI,st:{id:st.id,f:st.f,N:st.N,amt:st.amt,edit:st.edit,fx:st.fx,fy:st.fy,fd:st.fd,crop:st.crop},t:Date.now()});
}
async function restoreSession(){
 const s=await idbGet('session');if(!s||!s.file)return false;
 const {c,ow,oh}=await prepare(s.file);setSource(c,{file:s.file,ow,oh,id:s.id});
 if(s.depth)setDepth(s.depth.a,s.depth.w,s.depth.h);else{const B=P.depthBase(c);setDepth(P.fuse(B,null),B.w,B.h);}
 LOCAL=s.local||localAuto(P.depthBase(c));AI=s.ai||null;if(AI&&AI.raw)showAI(AI.raw);
 st.id=s.st.id;selectLens(st.id,true);Object.assign(st,s.st);syncAperture();
 $('#rA').value=Math.round(st.amt*100);$('#rE').value=Math.round(st.edit*100);labels();
 $('#srcnote').textContent=`Your photo, ${ow}×${oh}. The original file is never changed; everything happens in your browser.`;
 schedule();return true;
}
async function handleReturn(){
 const q=new URLSearchParams(location.search),sid=q.get('paid'),cancelled=q.has('cancelled');
 if(!sid&&!cancelled)return false;
 history.replaceState(null,'',location.pathname+location.hash);
 busy('Restoring your photo…');
 let ok=false;try{ok=await restoreSession();}catch(e){}
 busy('');
 if(!ok){toast('We could not restore your photo on this device. Please upload it again.');return false;}
 renderThumbs(300);$('#studio').scrollIntoView();
 if(cancelled){toast('Payment cancelled. Your photo and settings are still here.');return true;}
 busy('Confirming payment…');
 try{
  const r=await fetch(api('verify'),{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({session_id:sid,photoId:SRC.id})});
  const j=await r.json();busy('');
  if(j.paid){unlocked=SRC.id;await generateHD();}
  else toast('Payment not confirmed yet. If you were charged, contact us with your receipt.');
 }catch(e){busy('');toast('Could not confirm the payment. Please refresh to try again.');}
 return true;
}

/* ---------- boot ---------- */
buildLibrary();filterLib();
let ok=false;try{ok=P.initGL();}catch(e){ok=false;}
if(!ok){$('#view').innerHTML='<p class="note" style="padding:30px;text-align:center">This browser has WebGL 2 turned off, which the lens engine needs. Try a current Chrome, Edge, Safari or Firefox.</p>';}
if(P.lens3d){try{viewer3d=P.lens3d.mount($('#lens3d'));}catch(e){viewer3d=null;}}
refreshAIBadge();
(async()=>{
 await loadConfig();
 if(!ok){selectLens(byId[st.id]?st.id:'canon-70-200');return;}
 const restored=await handleReturn();
 if(!restored){
  const demo=P.sampleScene();setSource(demo.c,{});
  const y=demo.dc.getContext('2d').getImageData(0,0,480,320).data,arr=new Float32Array(480*320);
  for(let i=0;i<arr.length;i++)arr[i]=y[i*4]/255;
  setDepth(arr,480,320);st.fx=.4167;st.fy=.55;st.fd=depthAt(st.fx,st.fy);
  AI={box:[.35,.26,.13,.47],focus:[.4167,.55]};
  selectLens(byId[st.id]?st.id:'canon-70-200');renderThumbs(100);
 }
 fillLensImages();
})();
})();
