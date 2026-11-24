/* Photobylens optics engine: WebGL2 depth-of-field + lens character, depth estimation helpers, sample scene. */
(function(){
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
/* ---------- WebGL optics engine ---------- */
const VS=`#version 300 es
in vec2 p;out vec2 vUv;void main(){vUv=p*.5+.5;gl_Position=vec4(p,0.,1.);}`;
const FS1=`#version 300 es
precision highp float;
uniform sampler2D uSrc,uDepth;uniform vec4 uCrop,uTilt;uniform vec2 uRes;
uniform float uFocus,uKf,uKb,uMaxR,uSq,uCat,uBub,uHl,uStep;uniform int uN;
in vec2 vUv;out vec4 o;
uniform vec3 uWB;uniform float uExp,uHi,uSh;
vec3 G(vec3 c){c*=uWB*exp2(uExp);float L=dot(c,vec3(.2126,.7152,.0722));c+=c*uSh*.9*(1.-smoothstep(0.,.55,L));c-=c*uHi*.35*smoothstep(.5,1.05,L);return max(c,0.);}

vec2 S(vec2 u){return uCrop.xy+u*uCrop.zw;}
float coc(vec2 u,float d){
 if(uTilt.x>.5){float t=abs(u.y-uTilt.y)-uTilt.z;return clamp(max(t,0.)*uTilt.w,0.,uMaxR);}
 float x=d-uFocus;return clamp(x>0.?x*uKb:-x*uKf,0.,uMaxR);}
vec3 ex(vec3 c){c=min(G(c),vec3(1.));return c/max(1.-uHl*c,vec3(.12));}
vec3 cp(vec3 e){return e/(1.+uHl*e);}
float h(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
void main(){
 vec2 px=1./uRes;
 float cd=texture(uDepth,S(vUv)).r,cs=coc(vUv,cd);
 vec3 acc=ex(texture(uSrc,S(vUv)).rgb);float tot=1.;
 vec2 r0=(vUv-.5)*vec2(uRes.x/uRes.y,1.);float rl=length(r0);vec2 rd=rl>1e-4?r0/rl:vec2(1.,0.);
 float rad=uStep,ang=h(vUv*uRes)*6.2832;
 float squash=clamp(uCat*rl*1.4,0.,.85);
 for(int i=0;i<400;i++){
  if(i>=uN||rad>uMaxR)break;
  ang+=2.39996323;
  vec2 off=vec2(cos(ang),sin(ang))*rad;
  off.y*=uSq;
  off-=rd*dot(off,rd)*squash;
  vec2 tu=vUv+off*px;
  float sd=texture(uDepth,S(tu)).r;float ss=coc(tu,sd);
  if(sd>cd)ss=min(ss,cs*2.);
  float m=smoothstep(rad-.5,rad+.5,ss);
  float w=1.+uBub*2.*m*smoothstep(.6,1.,rad/max(ss,1.));
  vec3 sc=ex(texture(uSrc,S(tu)).rgb);
  acc+=mix(acc/tot,sc,m)*w;tot+=w;
  rad+=uStep/rad;
 }
 o=vec4(cp(acc/tot),cs/max(uMaxR,1e-3));
}`;
const FS2=`#version 300 es
precision highp float;
uniform sampler2D uSrc,uBlur,uDepth;uniform vec4 uCrop;uniform vec2 uRes,uPx;
uniform vec2 uBpx;uniform float uAsp,uFish,uFishT,uDist,uCA,uVig,uCon,uSat,uVib,uWarm,uClar,uSharp,uGlow,uFlare,uGrain,uFade,uView,uMaxR1,uFocus,uSeed;
in vec2 vUv;out vec4 o;
uniform vec3 uWB;uniform float uExp,uHi,uSh;
vec3 G(vec3 c){c*=uWB*exp2(uExp);float L=dot(c,vec3(.2126,.7152,.0722));c+=c*uSh*.9*(1.-smoothstep(0.,.55,L));c-=c*uHi*.35*smoothstep(.5,1.05,L);return max(c,0.);}
vec3 T(vec2 u){return G(texture(uSrc,u).rgb);}
vec3 TL(vec2 u,float l){return G(textureLod(uSrc,u,l).rgb);}

vec2 S(vec2 u){return uCrop.xy+u*uCrop.zw;}
float h(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
vec3 pal(float d){vec3 a=vec3(1.,.88,.66),b=vec3(.37,.71,1.),c=vec3(.03,.05,.13);return d<.5?mix(a,b,d*2.):mix(b,c,d*2.-1.);}
void main(){
 vec2 asp=vec2(uAsp,1.);vec2 p0=(vUv-.5)*asp;vec2 p=p0;
 float cr=length(asp)*.5,rn0=0.;
 if(uFish>.5){
  float R=uFish>1.5?.5:cr;rn0=length(p)/R;
  if(uFish>1.5&&rn0>1.){o=vec4(0.,0.,0.,1.);return;}
  float rs=tan(min(rn0*uFishT,1.5))/tan(uFishT);
  if(rn0>1e-5)p=p/length(p)*cr*rs;
 }else if(uDist!=0.){p*=(1.+uDist*dot(p,p)/(cr*cr))/(1.+max(uDist,0.));}
 vec2 u=p/asp+.5;vec2 c=u-.5,sp=S(u);
 vec3 sh=vec3(T(S(.5+c*(1.+uCA))).r,T(sp).g,T(S(.5+c*(1.-uCA))).b);
 vec3 nb=(T(sp+vec2(uPx.x,0.))+T(sp-vec2(uPx.x,0.))+T(sp+vec2(0.,uPx.y))+T(sp-vec2(0.,uPx.y)))*.25;
 vec3 loc=TL(sp,3.);
 vec4 b=(texture(uBlur,u)*2.+texture(uBlur,u+uBpx*vec2(.9,.9))+texture(uBlur,u+uBpx*vec2(-.9,.9))+texture(uBlur,u+uBpx*vec2(.9,-.9))+texture(uBlur,u+uBpx*vec2(-.9,-.9)))/6.;
 float m=smoothstep(.6,2.2,b.a*uMaxR1),f=1.-m;
 vec3 col=mix(sh,b.rgb,m);
 col+=(sh-nb)*uSharp*1.6*f;
 col+=(sh-loc)*uClar*.7*f;
 vec3 g=TL(sp,4.5);
 col+=max(g-.45,0.)*uGlow*1.4+g*uGlow*.1;
 if(uFlare>0.){vec3 s=vec3(0.);for(int i=-24;i<=24;i++){vec3 t=TL(sp+vec2(float(i)*.011*uCrop.z,0.),3.5);float l=dot(t,vec3(.3,.6,.1));s+=vec3(smoothstep(.88,1.,l)*pow(1.-abs(float(i))/25.,2.));}col+=s*vec3(.2,.45,1.)*uFlare*.1;}
 col=clamp(col,0.,1.);
 col=mix(col,col*col*(3.-2.*col),uCon);
 float L=dot(col,vec3(.2126,.7152,.0722));
 float st=max(col.r,max(col.g,col.b))-min(col.r,min(col.g,col.b));
 col=mix(vec3(L),col,1.+uSat+uVib*(1.-st));
 col*=vec3(1.+uWarm*.07,1.+uWarm*.01,1.-uWarm*.08);
 col=mix(col,vec3(.08,.075,.07)+col*.9,uFade);
 float r=length(p0)/cr;
 col*=1.-uVig*.85*smoothstep(.3,1.05,r);
 col+=(h(vUv*uRes+uSeed)-.5)*uGrain*.1;
 if(uFish>1.5)col*=smoothstep(1.,.985,rn0);
 if(uView>.5){float d=texture(uDepth,sp).r;col=pal(d);col=mix(col,vec3(1.),smoothstep(.035,0.,abs(d-uFocus))*.7);}
 o=vec4(clamp(col,0.,1.),1.);
}`;
const E={};
function initGL(){
 const cv=document.createElement('canvas');
 const gl=cv.getContext('webgl2',{preserveDrawingBuffer:true,antialias:false,premultipliedAlpha:false});
 if(!gl)return false;
 E.cv=cv;E.gl=gl;
 const sh=(t,s)=>{const x=gl.createShader(t);gl.shaderSource(x,s);gl.compileShader(x);if(!gl.getShaderParameter(x,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(x));return x};
 const prog=fs=>{const p=gl.createProgram();gl.attachShader(p,sh(gl.VERTEX_SHADER,VS));gl.attachShader(p,sh(gl.FRAGMENT_SHADER,fs));gl.bindAttribLocation(p,0,'p');gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(p));return {p,loc:{}}};
 E.p1=prog(FS1);E.p2=prog(FS2);
 const buf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buf);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
 E.vao=gl.createVertexArray();gl.bindVertexArray(E.vao);gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0);
 const tex=()=>{const t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);return t};
 E.src=tex();E.dep=tex();E.blur=tex();E.fb=gl.createFramebuffer();
 E.maxTex=gl.getParameter(gl.MAX_TEXTURE_SIZE);
 return true;
}
function upload(t,img,mip){
 const gl=E.gl;gl.bindTexture(gl.TEXTURE_2D,t);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
 gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,img);
 if(mip){gl.generateMipmap(gl.TEXTURE_2D);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);}
}
function setU(pr,o){
 const gl=E.gl;
 for(const k in o){
  const l=pr.loc[k]!==undefined?pr.loc[k]:(pr.loc[k]=gl.getUniformLocation(pr.p,k));
  if(l===null)continue;const v=o[k];
  if(typeof v==='number')gl.uniform1f(l,v);
  else if(v.i!==undefined)gl.uniform1i(l,v.i);
  else if(v.length===2)gl.uniform2f(l,v[0],v[1]);
  else if(v.length===3)gl.uniform3f(l,v[0],v[1],v[2]);
  else gl.uniform4f(l,v[0],v[1],v[2],v[3]);
 }
}
function bindT(u,t){const gl=E.gl;gl.activeTexture(gl.TEXTURE0+u);gl.bindTexture(gl.TEXTURE_2D,t);}
function renderGL(P){
 const gl=E.gl,{W,H}=P;
 if(E.cv.width!==W)E.cv.width=W;if(E.cv.height!==H)E.cv.height=H;
 const s=Math.min(1,900/Math.max(W,H)),w1=Math.max(8,Math.round(W*s)),h1=Math.max(8,Math.round(H*s));
 if(E.bw!==w1||E.bh!==h1){gl.bindTexture(gl.TEXTURE_2D,E.blur);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,w1,h1,0,gl.RGBA,gl.UNSIGNED_BYTE,null);E.bw=w1;E.bh=h1;}
 const sh=Math.min(w1,h1),maxR=P.maxRf*sh;
 gl.bindVertexArray(E.vao);
 gl.bindFramebuffer(gl.FRAMEBUFFER,E.fb);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,E.blur,0);
 gl.viewport(0,0,w1,h1);gl.useProgram(E.p1.p);bindT(0,E.src);bindT(1,E.dep);
 setU(E.p1,{uSrc:{i:0},uDepth:{i:1},uN:{i:P.n},uCrop:P.crop,uRes:[w1,h1],uFocus:P.focus,uKf:P.kfF*sh,uKb:P.kbF*sh,uMaxR:maxR,uSq:P.sq,uCat:P.cat,uBub:P.bub,uHl:P.hl,uStep:Math.max(maxR*maxR/(2*P.n),.35),uWB:P.wb||[1,1,1],uExp:P.exp||0,uHi:P.hi||0,uSh:P.shd||0,uTilt:[P.tilt,P.tiltY,P.tiltBand,maxR/.22]});
 gl.drawArrays(gl.TRIANGLES,0,3);
 gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.viewport(0,0,W,H);gl.useProgram(E.p2.p);bindT(0,E.src);bindT(1,E.blur);bindT(2,E.dep);
 setU(E.p2,{uSrc:{i:0},uBlur:{i:1},uDepth:{i:2},uCrop:P.crop,uRes:[W,H],uBpx:[1/w1,1/h1],uPx:[P.crop[2]/W,P.crop[3]/H],uAsp:W/H,uFish:P.fish,uFishT:P.fishT,uDist:P.dist,uCA:P.ca,uVig:P.vig,uCon:P.con,uSat:P.sat,uVib:P.vib,uWarm:P.warm,uClar:P.clar,uSharp:P.sharp,uGlow:P.glow,uFlare:P.flare,uGrain:P.grain,uFade:P.fade,uView:P.view,uMaxR1:maxR,uFocus:P.focus,uWB:P.wb||[1,1,1],uExp:P.exp||0,uHi:P.hi||0,uSh:P.shd||0,uSeed:Math.random()*100});
 gl.drawArrays(gl.TRIANGLES,0,3);
}

/* ---------- Depth: heuristic + AI fusion + guided filter ---------- */
function boxMean(a,w,h,r){
 const W1=w+1,S=new Float64Array(W1*(h+1));
 for(let y=0;y<h;y++){let row=0;for(let x=0;x<w;x++){row+=a[y*w+x];S[(y+1)*W1+x+1]=S[y*W1+x+1]+row;}}
 const o=new Float32Array(w*h);
 for(let y=0;y<h;y++){const ya=Math.max(0,y-r),yb=Math.min(h,y+r+1);for(let x=0;x<w;x++){const xa=Math.max(0,x-r),xb=Math.min(w,x+r+1);o[y*w+x]=(S[yb*W1+xb]-S[ya*W1+xb]-S[yb*W1+xa]+S[ya*W1+xa])/((yb-ya)*(xb-xa));}}
 return o;
}
function guided(I,p,w,h,r,eps){
 const n=w*h,Ip=new Float32Array(n),II=new Float32Array(n);
 for(let i=0;i<n;i++){Ip[i]=I[i]*p[i];II[i]=I[i]*I[i];}
 const mI=boxMean(I,w,h,r),mp=boxMean(p,w,h,r),mIp=boxMean(Ip,w,h,r),mII=boxMean(II,w,h,r);
 const A=new Float32Array(n),B=new Float32Array(n);
 for(let i=0;i<n;i++){const v=mII[i]-mI[i]*mI[i];A[i]=(mIp[i]-mI[i]*mp[i])/(v+eps);B[i]=mp[i]-A[i]*mI[i];}
 const mA=boxMean(A,w,h,r),mB=boxMean(B,w,h,r),q=new Float32Array(n);
 for(let i=0;i<n;i++)q[i]=clamp(mA[i]*I[i]+mB[i],0,1);
 return q;
}
function depthBase(img){
 const s=448/Math.max(img.width,img.height),w=Math.max(16,Math.round(img.width*s)),h=Math.max(16,Math.round(img.height*s));
 const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d',{willReadFrequently:true});x.drawImage(img,0,0,w,h);
 const d=x.getImageData(0,0,w,h).data,n=w*h,g=new Float32Array(n),rgb=new Float32Array(n*3);
 for(let i=0;i<n;i++){const r=d[i*4]/255,gg=d[i*4+1]/255,b=d[i*4+2]/255;rgb[i*3]=r;rgb[i*3+1]=gg;rgb[i*3+2]=b;g[i]=.299*r+.587*gg+.114*b;}
 const lap=new Float32Array(n);
 for(let y=1;y<h-1;y++)for(let x2=1;x2<w-1;x2++){const i=y*w+x2;lap[i]=Math.abs(4*g[i]-g[i-1]-g[i+1]-g[i-w]-g[i+w]);}
 const sm=boxMean(lap,w,h,Math.max(3,Math.round(w/40)));
 const sorted=Array.from(sm).sort((a,b)=>a-b),p95=sorted[Math.floor(n*.95)]||1;
 const heur=new Float32Array(n);
 for(let y=0;y<h;y++)for(let x2=0;x2<w;x2++){const i=y*w+x2,yy=y/h,cd=Math.hypot(x2/w-.5,yy-.5)/.7;
  heur[i]=clamp(.92-.42*yy-.28*Math.min(sm[i]/p95,1)-.12*Math.max(0,1-cd),.02,1);}
 return {w,h,g,rgb,heur};
}
function gridAt(G,u,v){
 const R=G.length,C=G[0].length,fx=clamp(u*C-.5,0,C-1),fy=clamp(v*R-.5,0,R-1),x0=Math.floor(fx),y0=Math.floor(fy),x1=Math.min(C-1,x0+1),y1=Math.min(R-1,y0+1),tx=fx-x0,ty=fy-y0;
 const a=G[y0][x0]*(1-tx)+G[y0][x1]*tx,b=G[y1][x0]*(1-tx)+G[y1][x1]*tx;return a*(1-ty)+b*ty;
}
function fuse(B,ai){
 const {w,h}=B,n=w*h,d=new Float32Array(n);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=y*w+x;d[i]=ai&&ai.depth?.72*gridAt(ai.depth,(x+.5)/w,(y+.5)/h)+.28*B.heur[i]:B.heur[i];}
 if(ai&&ai.box){
  const [bx,by,bw,bh]=ai.box;let mr=0,mg=0,mb=0,cnt=0;
  for(let y=Math.floor((by+bh*.3)*h);y<(by+bh*.7)*h;y++)for(let x=Math.floor((bx+bw*.3)*w);x<(bx+bw*.7)*w;x++){const i=y*w+x;if(i<0||i>=n)continue;mr+=B.rgb[i*3];mg+=B.rgb[i*3+1];mb+=B.rgb[i*3+2];cnt++;}
  if(cnt){mr/=cnt;mg/=cnt;mb/=cnt;
   const sd=ai.focus?d[clamp(Math.floor(ai.focus[1]*h),0,h-1)*w+clamp(Math.floor(ai.focus[0]*w),0,w-1)]:d[Math.floor((by+bh/2)*h)*w+Math.floor((bx+bw/2)*w)];
   for(let y=Math.floor((by-bh*.05)*h);y<(by+bh*1.05)*h;y++)for(let x=Math.floor((bx-bw*.05)*w);x<(bx+bw*1.05)*w;x++){
    if(x<0||y<0||x>=w||y>=h)continue;const i=y*w+x;
    const dr=B.rgb[i*3]-mr,dg=B.rgb[i*3+1]-mg,db=B.rgb[i*3+2]-mb,sim=Math.exp(-(dr*dr+dg*dg+db*db)/(2*.16*.16));
    const ex=Math.min((x/w-bx)/bw,(bx+bw-x/w)/bw,(y/h-by)/bh,(by+bh-y/h)/bh),win=clamp(ex*6+.3,0,1);
    d[i]=d[i]+(sd-d[i])*.85*sim*win;}
  }
 }
 let q=guided(B.g,d,w,h,Math.max(4,Math.round(w/45)),.002);
 q=guided(B.g,q,w,h,Math.max(2,Math.round(w/110)),.0008);
 return q;
}
function depthCanvas(arr,w,h){
 const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d'),id=x.createImageData(w,h);
 for(let i=0;i<w*h;i++){const v=Math.round(arr[i]*255);id.data[i*4]=v;id.data[i*4+1]=v;id.data[i*4+2]=v;id.data[i*4+3]=255;}
 x.putImageData(id,0,0);return c;
}

/* ---------- Sample scene (drawn in code, with exact depth) ---------- */
function sampleScene(){
 const W=2400,H=1600,c=document.createElement('canvas');c.width=W;c.height=H;const x=c.getContext('2d');
 const dc=document.createElement('canvas');dc.width=480;dc.height=320;const y=dc.getContext('2d');y.scale(.2,.2);
 const gr=v=>{const k=Math.round(v*255);return `rgb(${k},${k},${k})`};
 let seed=7;const R=()=>(seed=(seed*16807)%2147483647)/2147483647;
 const ty=H*.62;
 let g=x.createLinearGradient(0,0,0,ty);g.addColorStop(0,'#0c1626');g.addColorStop(.55,'#24324f');g.addColorStop(1,'#b8704a');x.fillStyle=g;x.fillRect(0,0,W,H);
 y.fillStyle=gr(1);y.fillRect(0,0,W,H);
 for(let bx=-40;bx<W;){const bw=70+R()*150,bh=120+R()*480;x.fillStyle=R()>.5?'#121a2a':'#0f1522';x.fillRect(bx,ty-bh,bw-6,bh);y.fillStyle=gr(.96);y.fillRect(bx,ty-bh,bw-6,bh);
  for(let wy=ty-bh+16;wy<ty-12;wy+=26)for(let wx=bx+10;wx<bx+bw-22;wx+=22)if(R()<.32){x.fillStyle=R()>.3?'#ffcf7a':'#bfe6ff';x.globalAlpha=.55+R()*.45;x.fillRect(wx,wy,9,12);x.globalAlpha=1;}
  bx+=bw;}
 const cols=['#ffd28a','#ffffff','#8fd3ff','#ff9a6b','#ffe7b3'];
 for(let i=0;i<150;i++){const px=R()*W,py=H*(.26+R()*.34),r=5+R()*11,col=cols[Math.floor(R()*cols.length)];
  const rg=x.createRadialGradient(px,py,0,px,py,r*3);rg.addColorStop(0,col);rg.addColorStop(.3,col);rg.addColorStop(1,'rgba(0,0,0,0)');x.fillStyle=rg;x.globalAlpha=.9;x.beginPath();x.arc(px,py,r*3,0,7);x.fill();x.globalAlpha=1;
  y.fillStyle=gr(.93);y.beginPath();y.arc(px,py,r*1.4,0,7);y.fill();}
 x.strokeStyle='#1a1410';x.lineWidth=3;x.beginPath();
 const cat=t=>[-100+t*(W+200),260+t*160+Math.sin(t*Math.PI)*240];
 for(let t=0;t<=1;t+=.01){const [a,b]=cat(t);t?x.lineTo(a,b):x.moveTo(a,b);}x.stroke();
 for(let t=.02;t<1;t+=.03){const [a,b]=cat(t);const rg=x.createRadialGradient(a,b+14,0,a,b+14,34);rg.addColorStop(0,'#fff6d8');rg.addColorStop(.25,'#ffc463');rg.addColorStop(1,'rgba(255,170,60,0)');x.fillStyle=rg;x.beginPath();x.arc(a,b+14,34,0,7);x.fill();y.fillStyle=gr(.62);y.beginPath();y.arc(a,b+14,13,0,7);y.fill();}
 g=x.createLinearGradient(0,ty,0,H);g.addColorStop(0,'#3a322b');g.addColorStop(1,'#120e0b');x.fillStyle=g;x.fillRect(0,ty,W,H-ty);
 for(let i=0;i<26;i++){x.strokeStyle=`rgba(255,240,220,${.03+R()*.05})`;x.lineWidth=1+R()*3;x.beginPath();x.moveTo(R()*W,ty);x.bezierCurveTo(R()*W,ty+200,R()*W,H-200,R()*W,H);x.stroke();}
 const rg2=x.createRadialGradient(W*.5,ty+40,10,W*.5,ty+40,W*.5);rg2.addColorStop(0,'rgba(255,180,110,.25)');rg2.addColorStop(1,'rgba(0,0,0,0)');x.fillStyle=rg2;x.fillRect(0,ty,W,H-ty);
 g=y.createLinearGradient(0,ty,0,H);g.addColorStop(0,gr(.5));g.addColorStop(1,gr(.04));y.fillStyle=g;y.fillRect(0,ty,W,H-ty);
 const rr=(cx,a,b,w2,h2,r)=>{cx.beginPath();cx.moveTo(a+r,b);cx.arcTo(a+w2,b,a+w2,b+h2,r);cx.arcTo(a+w2,b+h2,a,b+h2,r);cx.arcTo(a,b+h2,a,b,r);cx.arcTo(a,b,a+w2,b,r);cx.closePath();};
 x.fillStyle='rgba(0,0,0,.45)';x.beginPath();x.ellipse(1720,ty+262,120,22,0,0,7);x.fill();
 rr(x,1620,ty+40,200,220,18);g=x.createLinearGradient(1620,0,1820,0);g.addColorStop(0,'rgba(255,220,170,.18)');g.addColorStop(.5,'rgba(255,240,210,.45)');g.addColorStop(1,'rgba(255,220,170,.15)');x.fillStyle=g;x.fill();
 rr(x,1640,ty+110,160,140,10);x.fillStyle='#efe4d0';x.fill();
 let fl=x.createRadialGradient(1720,ty+60,0,1720,ty+60,90);fl.addColorStop(0,'#fffbe8');fl.addColorStop(.2,'#ffc65a');fl.addColorStop(1,'rgba(255,150,40,0)');x.fillStyle=fl;x.beginPath();x.arc(1720,ty+60,90,0,7);x.fill();
 rr(y,1620,ty+20,200,240,18);y.fillStyle=gr(.4);y.fill();
 x.fillStyle='rgba(0,0,0,.55)';x.beginPath();x.ellipse(1000,1170,220,34,0,0,7);x.fill();
 const bx0=860,bw0=280,by0=640,bh0=520;
 rr(x,bx0,by0,bw0,bh0,46);g=x.createLinearGradient(bx0,0,bx0+bw0,0);g.addColorStop(0,'#5e3210');g.addColorStop(.25,'#c27a2e');g.addColorStop(.5,'#f6c477');g.addColorStop(.75,'#b56c26');g.addColorStop(1,'#4a260b');x.fillStyle=g;x.fill();
 x.strokeStyle='rgba(255,236,200,.5)';x.lineWidth=4;x.stroke();
 rr(x,bx0+26,by0+30,24,bh0-80,12);x.fillStyle='rgba(255,255,255,.55)';x.fill();
 rr(x,bx0+60,by0+210,bw0-120,150,8);x.fillStyle='#f3eadb';x.fill();
 x.fillStyle='#3b2a1a';x.font='600 36px Georgia,serif';x.textAlign='center';x.fillText('LUMEN',bx0+bw0/2,by0+290);x.font='20px Georgia,serif';x.fillText('eau de parfum',bx0+bw0/2,by0+330);
 rr(x,960,560,80,90,8);x.fillStyle='#d9a25a';x.fill();
 rr(x,920,430,160,150,14);g=x.createLinearGradient(920,0,1080,0);g.addColorStop(0,'#6b5320');g.addColorStop(.3,'#f6dd96');g.addColorStop(.55,'#b48d3e');g.addColorStop(1,'#4d3a12');x.fillStyle=g;x.fill();
 for(let k=0;k<8;k++){x.fillStyle='rgba(0,0,0,.18)';x.fillRect(930+k*19,436,4,138);}
 y.fillStyle=gr(.26);rr(y,bx0,by0,bw0,bh0,46);y.fill();rr(y,920,430,160,230,14);y.fill();
 const rf=x.createLinearGradient(0,1160,0,1330);rf.addColorStop(0,'rgba(230,160,80,.28)');rf.addColorStop(1,'rgba(0,0,0,0)');x.fillStyle=rf;x.fillRect(bx0+10,1160,bw0-20,170);
 const leaf=(px,py,a,s,col)=>{x.save();x.translate(px,py);x.rotate(a);x.fillStyle=col;x.beginPath();x.ellipse(0,0,s,s*.42,0,0,7);x.fill();x.restore();y.save();y.translate(px,py);y.rotate(a);y.fillStyle=gr(.03);y.beginPath();y.ellipse(0,0,s,s*.42,0,0,7);y.fill();y.restore();};
 leaf(140,1480,-.6,200,'#2f5a33');leaf(320,1560,.3,170,'#3f7340');leaf(60,1300,-1.1,150,'#264a2a');
 x.fillStyle='#d7b46a';x.beginPath();x.arc(1960,1440,46,0,7);x.lineWidth=14;x.strokeStyle='#e8c97e';x.stroke();
 y.strokeStyle=gr(.1);y.lineWidth=16;y.beginPath();y.arc(1960,1440,46,0,7);y.stroke();
 return {c,dc};
}


window.PBL=Object.assign(window.PBL||{},{E,initGL,upload,renderGL,depthBase,fuse,depthCanvas,sampleScene,clamp});
})();
