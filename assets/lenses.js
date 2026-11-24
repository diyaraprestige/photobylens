/* Photobylens lens catalogue. Add `img:"assets/lenses/<id>.png"` to any lens to use a licensed product photo instead of the 3D render. */
(function(){
const fmt=n=>String(+(+n).toFixed(2));
const CATS=['Ultra-wide','Wide','Standard','Portrait','Telephoto','Super-tele','Macro','Fisheye','Tilt-shift','Cinema','Vintage'];
const DEF={con:0,sat:0,vib:.05,warm:0,clar:0,sharp:0,vig:0,ca:0,dist:0,glow:0,flare:0,grain:0,fade:0,cat:.2,sq:1,bub:0,hl:.55,fish:0,tilt:0,macro:0,aspect:0};
const LENSES=[
 {id:'phone',name:'Your phone, main camera',cat:'Original',f:26,N:1.8,look:'Exactly as you shot it, the reference for every comparison.',best:'Reference',ch:{vib:0,cat:0},b:{l:.08,d:.3,c:'k'}},
 {id:'nikon-z-14-24',name:'Nikon Z 14-24mm f/2.8 S',cat:'Ultra-wide',f:[14,24],N:2.8,look:'Crisp corner-to-corner, low distortion, punchy night skies.',best:'Landscape, astro, interiors',ch:{con:.2,clar:.35,sharp:.45,vig:.25,dist:.03,cat:.1},b:{l:.5,d:.8,c:'k'}},
 {id:'sony-12-24gm',name:'Sony FE 12-24mm f/2.8 GM',cat:'Ultra-wide',f:[12,24],N:2.8,look:'Dramatic extreme-wide drawing with strong contrast and well-tamed flare.',best:'Architecture, travel',ch:{con:.25,sat:.1,clar:.35,sharp:.45,vig:.3,dist:.06},b:{l:.5,d:.82,c:'k'}},
 {id:'laowa-12',name:'Laowa 12mm f/2.8 Zero-D',cat:'Ultra-wide',f:12,N:2.8,look:'Near-zero distortion, so straight lines stay straight even at 12mm.',best:'Architecture, real estate',ch:{con:.18,clar:.3,sharp:.4,vig:.3},b:{l:.32,d:.62,c:'k'}},
 {id:'canon-rf-15-35',name:'Canon RF 15-35mm f/2.8L IS USM',cat:'Ultra-wide',f:[15,35],N:2.8,look:'Warm, rich colour with crisp sunstars and stabilised handheld shots.',best:'Events, landscape',ch:{con:.2,sat:.12,warm:.25,clar:.3,sharp:.4,vig:.25,dist:.04},b:{l:.48,d:.74,c:'k'}},
 {id:'sigma-24-art',name:'Sigma 24mm f/1.4 DG DN Art',cat:'Wide',f:24,N:1.4,look:'Bright wide prime, sharp wide open with low coma.',best:'Astro, street, environmental portraits',ch:{con:.2,clar:.3,sharp:.45,vig:.35,dist:.02,cat:.35,hl:.6},b:{l:.36,d:.62,c:'k'}},
 {id:'sony-35gm',name:'Sony FE 35mm f/1.4 GM',cat:'Wide',f:35,N:1.4,look:'Clean, modern sharpness with smooth background falloff.',best:'Documentary, everyday',ch:{con:.2,clar:.3,sharp:.45,vig:.2,cat:.2,hl:.6},b:{l:.36,d:.6,c:'k'}},
 {id:'leica-35-lux',name:'Leica Summilux-M 35mm f/1.4 ASPH.',cat:'Wide',f:35,N:1.4,look:'Leica micro-contrast and gentle, classic falloff in a tiny body.',best:'Street, reportage',ch:{con:.28,sat:.05,warm:.1,clar:.45,sharp:.4,vig:.3,cat:.35,hl:.6},b:{l:.2,d:.45,c:'k'}},
 {id:'sony-24-70gm2',name:'Sony FE 24-70mm f/2.8 GM II',cat:'Standard',f:[24,70],N:2.8,look:'The do-everything zoom: sharp, neutral, smooth bokeh.',best:'Weddings, travel, events',ch:{con:.2,clar:.3,sharp:.45,vig:.15,cat:.2},b:{l:.55,d:.68,c:'k'}},
 {id:'canon-28-70',name:'Canon RF 28-70mm f/2L USM',cat:'Standard',f:[28,70],N:2,look:'An f/2 zoom with prime-like subject separation.',best:'Weddings, portraits on the move',ch:{con:.22,sat:.12,warm:.2,clar:.3,sharp:.4,vig:.2,cat:.25,hl:.6},b:{l:.6,d:.78,c:'k'}},
 {id:'canon-50-12',name:'Canon RF 50mm f/1.2L USM',cat:'Standard',f:50,N:1.2,look:'Creamy bokeh, high contrast and warm, flattering colour.',best:'Portraits, low light',ch:{con:.25,sat:.12,warm:.25,clar:.3,sharp:.35,vig:.3,cat:.35,hl:.62},b:{l:.42,d:.72,c:'k'}},
 {id:'sony-50gm',name:'Sony FE 50mm f/1.2 GM',cat:'Standard',f:50,N:1.2,look:'Sharp wide open with round, 11-blade bokeh.',best:'Portraits, editorial',ch:{con:.22,clar:.35,sharp:.45,vig:.2,cat:.2,hl:.62},b:{l:.4,d:.68,c:'k'}},
 {id:'nikon-noct',name:'Nikon Z 58mm f/0.95 S Noct',cat:'Standard',f:58,N:.95,look:'A razor-thin plane of focus that melts into buttery transitions.',best:'Fine-art portraits, night',ch:{con:.18,sat:.08,clar:.3,sharp:.35,vig:.35,cat:.3,hl:.66},b:{l:.62,d:.86,c:'k'}},
 {id:'noctilux',name:'Leica Noctilux-M 50mm f/0.95 ASPH.',cat:'Standard',f:50,N:.95,look:'Dreamy f/0.95 glow with cat\'s-eye bokeh toward the corners.',best:'Night street, intimate portraits',ch:{con:.12,sat:.05,warm:.1,clar:.2,sharp:.25,vig:.45,cat:.6,glow:.25,hl:.7},b:{l:.34,d:.62,c:'k'}},
 {id:'sony-85gm2',name:'Sony FE 85mm f/1.4 GM II',cat:'Portrait',f:85,N:1.4,look:'Crisp eyes, silky 11-blade bokeh and fast, clean rendering.',best:'Headshots, fashion',ch:{con:.22,clar:.3,sharp:.5,vig:.2,cat:.2,hl:.62},b:{l:.48,d:.7,c:'k'}},
 {id:'canon-85-12',name:'Canon RF 85mm f/1.2L USM',cat:'Portrait',f:85,N:1.2,look:'Luminous skin tones and enormous subject separation.',best:'Portraits, weddings',ch:{con:.2,sat:.12,warm:.3,clar:.25,sharp:.35,vig:.25,cat:.3,hl:.66},b:{l:.55,d:.84,c:'k'}},
 {id:'otus-85',name:'Zeiss Otus 85mm f/1.4',cat:'Portrait',f:85,N:1.4,look:'Apochromatic, nearly fringe-free, with famous 3D pop.',best:'Studio portraits, product',ch:{con:.32,sat:.15,clar:.5,sharp:.5,vig:.2,cat:.2},b:{l:.6,d:.8,c:'k'}},
 {id:'sigma-105',name:'Sigma 105mm f/1.4 DG HSM Art',cat:'Portrait',f:105,N:1.4,look:'Nicknamed the Bokeh Master: huge, smooth out-of-focus discs.',best:'Portraits, night bokeh',ch:{con:.22,clar:.3,sharp:.45,vig:.25,cat:.15,hl:.72},b:{l:.7,d:.92,c:'k'}},
 {id:'canon-135',name:'Canon RF 135mm f/1.8L IS USM',cat:'Portrait',f:135,N:1.8,look:'Backgrounds dissolve completely behind a crisp, compressed subject.',best:'Portraits, events from distance',ch:{con:.22,sat:.1,warm:.2,clar:.3,sharp:.45,vig:.2,cat:.2,hl:.62},b:{l:.62,d:.76,c:'k'}},
 {id:'canon-70-200',name:'Canon RF 70-200mm f/2.8L IS USM Z',cat:'Telephoto',f:[70,200],N:2.8,look:'Compressed backgrounds and clean isolation with warm Canon colour.',best:'Portraits, weddings, sport',ch:{con:.22,sat:.12,warm:.2,clar:.3,sharp:.45,vig:.15,cat:.15},b:{l:.66,d:.66,c:'w'}},
 {id:'sony-70-200gm2',name:'Sony FE 70-200mm f/2.8 GM OSS II',cat:'Telephoto',f:[70,200],N:2.8,look:'Featherweight flagship zoom, sharp and neutral with smooth bokeh.',best:'Events, sport, portraits',ch:{con:.22,clar:.32,sharp:.48,vig:.15,cat:.15},b:{l:.78,d:.66,c:'w'}},
 {id:'nikon-70-200',name:'Nikon Z 70-200mm f/2.8 VR S',cat:'Telephoto',f:[70,200],N:2.8,look:'Biting sharpness, neutral colour and beautifully even bokeh.',best:'Sport, stage, portraits',ch:{con:.24,sat:.08,clar:.35,sharp:.45,vig:.15,cat:.15},b:{l:.8,d:.66,c:'k'}},
 {id:'sony-200-600',name:'Sony FE 200-600mm f/5.6-6.3 G OSS',cat:'Telephoto',f:[200,600],N:5.6,Nt:6.3,look:'Huge reach with a clean, separated subject.',best:'Wildlife, birds, aviation',ch:{con:.2,clar:.3,sharp:.45,vig:.12},b:{l:.95,d:.78,c:'w'}},
 {id:'sony-400gm',name:'Sony FE 400mm f/2.8 GM OSS',cat:'Super-tele',f:400,N:2.8,look:'Subjects leap off a creamy, totally smooth background.',best:'Pro sport, wildlife',ch:{con:.25,clar:.35,sharp:.5,vig:.12,hl:.62},b:{l:.95,d:1,c:'w'}},
 {id:'canon-600',name:'Canon RF 600mm f/4L IS USM',cat:'Super-tele',f:600,N:4,look:'Extreme magnification and dreamy background compression.',best:'Birds, wildlife, sport',ch:{con:.25,sat:.12,warm:.2,clar:.35,sharp:.5,vig:.12,hl:.62},b:{l:1,d:1,c:'w'}},
 {id:'nikon-800pf',name:'Nikon Z 800mm f/6.3 VR S',cat:'Super-tele',f:800,N:6.3,look:'Phase Fresnel optics put 800mm in a hand-holdable body.',best:'Birds, distant wildlife',ch:{con:.24,clar:.35,sharp:.5,vig:.15},b:{l:1,d:.84,c:'k'}},
 {id:'canon-100-macro',name:'Canon RF 100mm f/2.8L Macro IS USM',cat:'Macro',f:100,N:2.8,look:'Up to 1.4x magnification with a wafer-thin, smooth focus plane.',best:'Product, flowers, detail',ch:{con:.25,sat:.12,warm:.15,clar:.4,sharp:.55,vig:.15,macro:1,hl:.5},b:{l:.56,d:.62,c:'k'}},
 {id:'sony-90-macro',name:'Sony FE 90mm f/2.8 Macro G OSS',cat:'Macro',f:90,N:2.8,look:'True 1:1, razor-sharp detail and gentle background blur.',best:'Product, jewellery, food',ch:{con:.25,clar:.45,sharp:.6,vig:.12,macro:1},b:{l:.56,d:.6,c:'k'}},
 {id:'laowa-100-2x',name:'Laowa 100mm f/2.8 2x Ultra Macro APO',cat:'Macro',f:100,N:2.8,look:'2:1 magnification, apochromatic and almost no fringing.',best:'Insects, textures, jewellery',ch:{con:.22,clar:.45,sharp:.55,vig:.15,macro:1.6},b:{l:.6,d:.56,c:'s'}},
 {id:'canon-8-15',name:'Canon EF 8-15mm f/4L Fisheye USM',cat:'Fisheye',f:[8,15],N:4,fdef:8,look:'Circular fisheye at 8mm, full-frame fisheye at 15mm.',best:'Skate, action, creative',ch:{con:.2,sat:.1,clar:.3,sharp:.35,vig:.2,fish:1},b:{l:.38,d:.7,c:'k'}},
 {id:'laowa-4',name:'Laowa 4mm f/2.8 Circular Fisheye',cat:'Fisheye',f:4,N:2.8,look:'A 210-degree circular world in a tiny lens.',best:'Creative, sky, POV',ch:{con:.15,clar:.25,sharp:.3,vig:.15,fish:2},b:{l:.16,d:.42,c:'s'}},
 {id:'canon-ts-24',name:'Canon TS-E 24mm f/3.5L II',cat:'Tilt-shift',f:24,N:3.5,look:'Tilted focus plane for the miniature-model look.',best:'Architecture, miniature cityscapes',ch:{con:.25,sat:.25,clar:.35,sharp:.45,vig:.12,tilt:1},b:{l:.46,d:.74,c:'k'}},
 {id:'canon-ts-90',name:'Canon TS-E 90mm f/2.8L Macro',cat:'Tilt-shift',f:90,N:2.8,look:'Selective focus band, a favourite for product and food.',best:'Product, food, still life',ch:{con:.25,sat:.2,clar:.4,sharp:.45,vig:.12,tilt:1},b:{l:.5,d:.66,c:'k'}},
 {id:'arri-sig-47',name:'ARRI Signature Prime 47mm T1.8',cat:'Cinema',f:47,N:1.8,t:1,look:'Natural, organic skin rendering with soft, graceful falloff.',best:'Film look, portraits',ch:{con:.06,sat:-.02,warm:.12,clar:.1,sharp:.2,vig:.3,cat:.3,glow:.12,grain:.25,fade:.25,hl:.6},b:{l:.5,d:.86,c:'k'}},
 {id:'cooke-s4-50',name:'Cooke S4/i 50mm T2',cat:'Cinema',f:50,N:2,t:1,look:'The warm, gentle "Cooke Look" loved on film sets.',best:'Cinematic portraits, mood',ch:{con:.1,sat:.02,warm:.3,clar:.15,sharp:.25,vig:.3,cat:.3,glow:.1,grain:.25,fade:.2},b:{l:.52,d:.82,c:'k'}},
 {id:'atlas-orion-65',name:'Atlas Orion 65mm T2 2x Anamorphic',cat:'Cinema',f:65,N:2,t:1,look:'Oval bokeh, blue horizontal streak flares and 2.39:1 widescreen.',best:'Cinematic, night city',ch:{con:.15,warm:-.15,clar:.2,sharp:.3,vig:.45,cat:.2,sq:1.9,flare:1,grain:.3,fade:.15,aspect:2.39,dist:.03,hl:.72},b:{l:.66,d:.8,c:'k'}},
 {id:'sirui-50-ana',name:'Sirui 50mm f/1.8 1.33x Anamorphic',cat:'Cinema',f:50,N:1.8,look:'Gentle oval bokeh and a signature blue streak flare.',best:'Music video, street cinema',ch:{con:.18,warm:-.1,clar:.25,sharp:.35,vig:.35,sq:1.33,flare:.75,aspect:2.39,grain:.15,hl:.66},b:{l:.42,d:.6,c:'k'}},
 {id:'helios-44',name:'Helios 44-2 58mm f/2',cat:'Vintage',f:58,N:2,look:'The legendary swirly bokeh with soft, nostalgic contrast.',best:'Portraits in foliage, dreamy',ch:{con:-.05,sat:-.05,warm:.2,clar:.05,sharp:.15,vig:.4,cat:1,glow:.18,ca:.006,grain:.2,fade:.12,hl:.6},b:{l:.3,d:.5,c:'s'}},
 {id:'trioplan-100',name:'Meyer-Optik Trioplan 100mm f/2.8',cat:'Vintage',f:100,N:2.8,look:'Soap-bubble bokeh: bright-rimmed circles that sparkle.',best:'Flowers, fairy lights',ch:{con:.05,warm:.15,clar:.1,sharp:.25,vig:.3,cat:.25,bub:1,hl:.85,glow:.1},b:{l:.5,d:.46,c:'s'}},
 {id:'petzval-80',name:'Lomography Petzval 80.5mm f/1.9 MKII',cat:'Vintage',f:80,N:1.9,look:'Sharp centre with an intense swirl and heavy vignette.',best:'Artistic portraits',ch:{con:.12,warm:.25,clar:.15,sharp:.3,vig:.5,cat:1.2,glow:.1,grain:.15,hl:.6},b:{l:.62,d:.52,c:'b'}},
 {id:'velvet-56',name:'Lensbaby Velvet 56',cat:'Vintage',f:56,N:1.6,look:'A velvety glow wide open that sharpens as you stop down.',best:'Soft portraits, flowers',ch:{con:-.05,warm:.15,sharp:.1,vig:.25,glow:.6,hl:.6},b:{l:.34,d:.52,c:'s'}}
];
const byId=Object.fromEntries(LENSES.map(l=>[l.id,l]));
const zoomR=L=>Array.isArray(L.f)?L.f:null;
const fDef=L=>L.fdef||(zoomR(L)?zoomR(L)[1]:L.f);
const Nat=(L,f)=>{const z=zoomR(L);return (L.Nt&&z)?L.N+(L.Nt-L.N)*(f-z[0])/(z[1]-z[0]):L.N};
const STD=[1.2,1.4,1.8,2,2.8,4,5.6,8,11,16];
const stops=(L,f)=>{const m=+Nat(L,f).toFixed(1);return [m,...STD.filter(s=>s>m+.05)]};
const fText=L=>{const z=zoomR(L);return z?`${z[0]}–${z[1]}mm`:`${L.f}mm`};
const nText=L=>(L.t?'T':'f/')+fmt(L.N)+(L.Nt?'–'+fmt(L.Nt):'');


function aiPrompt(){
 const ids=LENSES.filter(l=>l.id!=='phone').map(l=>`${l.id} = ${l.name} (${l.cat})`).join('\n');
 return `You are the vision engine and senior photo retoucher of a lens-simulation studio. Study the attached phone photo. Reply with ONLY one JSON object, no other text:
{"scene":"max 6 words","subject":{"label":"max 4 words","box":[x,y,w,h]},"head":[x,y,w,h] or null,"focus":[x,y],"lighting":"max 6 words","depth":[[16 numbers],...12 rows],"edit":{"exposure":0,"highlights":0,"shadows":0,"contrast":0,"vibrance":0,"warmth":0},"aperture":2.8,"picks":[{"id":"lens id","why":"max 14 words"}],"tip":"one sentence, max 22 words"}
Rules:
- Coordinates are fractions 0-1 of image width and height from the top-left.
- "subject.box" tightly covers the whole main subject (for a person: from the top of the hair to the lowest visible part of the body). "head" covers the main face/head, or null if there is no person or animal.
- "depth" is a 12-row by 16-column grid (row 0 = top); each value is the relative distance of what is visible in that cell: 0 = nearest to the camera, 1 = farthest (sky, far horizon). Follow subject edges carefully; floors and tables recede smoothly.
- "focus" is where a pro photographer would focus: the nearer eye for people and animals, else the key detail.
- "edit" is the correction a professional retoucher would apply so the photo looks like a finished, natural, well-exposed edit while staying true to the original: exposure in EV (-1.5 to 1.5), highlights recovery 0 to 1, shadows lift 0 to 1, contrast -0.3 to 0.5, vibrance -0.3 to 0.6, warmth -0.4 (cooler) to 0.4 (warmer) applied after neutral white balance to suit the mood. Keep values subtle when the photo is already good.
- "aperture" is the f-number a pro would choose for this scene with a fast lens (portrait 1.4-2.8, groups 2.8-4, products 2.8-5.6, landscape 8-11).
- "picks" are the 3 lenses from this list that would flatter this photo most:
${ids}`;
}
window.PBL=Object.assign(window.PBL||{},{aiPrompt,CATS,DEF,LENSES,byId,zoomR,fDef,Nat,STD,stops,fText,nText,fmt});
})();
