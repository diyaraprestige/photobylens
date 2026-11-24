/* Photobylens 3D lens renderer (Three.js r150). Builds a physically based lens model per catalogue entry.
   PBL.lens3d.still(lens) -> Promise<dataURL> for cards; PBL.lens3d.mount(canvas) -> interactive viewer with .show(lens). */
(function(){
if(!window.THREE){window.PBL=Object.assign(window.PBL||{},{lens3d:null});return;}
const T=THREE;
const tex={};
function ribTexture(){
 if(tex.rib)return tex.rib;
 const c=document.createElement('canvas');c.width=256;c.height=8;const x=c.getContext('2d');
 x.fillStyle='#888';x.fillRect(0,0,256,8);
 for(let i=0;i<256;i+=8){const g=x.createLinearGradient(i,0,i+8,0);g.addColorStop(0,'#222');g.addColorStop(.5,'#fff');g.addColorStop(1,'#222');x.fillStyle=g;x.fillRect(i,0,8,8);}
 const t=new T.CanvasTexture(c);t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(14,1);return tex.rib=t;
}
function labelTexture(text,dark){
 const c=document.createElement('canvas');c.width=2048;c.height=128;const x=c.getContext('2d');
 x.clearRect(0,0,2048,128);x.font='600 56px Inter, Helvetica, Arial, sans-serif';x.textBaseline='middle';
 x.fillStyle=dark?'rgba(40,42,48,.92)':'rgba(238,240,245,.92)';
 x.textAlign='center';for(const cx of [341,1024,1707]){x.fillText(text,cx,68);}
 const t=new T.CanvasTexture(c);t.anisotropy=4;return t;
}
const MAT={
 k:()=>new T.MeshPhysicalMaterial({color:0x060608,metalness:.2,roughness:.48,clearcoat:.3,clearcoatRoughness:.4,envMapIntensity:.55}),
 w:()=>new T.MeshPhysicalMaterial({color:0xefefeb,metalness:0,roughness:.36,clearcoat:.7,clearcoatRoughness:.2}),
 s:()=>new T.MeshPhysicalMaterial({color:0xd8dbe0,metalness:1,roughness:.24}),
 b:()=>new T.MeshPhysicalMaterial({color:0xcaa35c,metalness:1,roughness:.3})
};
const rubber=()=>new T.MeshPhysicalMaterial({color:0x08080a,metalness:0,roughness:.8,envMapIntensity:.5,bumpMap:ribTexture(),bumpScale:2.2});
const chrome=()=>new T.MeshPhysicalMaterial({color:0xe9eaec,metalness:1,roughness:.12});
const matte=()=>new T.MeshStandardMaterial({color:0x050506,roughness:.95,metalness:0});
const glass=()=>new T.MeshPhysicalMaterial({color:0x020405,metalness:0,roughness:.03,clearcoat:1,clearcoatRoughness:0,iridescence:1,iridescenceIOR:1.8,iridescenceThicknessRange:[200,700],envMapIntensity:1.15,specularIntensity:.9});
const accent=()=>new T.MeshStandardMaterial({color:0x6a6cf6,emissive:0x3b3dd0,emissiveIntensity:.35,roughness:.3,metalness:.2});

function cyl(r0,r1,y0,y1,mat,open){const g=new T.CylinderGeometry(r1,r0,y1-y0,128,1,!!open);const m=new T.Mesh(g,mat);m.position.y=(y0+y1)/2;return m;}

function buildLens(L){
 const grp=new T.Group(),b=L.b||{l:.4,d:.6,c:'k'},c=L.ch||{};
 if(L.id==='phone'){
  const body=new T.Mesh(new T.BoxGeometry(2.2,.18,2.2),new T.MeshPhysicalMaterial({color:0x1b1c22,metalness:.3,roughness:.25,clearcoat:1}));grp.add(body);
  body.material.color.set(0x111218);
  [[-.5,-.5],[.5,-.5],[-.5,.5]].forEach(([x,z])=>{const ring=cyl(.44,.44,0,.2,chrome());ring.position.set(x,.09,z);grp.add(ring);const ins=cyl(.36,.36,.2,.21,matte());ins.position.set(x,0,z);ins.position.y=.2;grp.add(ins);const g=new T.Mesh(new T.SphereGeometry(.5,48,24,0,Math.PI*2,0,.62),glass());g.position.set(x,.2-.5*Math.cos(.62)+.03,z);grp.add(g);});
  grp.rotation.x=.9;return grp;
 }
 const paint=MAT[b.c]||MAT.k,len=.8+b.l*3.6,r=.48+b.d*.58,zoom=Array.isArray(L.f);
 const fish=!!c.fish,tele=(Array.isArray(L.f)?L.f[1]:L.f)>=300;
 // rear mount + body
 grp.add(cyl(r*.7,r*.7,-.1,0,chrome()));
 grp.add(cyl(r*.62,r*.62,-.16,-.1,matte()));
 grp.add(cyl(r*.84,r*.9,0,len*.1,paint()));
 grp.add(cyl(r*.9,r*.93,len*.1,len*.18,paint()));
 const f0=zoom?.6:.46,f1=zoom?.78:.72;
 if(zoom){grp.add(cyl(r*.95,r*.95,len*.18,len*.32,paint()));grp.add(cyl(r*.99,r*.99,len*.32,len*.52,rubber()));grp.add(cyl(r*.95,r*.95,len*.52,len*f0,paint()));}
 else grp.add(cyl(r*.93,r*.95,len*.18,len*f0,paint()));
 grp.add(cyl(r,r,len*f0,len*f1,b.c==='s'||b.c==='b'?(()=>{const m=paint();m.bumpMap=ribTexture();m.bumpScale=1.6;return m})():rubber()));
 grp.add(cyl(r*.97,r*.97,len*f1,len*.84,paint()));
 grp.add(cyl(r*1.012,r*1.012,len*.84,len*.855,accent()));
 const fr=tele?r*1.32:fish?r*1.06:r*1.04;
 grp.add(cyl(r*.99,fr,len*.855,len,paint()));
 // label band
 const label=`${zoomR(L)?zoomR(L).join('-'):L.f}mm  1:${String(+(+L.N).toFixed(2))}`;
 const lb=cyl(r*.952,r*.952,len*.2,len*.3,new T.MeshBasicMaterial({map:labelTexture(label,b.c==='w'),transparent:true,depthWrite:false}),true);
 lb.position.y=zoom?len*.25:len*.3;lb.rotation.y=Math.PI*.15;grp.add(lb);
 // front face
 const face=new T.Mesh(new T.RingGeometry(fr*.8,fr,96),matte());face.rotation.x=-Math.PI/2;face.position.y=len+.001;grp.add(face);
 const thread=new T.Mesh(new T.TorusGeometry(fr*.82,.012,8,96),chrome());thread.rotation.x=Math.PI/2;thread.position.y=len;grp.add(thread);
 for(let i=1;i<=3;i++){grp.add(cyl(fr*(.8-i*.07),fr*(.8-i*.07),len-.06*i-.04,len-.06*i,matte(),true));}
 const gr=fr*.79,th=fish?1.25:.42,R=gr/Math.sin(th);
 const cap=new T.Mesh(new T.SphereGeometry(R,96,48,0,Math.PI*2,0,th),glass());cap.position.y=len-R*Math.cos(th)-(fish?-.02:.04);grp.add(cap);
 const inner=new T.Mesh(new T.SphereGeometry(gr*.55/Math.sin(.5),64,32,0,Math.PI*2,0,.5),glass());inner.position.y=len-.28-gr*.55/Math.sin(.5)*Math.cos(.5);grp.add(inner);
 if(tele){const hood=cyl(fr*1.0,fr*1.08,len,len+r*.55,paint(),true);grp.add(hood);const hin=cyl(fr*.99,fr*1.07,len,len+r*.55,matte(),true);hin.material.side=T.BackSide;grp.add(hin);}
 grp.rotation.z=-Math.PI/2;
 const outer=new T.Group();outer.add(grp);grp.position.x=-len/2;
 outer.rotation.y=-.48;outer.rotation.x=.16;
 return outer;
}
const zoomR=L=>Array.isArray(L.f)?L.f:null;

function makeEnv(renderer){
 const pm=new T.PMREMGenerator(renderer),s=new T.Scene();
 s.add(new T.Mesh(new T.BoxGeometry(24,14,24),new T.MeshBasicMaterial({color:new T.Color('#5b5e86'),side:T.BackSide})));
 const panel=(w,h,p,col,k)=>{const m=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({color:new T.Color(col).multiplyScalar(k),side:T.DoubleSide}));m.position.set(...p);m.lookAt(0,0,0);s.add(m);};
 panel(14,4,[0,6.8,0],'#ffffff',5);panel(5,9,[-10,1,3],'#d9dcff',3.2);panel(5,9,[10,0,-4],'#ffffff',3.6);panel(9,2.5,[0,-5,9],'#8f91ff',2.2);panel(3,3,[4,3,10],'#ffe9c9',3);
 const t=pm.fromScene(s,.035).texture;pm.dispose();return t;
}
function fit(cam,obj,pad){
 const box=new T.Box3().setFromObject(obj),sz=box.getSize(new T.Vector3()),ctr=box.getCenter(new T.Vector3());
 obj.position.sub(ctr);const rad=sz.length()/2;
 const dist=rad/Math.tan(T.MathUtils.degToRad(cam.fov/2))*(pad||1)*.82;
 cam.position.set(0,rad*.18,dist);cam.lookAt(0,0,0);cam.near=dist/50;cam.far=dist*10;cam.updateProjectionMatrix();
}
function setupRenderer(canvas,w,h){
 const r=new T.WebGLRenderer({canvas,antialias:true,alpha:true,preserveDrawingBuffer:true});
 r.setPixelRatio(1);r.setSize(w,h,false);r.outputEncoding=T.sRGBEncoding;r.toneMapping=T.ACESFilmicToneMapping;r.toneMappingExposure=1.05;
 return r;
}
function sceneFor(env){
 const s=new T.Scene();s.environment=env;
 const key=new T.DirectionalLight(0xffffff,1.1);key.position.set(3,5,4);s.add(key);
 const rim=new T.DirectionalLight(0x8f91ff,1.2);rim.position.set(-4,1,-3);s.add(rim);
 return s;
}
// Stills for cards (one offscreen renderer, cached per lens)
let still=null;const cache={};
function renderStill(L){
 if(cache[L.id])return cache[L.id];
 if(!still){const cv=document.createElement('canvas');still={r:setupRenderer(cv,720,480),cam:new T.PerspectiveCamera(26,1.5,.1,100)};still.env=makeEnv(still.r);}
 const s=sceneFor(still.env),m=buildLens(L);s.add(m);fit(still.cam,m,1.02);
 still.r.render(s,still.cam);const url=still.r.domElement.toDataURL('image/png');
 m.traverse(o=>{if(o.geometry)o.geometry.dispose();});
 return cache[L.id]=url;
}
// Interactive viewer
function mount(canvas){
 const w=()=>canvas.clientWidth||600,h=()=>canvas.clientHeight||400;
 const r=setupRenderer(canvas,w(),h());r.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
 const env=makeEnv(r),cam=new T.PerspectiveCamera(26,w()/h(),.1,100);
 let scene=sceneFor(env),model=null,spin=0,drag=null,yaw=0,pitch=0,vy=0;
 const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
 canvas.addEventListener('pointerdown',e=>{drag={x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);});
 canvas.addEventListener('pointermove',e=>{if(!drag)return;vy=(e.clientX-drag.x)*.01;yaw+=vy;pitch=Math.max(-.6,Math.min(.6,pitch+(e.clientY-drag.y)*.006));drag={x:e.clientX,y:e.clientY};});
 canvas.addEventListener('pointerup',()=>{drag=null;});
 function size(){const W=w(),H=h();r.setSize(W,H,false);cam.aspect=W/H;cam.updateProjectionMatrix();}
 new ResizeObserver(size).observe(canvas);
 let t0=performance.now();
 function loop(t){
  const dt=Math.min(.05,(t-t0)/1000);t0=t;
  if(model){if(!drag){vy*=.94;yaw+=vy+(reduce?0:dt*.25);}model.rotation.y=yaw;model.rotation.x=pitch;model.position.y=reduce?0:Math.sin(t/1400)*.04;}
  r.render(scene,cam);requestAnimationFrame(loop);
 }
 requestAnimationFrame(loop);
 return {show(L){
  if(model){scene.remove(model);model.traverse(o=>{if(o.geometry)o.geometry.dispose();});}
  const m=buildLens(L);model=new T.Group();model.add(m);scene.add(model);fit(cam,m,1.05);yaw=0;
 }};
}
window.PBL=Object.assign(window.PBL||{},{lens3d:{still:renderStill,mount}});
})();
