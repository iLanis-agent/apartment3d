// Apartment 3D - interactive walkthrough built from the floor plan.
// Walk (first-person), Arrange (move furniture), Paint (recolor walls).
import * as THREE from 'three';

// ---------- plan data ----------
// The layout is traced from the floor plan image in plan pixels (px,py), then converted to meters.
// North is up (-z), east is right (+x), exactly like the plan. Scale: 62 plan px = 1 m.
const S = 62, X0 = 60, Z0 = 60;
const mx = px => (px - X0) / S;
const mz = py => (py - Z0) / S;
const WALL_H = 2.7, EXT_T = 0.30, INT_T = 0.12;

// wall: [x1,y1,x2,y2] centerline in px; openings: {c (px along the wall axis), w (px), type}
const E = EXT_T, I = INT_T;
const WALLS_PX = [
  // --- exterior shell ---
  {p:[271,222,538,222],t:E,o:[{c:435,w:110,type:'door'}]},            // master north (window to NW deck)
  {p:[271,222,271,584],t:E,o:[]},                                       // master + west bath, west face
  {p:[271,584,388,584],t:E,o:[]},                                       // west bath south
  {p:[271,584,271,637],t:E,o:[]},                                       // terrace west return
  {p:[66,637,271,637],t:E,o:[]},                                        // terrace north parapet wall
  {p:[388,584,388,630],t:E,o:[]},                                       // plant niche east return
  {p:[388,630,584,630],t:E,o:[{c:507,w:115,type:'window'}]},          // safe room south
  {p:[584,630,787,630],t:E,o:[{c:696,w:72,type:'window'}]},           // kitchen south
  {p:[787,630,787,827],t:E,o:[{c:722,w:150,type:'door'}]},            // living west: sliding door to terrace
  {p:[787,827,1045,827],t:E,o:[]},                                      // living south
  {p:[1045,596,1045,827],t:E,o:[]},                                     // living east
  {p:[1045,596,1103,596],t:E,o:[]},                                     // entrance jog
  {p:[1103,497,1103,596],t:E,o:[{c:541,w:56,type:'door'}]},           // ENTRANCE DOOR
  {p:[1008,497,1177,497],t:E,o:[]},                                     // bathroom south
  {p:[1177,296,1177,497],t:E,o:[]},                                     // east shell
  {p:[958,296,1177,296],t:E,o:[{c:1027,w:40,type:'window'},{c:1090,w:50,type:'door'}]}, // WC window, shower door to NE deck
  {p:[958,155,958,296],t:E,o:[]},                                       // bedroom B east
  {p:[754,155,958,155],t:E,o:[{c:848,w:75,type:'window'}]},           // bedroom B north
  {p:[538,155,754,155],t:E,o:[{c:640,w:85,type:'window'}]},           // bedroom A north
  {p:[538,155,538,222],t:E,o:[]},
  // --- interior ---
  {p:[538,222,538,360],t:I,o:[]},                                       // master east (wardrobe wall)
  {p:[538,360,538,422],t:I,o:[]},                                       // placeholder, replaced below
  {p:[271,422,538,422],t:I,o:[{c:360,w:46,type:'door'}]},             // master south, door to en-suite
  {p:[388,422,388,584],t:I,o:[]},                                       // west bath | safe room
  {p:[388,427,584,427],t:I,o:[{c:560,w:50,type:'door'}]},             // safe room north
  {p:[584,427,584,630],t:I,o:[]},                                       // safe room | kitchen
  {p:[584,427,850,427],t:I,o:[]},                                       // kitchen north
  {p:[846,427,846,475],t:I,o:[]},                                       // counter end stub
  {p:[538,330,754,330],t:I,o:[{c:722,w:46,type:'door'}]},             // bedroom A south
  {p:[754,155,754,360],t:I,o:[]},                                       // A | B
  {p:[754,360,958,360],t:I,o:[{c:786,w:46,type:'door'}]},             // bedroom B south
  {p:[958,296,958,384],t:I,o:[]},                                       // WC west
  {p:[1054,296,1054,384],t:I,o:[]},                                     // WC | shower room
  {p:[958,384,1054,384],t:I,o:[{c:982,w:48,type:'door'}]},            // WC south door
  {p:[1054,384,1177,384],t:I,o:[{c:1105,w:46,type:'door'}]},          // shower room south door
  {p:[1008,384,1008,497],t:I,o:[{c:420,w:56,type:'door'}]},           // bathroom west door
  {p:[946,440,946,497],t:I,o:[]},                                       // utility niche
  {p:[946,497,1008,497],t:I,o:[]},
];
// master east wall: door opening toward the corridor (replaces the placeholder segment)
WALLS_PX.splice(WALLS_PX.findIndex(w=>w.p[1]===360&&w.p[0]===538), 1,
  {p:[538,360,538,422],t:I,o:[{c:391,w:50,type:'door'}]});
// convert to meters
const WALLS = WALLS_PX.map(w=>{
  const [a,b,c,d]=w.p, horiz=b===d;
  const x1=mx(a),z1=mz(b),x2=mx(c),z2=mz(d);
  const start = horiz ? Math.min(a,c) : Math.min(b,d);
  const lenpx = horiz ? Math.abs(c-a) : Math.abs(d-b);
  const ext=w.t/2;
  let X1=Math.min(x1,x2),Z1=Math.min(z1,z2),X2=Math.max(x1,x2),Z2=Math.max(z1,z2);
  if(horiz){X1-=ext;X2+=ext;} else {Z1-=ext;Z2+=ext;}
  return {x1:X1,z1:Z1,x2:X2,z2:Z2,t:w.t,
    openings:w.o.map(o=>({at:(o.c-start)/S+ext,w:o.w/S,type:o.type}))};
});

// floors: [x1,y1,x2,y2, kind] in px (wood pieces never overlap each other)
const FLOORS_PX = [
  [284,229,538,422,'wood'],                // master
  [538,155,754,330,'wood'],                // bedroom A
  [754,155,958,360,'wood'],                // bedroom B
  [538,330,754,427,'wood'],                // corridor
  [754,360,958,427,'wood'],
  [958,384,1103,427,'wood'],
  [850,427,1103,596,'wood'],               // hall / entrance
  [787,596,1045,827,'wood'],               // living room
  [392,427,584,630,'wood'],                // safe room (kids)
  [584,427,787,630,'kfloor'],              // kitchen + dining
  [787,427,850,596,'kfloor'],
  [277,428,382,578,'tile'],                // west bath
  [958,300,1054,384,'tile'],               // guest WC
  [1054,300,1171,384,'tile'],              // shower room
  [1008,384,1171,497,'tile'],              // bathroom
  [946,440,1008,497,'tile'],               // utility niche
  [66,637,787,828,'deck'],                 // big terrace
  [275,600,380,637,'deck'],
  [335,80,520,222,'deck'],                 // NW deck
  [972,145,1100,180,'deck'],               // NE deck
  [972,180,1192,296,'deck'],
  [1065,296,1115,300,'deck'],
  [520,80,972,155,'lawn'],                 // private garden
  [972,80,1085,145,'lawn'],
  [1103,497,1215,600,'stone'],             // entrance landing
];

const LABELS_PX = [
  [400,320,'חדר שינה הורים'],[646,250,'חדר שינה'],[856,262,'חדר שינה'],
  [488,540,'חדר שינה / ממ"ד'],[720,520,'מטבח'],[930,700,'חדר מגורים'],
  [330,505,'חדר רחצה'],[1005,340,'שירותי אורחים'],[1115,340,'חדר שירות'],[1090,445,'חדר רחצה'],
  [420,740,'מרפסת'],[780,100,'גינה פרטית'],[1150,545,'כניסה'],[1090,235,'מרפסת'],[430,120,'מרפסת'],[650,380,'פרוזדור'],
];

const CEIL_PX = [[271,222,538,427],[271,427,787,630],[538,155,958,427],[787,427,1045,827],[1045,427,1103,596],[958,296,1177,497]];

// ---------- renderer / scene ----------
const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({canvas, antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x9db8cc);
scene.fog = new THREE.Fog(0x9db8cc, 30, 90);

const walkCam = new THREE.PerspectiveCamera(72, 1, 0.05, 200);
const topCam  = new THREE.PerspectiveCamera(50, 1, 0.1, 300);
let activeCam = walkCam;

const hemi = new THREE.HemisphereLight(0xdfeaf2, 0x8a7f6a, 0.95);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff2dd, 1.6);
sun.position.set(-4, 22, 0); sun.target.position.set(9.2,0,6.2); scene.add(sun.target);
sun.castShadow = true;
sun.shadow.mapSize.set(2048,2048);
sun.shadow.camera.left=-18; sun.shadow.camera.right=18;
sun.shadow.camera.top=18; sun.shadow.camera.bottom=-18;
sun.shadow.camera.far=70; sun.shadow.bias=-0.0005;
scene.add(sun);
const fill = new THREE.AmbientLight(0xffffff, 0.22);
scene.add(fill);

// ---------- canvas textures ----------
function texCanvas(w,h,draw){
  const c=document.createElement('canvas'); c.width=w; c.height=h;
  draw(c.getContext('2d'),w,h);
  const t=new THREE.CanvasTexture(c);
  t.wrapS=t.wrapT=THREE.RepeatWrapping; t.colorSpace=THREE.SRGBColorSpace;
  return t;
}
const woodTex = texCanvas(256,256,(g,w,h)=>{
  g.fillStyle='#c69a6b'; g.fillRect(0,0,w,h);
  for(let i=0;i<8;i++){ const y=i*32;
    g.fillStyle=`hsl(${28+Math.random()*8},${34+Math.random()*10}%,${52+Math.random()*10}%)`;
    g.fillRect(0,y,w,30);
    g.fillStyle='rgba(60,35,15,.35)'; g.fillRect(0,y+30,w,2);
    g.fillStyle='rgba(70,45,20,.25)';
    for(let k=0;k<5;k++) g.fillRect(Math.random()*w, y+3+Math.random()*24, 14+Math.random()*30, 1);
    g.fillStyle='rgba(60,35,15,.3)'; g.fillRect(Math.random()*w,y,2,32);
  }
});
woodTex.repeat.set(7,5);
const deckTex = texCanvas(256,256,(g,w,h)=>{
  g.fillStyle='#b08350'; g.fillRect(0,0,w,h);
  for(let i=0;i<6;i++){ const x=i*43;
    g.fillStyle=`hsl(${26+Math.random()*6},${32+Math.random()*8}%,${44+Math.random()*8}%)`;
    g.fillRect(x,0,41,h);
    g.fillStyle='rgba(50,30,12,.4)'; g.fillRect(x+41,0,2,h);
  }
});
deckTex.repeat.set(6,6);
const tileTex = texCanvas(256,256,(g,w,h)=>{
  g.fillStyle='#e4ebee'; g.fillRect(0,0,w,h);
  g.strokeStyle='#b9c6cc'; g.lineWidth=2;
  for(let i=0;i<=4;i++){ g.beginPath();g.moveTo(i*64,0);g.lineTo(i*64,h);g.stroke();
    g.beginPath();g.moveTo(0,i*64);g.lineTo(w,i*64);g.stroke(); }
});
tileTex.repeat.set(2,2);
const stoneTex = texCanvas(128,128,(g,w,h)=>{ g.fillStyle='#c9c6bf'; g.fillRect(0,0,w,h); g.strokeStyle='#aaa7a0'; g.lineWidth=2; for(let i=0;i<=2;i++){g.beginPath();g.moveTo(i*64,0);g.lineTo(i*64,h);g.stroke();g.beginPath();g.moveTo(0,i*64);g.lineTo(w,i*64);g.stroke();} });
stoneTex.repeat.set(2,2);
const lawnTex = texCanvas(128,128,(g,w,h)=>{
  g.fillStyle='#7fae5d'; g.fillRect(0,0,w,h);
  for(let i=0;i<900;i++){ g.fillStyle=`hsl(${95+Math.random()*30},40%,${32+Math.random()*22}%)`;
    g.fillRect(Math.random()*w,Math.random()*h,2,2); }
});
lawnTex.repeat.set(8,3);

const floorMats = {
  wood:  new THREE.MeshStandardMaterial({map:woodTex,roughness:.8}),
  deck:  new THREE.MeshStandardMaterial({map:deckTex,roughness:.85}),
  tile:  new THREE.MeshStandardMaterial({map:tileTex,roughness:.35}),
  kfloor:new THREE.MeshStandardMaterial({map:tileTex,roughness:.5,color:0xd8cfc0}),
  lawn:  new THREE.MeshStandardMaterial({map:lawnTex,roughness:1}),
  stone: new THREE.MeshStandardMaterial({map:stoneTex,roughness:.9}),
};

// ground base under everything
const base = new THREE.Mesh(new THREE.BoxGeometry(70,0.2,60),
  new THREE.MeshStandardMaterial({color:0xe3e6e2,roughness:1}));
base.position.set(9.5,-0.11,6); base.receiveShadow=true; scene.add(base);

const FLOORY={wood:0.03,kfloor:0.03,deck:0.045,lawn:0.035,stone:0.03,tile:0.04};
for(const [a,b,c,d,kind] of FLOORS_PX){
  const x1=mx(a),z1=mz(b),x2=mx(c),z2=mz(d);
  const m=new THREE.Mesh(new THREE.BoxGeometry(x2-x1,0.06,z2-z1),floorMats[kind]);
  m.position.set((x1+x2)/2, FLOORY[kind], (z1+z2)/2);
  m.receiveShadow=true; scene.add(m);
}

// ---------- walls ----------
const wallMat = new THREE.MeshStandardMaterial({color:0xf3efe7,roughness:.92});
const glassMat = new THREE.MeshStandardMaterial({color:0xbfe0ee,transparent:true,opacity:.32,roughness:.1});
const paintables = [];   // meshes grouped by wallId
const colliders = [];    // {minX,maxX,minZ,maxZ}
const wallGroups = [];

function wallPiece(wallId,cx,cz,sx,sz,y0,y1,t,mat,isGlass){
  const m=new THREE.Mesh(new THREE.BoxGeometry(sx,y1-y0,sz),mat);
  m.position.set(cx,(y0+y1)/2,cz);
  if(!isGlass){ m.castShadow=true; m.receiveShadow=true; }
  m.userData.wallId=wallId;
  scene.add(m);
  (wallGroups[wallId] ||= []).push(m);
  paintables.push(m);
  if(!isGlass&&y0<1.9) colliders.push({minX:cx-sx/2,maxX:cx+sx/2,minZ:cz-sz/2,maxZ:cz+sz/2});
  return m;
}

WALLS.forEach((w,wallId)=>{
  const horiz = w.z1===w.z2;
  const len = horiz ? w.x2-w.x1 : w.z2-w.z1;
  const t = w.t;
  const at = a => horiz ? [w.x1+a, w.z1] : [w.x1, w.z1+a];
  const seg = (a0,a1,y0,y1,mat,isGlass)=>{
    if(a1-a0<0.01) return;
    const [px0,pz0]=at(a0),[px1,pz1]=at(a1);
    const cx=(px0+px1)/2, cz=(pz0+pz1)/2;
    const sx=horiz?(a1-a0):t, sz=horiz?t:(a1-a0);
    wallPiece(wallId,cx,cz,sx,sz,y0,y1,t,mat,isGlass);
  };
  const ops=[...w.openings].sort((a,b)=>a.at-b.at);
  let cur=0;
  for(const o of ops){
    const o0=o.at-o.w/2, o1=o.at+o.w/2;
    seg(cur,o0,0,WALL_H,wallMat);                    // solid before opening
    if(o.type==='door'){ seg(o0,o1,2.1,WALL_H,wallMat); }
    else if(o.type==='open'){ seg(o0,o1,2.35,WALL_H,wallMat); }
    else { // window
      const sill=o.sill??0.9, top=o.top??2.4;
      seg(o0,o1,0,sill,wallMat);
      seg(o0,o1,top,WALL_H,wallMat);
      seg(o0,o1,sill,top,glassMat,true);
    }
    cur=o1;
  }
  seg(cur,len,0,WALL_H,wallMat);
});

// ceiling (visible in walk mode only)
const ceilMat=new THREE.MeshStandardMaterial({color:0xf7f5f0,roughness:1});
const ceil = new THREE.Group();
CEIL_PX.forEach(([a,b,c,d])=>{
  const m=new THREE.Mesh(new THREE.BoxGeometry(mx(c)-mx(a),0.08,mz(d)-mz(b)),ceilMat);
  m.position.set((mx(a)+mx(c))/2, WALL_H+0.04, (mz(b)+mz(d))/2); ceil.add(m);
});
scene.add(ceil);

// terrace railing + garden fence
const railMat = new THREE.MeshStandardMaterial({color:0x7a6a55,roughness:.7});
function rail(x1,z1,x2,z2){
  const horiz=z1===z2, len=horiz?x2-x1:z2-z1;
  const m=new THREE.Mesh(new THREE.BoxGeometry(horiz?len:0.06,1.0,horiz?0.06:len),railMat);
  m.position.set((x1+x2)/2,0.55,(z1+z2)/2); m.castShadow=true; scene.add(m);
  colliders.push({minX:Math.min(x1,x2)-0.05,maxX:Math.max(x1,x2)+0.05,
                  minZ:Math.min(z1,z2)-0.05,maxZ:Math.max(z1,z2)+0.05});
}
const R=(a,b,c,d)=>rail(mx(a),mz(b),mx(c),mz(d));
R(66,637,66,830); R(66,830,795,830);           // big terrace west + south
R(328,80,328,222);                              // NW deck west wall
R(335,80,520,80);                               // NW deck north (hedge line)
R(520,80,1085,80); R(1085,80,1085,145);         // garden north + east edge
R(1100,145,1100,180); R(1100,180,1205,180); R(1205,180,1205,296);  // NE deck east side
R(972,145,1100,145);

// hedges + potted plants exactly where the plan shows them (no trees on the entrance side)
function hedge(a,b,c,d){
  const x1=mx(a),z1=mz(b),x2=mx(c),z2=mz(d);
  const m=new THREE.Mesh(new THREE.BoxGeometry(Math.abs(x2-x1)||0.4,0.55,Math.abs(z2-z1)||0.4),
    new THREE.MeshStandardMaterial({color:0x3f6b34,roughness:1}));
  m.position.set((x1+x2)/2,0.3,(z1+z2)/2); m.castShadow=true; scene.add(m);
}
hedge(335,61,1085,80);        // garden hedge band
hedge(70,640,88,828);         // terrace west planter
hedge(88,810,787,828);        // terrace south planter
function plant(px,py,sc=1){
  const g=new THREE.Group();
  const pot=new THREE.Mesh(new THREE.CylinderGeometry(.22*sc,.17*sc,.35*sc,10),new THREE.MeshStandardMaterial({color:0x8a6a4a}));
  pot.position.y=.18*sc;
  const lf=new THREE.Mesh(new THREE.IcosahedronGeometry(.42*sc,1),new THREE.MeshStandardMaterial({color:0x3f7d3a,roughness:1}));
  lf.position.y=.75*sc; lf.castShadow=true;
  g.add(pot,lf); g.position.set(mx(px),0.05,mz(py)); scene.add(g);
}
plant(355,78,1.2); plant(1070,78,1.2); plant(1170,205,1.1); plant(365,615,1.1);

// room labels
const labelSprites=[];
function label(x,z,text){
  const c=document.createElement('canvas'); c.width=512; c.height=128;
  const g=c.getContext('2d');
  g.font='bold 56px Arial'; g.textAlign='center'; g.textBaseline='middle';
  g.fillStyle='rgba(20,24,30,.55)'; g.beginPath(); g.roundRect(56,24,400,80,20); g.fill();
  g.fillStyle='#fff'; g.fillText(text,256,66);
  const t=new THREE.CanvasTexture(c); t.colorSpace=THREE.SRGBColorSpace;
  const s=new THREE.Sprite(new THREE.SpriteMaterial({map:t,transparent:true,depthTest:false}));
  s.scale.set(2.2,0.55,1); s.position.set(x,2.0,z);
  scene.add(s); labelSprites.push(s);
}
LABELS_PX.forEach(([x,z,t])=>label(mx(x),mz(z),t));

// ---------- furniture ----------
const furniture = [];   // {group, name, draggable, hx, hz (half extents)}
const pickMeshes = [];  // meshes for raycast (with .userData.item)

function mat(c,r=.8){ return new THREE.MeshStandardMaterial({color:c,roughness:r}); }
function box(g,w,h,d,c,x=0,y=0,z=0,r){
  const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat(c,r));
  m.position.set(x,y+h/2,z); m.castShadow=true; m.receiveShadow=true;
  g.add(m); return m;
}
function cyl(g,rt,rb,h,c,x=0,y=0,z=0,seg=14){
  const m=new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,seg),mat(c));
  m.position.set(x,y+h/2,z); m.castShadow=true; g.add(m); return m;
}

const F = {
  doubleBed(){ const g=new THREE.Group();
    box(g,1.6,.25,2.1,0x8a6f4d,0,.12,0);            // frame
    box(g,1.5,.22,2.0,0xf2ede2,0,.35,0,.95);       // mattress
    box(g,1.6,.7,.1,0x6e573b,0,.12,-1.1);          // headboard
    box(g,.65,.12,.45,0xffffff,-.38,.5,-.75); box(g,.65,.12,.45,0xffffff,.38,.5,-.75); // pillows
    box(g,1.5,.08,1.2,0x7d9bbf,0,.5,.35,.9);       // blanket
    return [g,.85,1.1]; },
  singleBed(){ const g=new THREE.Group();
    box(g,.95,.25,2.0,0x8a6f4d,0,.12,0);
    box(g,.85,.2,1.9,0xf2ede2,0,.34,0,.95);
    box(g,.95,.6,.09,0x6e573b,0,.12,-1.0);
    box(g,.6,.1,.4,0xffffff,0,.47,-.65);
    box(g,.85,.07,1.1,0xc4a484,0,.46,.3,.9);
    return [g,.5,1.05]; },
  wardrobe(){ const g=new THREE.Group();
    box(g,1.8,2.05,.6,0x9b7f5e,0,0,0,.7);
    box(g,.04,1.7,.5,0x7c644a,-.45,.2,.31); box(g,.04,1.7,.5,0x7c644a,.45,.2,.31);
    return [g,.92,.32]; },
  desk(){ const g=new THREE.Group();
    box(g,1.2,.05,.6,0xb5916a,0,.72,0);
    box(g,.06,.72,.55,0x8a6f4d,-.55,0,0); box(g,.06,.72,.55,0x8a6f4d,.55,0,0);
    box(g,.4,.28,.28,0x3a3f45,.1,.77,-.05);        // monitor-ish
    return [g,.62,.32]; },
  chair(){ const g=new THREE.Group();
    box(g,.45,.06,.45,0x53575e,0,.42,0);
    box(g,.45,.5,.06,0x53575e,0,.45,-.22);
    cyl(g,.03,.03,.42,0x33363b,0,0,0);
    return [g,.24,.24]; },
  sofa(){ const g=new THREE.Group();
    box(g,2.4,.35,.95,0x6a7f96,0,.15,0,.9);
    box(g,2.4,.55,.25,0x5d7186,0,.35,-.35,.9);
    box(g,.3,.5,.95,0x5d7186,-1.05,.15,0,.9); box(g,.3,.5,.95,0x5d7186,1.05,.15,0,.9);
    box(g,1.0,.14,.8,0x8fa3b8,-.6,.5,0); box(g,1.0,.14,.8,0x8fa3b8,.6,.5,0);
    return [g,1.22,.5]; },
  tv(w){ const g=new THREE.Group(), h=w*0.5625, y=1.35-h/2;
    box(g,w,h,0.05,0x0c0c0e,0,y,-0.02);
    box(g,w-0.04,h-0.04,0.006,0x1c2633,0,y+0.02,0.006,.25);
    
    return [g,w/2,0.03]; },
  armchair(){ const g=new THREE.Group();
    box(g,.9,.35,.85,0x9c7f6a,0,.15,0,.9);
    box(g,.9,.5,.22,0x8c715c,0,.35,-.32,.9);
    box(g,.2,.45,.85,0x8c715c,-.35,.15,0); box(g,.2,.45,.85,0x8c715c,.35,.15,0);
    return [g,.47,.45]; },
  coffeeTable(){ const g=new THREE.Group();
    box(g,1.1,.05,.6,0xa98a64,0,.4,0);
    box(g,.05,.4,.5,0x84694a,-.5,0,0); box(g,.05,.4,.5,0x84694a,.5,0,0);
    return [g,.57,.32]; },
  tvConsole(){ const g=new THREE.Group();
    box(g,1.6,.4,.4,0x5c4f41,0,0,0,.6);
    box(g,1.15,.65,.06,0x14161a,0,.42,0,.3);
    return [g,.82,.22]; },
  diningTable(){ const g=new THREE.Group();
    box(g,1.6,.06,.9,0xb5916a,0,.72,0);
    [[-.7,-.35],[.7,-.35],[-.7,.35],[.7,.35]].forEach(([x,z])=>box(g,.07,.72,.07,0x8a6f4d,x,0,z));
    return [g,.82,.47]; },
  diningChair(){ const g=new THREE.Group();
    box(g,.42,.05,.42,0x7d6a54,0,.44,0);
    box(g,.42,.55,.05,0x7d6a54,0,.46,-.2);
    [[-.17,-.17],[.17,-.17],[-.17,.17],[.17,.17]].forEach(([x,z])=>box(g,.04,.44,.04,0x66533f,x,0,z));
    return [g,.23,.23]; },
  island(){ const g=new THREE.Group();
    box(g,1.8,.9,.85,0xe8e2d6,0,0,0,.55);
    box(g,1.9,.05,.95,0x8b8f94,0,.9,0,.35);
    return [g,.95,.48]; },
  counter(w,d){ const g=new THREE.Group();
    box(g,w,.9,d,0xdcd5c8,0,0,0,.6);
    box(g,w+.05,.05,d+.05,0x7f8387,0,.9,0,.3);
    return [g,w/2+.02,d/2+.02]; },
  tub(){ const g=new THREE.Group();
    box(g,.75,.55,1.6,0xf4f6f7,0,0,0,.35);
    box(g,.6,.1,1.4,0xd7e3e8,0,.45,0,.2);
    return [g,.4,.82]; },
  toilet(){ const g=new THREE.Group();
    box(g,.4,.42,.55,0xf4f6f7,0,0,.05,.35);
    box(g,.42,.5,.18,0xf4f6f7,0,.1,-.25,.35);
    return [g,.22,.3]; },
  sink(){ const g=new THREE.Group();
    box(g,.55,.75,.45,0xe8e4da,0,0,0,.7);
    box(g,.5,.1,.4,0xf4f6f7,0,.78,0,.3);
    return [g,.29,.24]; },
  washer(){ const g=new THREE.Group();
    box(g,.6,.82,.6,0xeef0f2,0,0,0,.5);
    cyl(g,.2,.2,.03,0x3c4046,0,.5,.31);
    return [g,.31,.31]; },
  outTable(){ const g=new THREE.Group();
    cyl(g,.55,.55,.05,0xcbb894,0,.68,0);
    cyl(g,.05,.07,.68,0x7a6a55,0,0,0);
    cyl(g,.09,.5,.05,0xffffff,0,.73,0); // umbrella base of canopy
    const um=new THREE.Mesh(new THREE.ConeGeometry(.9,.4,10),mat(0xf0e6d2,.9));
    um.position.y=1.9; um.castShadow=true; g.add(um);
    cyl(g,.03,.03,1.15,0x7a6a55,0,.73,0);
    return [g,.6,.6]; },
  lounge(){ const g=new THREE.Group();
    box(g,.6,.18,1.4,0xd8c9a8,0,.15,.1,.9);
    const back=box(g,.6,.07,.7,0xd8c9a8,0,.45,-.75,.9); back.rotation.x=-.6;
    box(g,.55,.14,1.3,0x9db3c4,0,.3,.15,.95);
    return [g,.32,.75]; },
  fridge(){ const g=new THREE.Group();
    box(g,.75,1.85,.7,0xd9dde0,0,0,0,.4); box(g,.03,.5,.03,0x888d92,.28,.9,.37);
    return [g,.38,.36]; },
  roundTable(){ const g=new THREE.Group();
    cyl(g,.4,.4,.05,0xf2f0ea,0,.7,0); cyl(g,.04,.06,.7,0x7a6a55,0,0,0);
    return [g,.42,.42]; },
  bbq(){ const g=new THREE.Group();
    cyl(g,.3,.25,.5,0x2e3238,0,.55,0);
    cyl(g,.04,.04,.55,0x54585e,-.2,0,-.2); cyl(g,.04,.04,.55,0x54585e,.2,0,-.2); cyl(g,.04,.04,.55,0x54585e,0,0,.22);
    return [g,.32,.32]; },
};

// ---------- catalog builders (parameterized sizes) ----------
function sofaB(w,d=.95,c1=0x6a7f96,c2=0x5d7186,c3=0x8fa3b8){ const g=new THREE.Group();
  box(g,w,.35,d,c1,0,.15,0,.9);
  box(g,w,.55,.25,c2,0,.35,-(d/2-.125),.9);
  box(g,.3,.5,d,c2,-(w/2-.15),.15,0,.9); box(g,.3,.5,d,c2,(w/2-.15),.15,0,.9);
  const n=Math.max(1,Math.round((w-.6)/.8)), cw=(w-.6)/n;
  for(let i=0;i<n;i++) box(g,cw-.04,.14,d-.25,c3,-(w-.6)/2+cw*(i+.5),.5,.06,.9);
  return [g,w/2,d/2]; }
function cornerSofa(c1=0x7b8c6e,c2=0x6a7b5d,c3=0x9db08f){ const g=new THREE.Group();
  const m=sofaB(2.6,.95,c1,c2,c3)[0]; m.position.z=-.475; g.add(m);
  box(g,.95,.35,.95,c1,.825,.15,.475,.9); box(g,.3,.5,.95,c2,1.15,.15,.475,.9);
  box(g,.8,.14,.75,c3,.8,.5,.5,.9);
  return [g,1.3,.95]; }
function deskB(w,d=.7,top=0xb5916a){ const g=new THREE.Group();
  box(g,w,.05,d,top,0,.72,0);
  box(g,.05,.72,d-.05,0x8a6f4d,-(w/2-.04),0,0); box(g,.05,.72,d-.05,0x8a6f4d,(w/2-.04),0,0);
  if(w>=1.3){ box(g,.42,.5,d-.12,0x9b7f5e,(w/2-.3),.2,0,.8); }
  if(w>=1.2){ box(g,.5,.3,.04,0x2b2f35,-.15,.8,-d/2+.15); box(g,.08,.08,.08,0x2b2f35,-.15,.77,-d/2+.15); }
  return [g,w/2,d/2]; }
function lDesk(){ const g=new THREE.Group();
  box(g,1.6,.05,.65,0xb5916a,0,.72,-.425); box(g,.65,.05,1.5,0xb5916a,.475,.72,0);
  box(g,.05,.72,.6,0x8a6f4d,-.77,0,-.425); box(g,.05,.72,1.45,0x8a6f4d,.77,0,0);
  box(g,.5,.3,.04,0x2b2f35,-.2,.8,-.65);
  return [g,.8,.75]; }
function officeChair(c=0x3b4048){ const g=new THREE.Group();
  box(g,.5,.07,.5,c,0,.45,0,.8); box(g,.46,.55,.07,c,0,.52,-.24,.8);
  cyl(g,.04,.04,.45,0x2a2d31,0,0,0); box(g,.56,.04,.08,0x2a2d31,0,.03,0); box(g,.08,.04,.56,0x2a2d31,0,.03,0);
  return [g,.3,.3]; }
function stool(c=0x9c7f6a,h=.62){ const g=new THREE.Group();
  cyl(g,.2,.2,.05,c,0,h,0); [[-.12,-.12],[.12,-.12],[-.12,.12],[.12,.12]].forEach(([x,z])=>cyl(g,.02,.02,h,0x66533f,x,0,z,8));
  return [g,.2,.2]; }
function bench(w=1.2){ const g=new THREE.Group();
  box(g,w,.06,.36,0x8a6f4d,0,.42,0); box(g,.05,.42,.32,0x66533f,-(w/2-.08),0,0); box(g,.05,.42,.32,0x66533f,(w/2-.08),0,0);
  return [g,w/2,.18]; }
function bedB(w,l=2.0,frame=0x8a6f4d,blanket=0x7d9bbf){ const g=new THREE.Group();
  box(g,w,.25,l,frame,0,.12,0); box(g,w-.1,.2,l-.1,0xf2ede2,0,.34,0,.95);
  box(g,w,.7,.1,0x6e573b,0,.12,-(l/2+.0));
  const np=w>1.3?2:1; for(let i=0;i<np;i++) box(g,(w-.2)/np-.08,.1,.4,0xffffff,-(w-.2)/2+((w-.2)/np)*(i+.5),.47,-(l/2-.35));
  box(g,w-.1,.07,l*.55,blanket,0,.46,l*.18,.9);
  return [g,w/2,l/2+.05]; }
function tableB(w,d,h=.72,top=0xb5916a){ const g=new THREE.Group();
  box(g,w,.06,d,top,0,h,0);
  [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([a,b])=>box(g,.07,h,.07,0x8a6f4d,a*(w/2-.07),0,b*(d/2-.07)));
  return [g,w/2,d/2]; }
function roundTableB(r=.4,h=.5){ const g=new THREE.Group();
  cyl(g,r,r,.05,0xf2f0ea,0,h,0,20); cyl(g,.04,.06,h,0x7a6a55,0,0,0); cyl(g,.18,.2,.03,0x7a6a55,0,0,0);
  return [g,r,r]; }
function wardrobeB(w,h=2.05,d=.6){ const g=new THREE.Group();
  box(g,w,h,d,0x9b7f5e,0,0,0,.7);
  const n=Math.max(1,Math.round(w/.6));
  for(let i=1;i<n;i++) box(g,.02,h-.2,.02,0x6e573b,-w/2+w*i/n,.1,d/2+.005);
  for(let i=0;i<n;i++) box(g,.03,.5,.03,0x6e573b,-w/2+w*(i+.5)/n+.12,.9,d/2+.02);
  return [g,w/2,d/2]; }
function bookshelf(w,h=1.8,d=.35){ const g=new THREE.Group();
  box(g,.03,h,d,0x8a6f4d,-w/2+.015,0,0); box(g,.03,h,d,0x8a6f4d,w/2-.015,0,0); box(g,w,h,.02,0x7c644a,0,0,-d/2+.01);
  const rows=Math.max(3,Math.round(h/.35)); const cols=[0xb44a3a,0x3a6ea5,0xd4a73a,0x4d8b5a,0x7a5aa5,0xcfc7b8];
  for(let r=0;r<=rows;r++){ box(g,w-.06,.03,d,0x8a6f4d,0,r*(h-.03)/rows,0);
    if(r<rows){ let x=-w/2+.06; let k=0; while(x<w/2-.12){ const bw=.04+((k*7)%5)*.01, bh=.2+((k*3+r)%4)*.03;
      box(g,bw,bh,d-.08,cols[(k+r)%cols.length],x+bw/2,r*(h-.03)/rows+.03,0.0); x+=bw+.01; k++; } } }
  return [g,w/2,d/2]; }
function dresser(w=1.2,h=.85,d=.5){ const g=new THREE.Group();
  box(g,w,h,d,0xa98a64,0,0,0,.7);
  for(let i=0;i<3;i++){ box(g,w-.1,.02,.02,0x6e573b,0,.15+i*(h-.2)/3,d/2+.005); box(g,.14,.03,.03,0x4a3b2b,0,.3+i*(h-.2)/3,d/2+.02); }
  return [g,w/2,d/2]; }
function tvB(w=1.6){ const g=new THREE.Group();
  box(g,w,.4,.4,0x5c4f41,0,0,0,.6); box(g,w*.72,.65,.06,0x14161a,0,.42,0,.3);
  return [g,w/2,.22]; }
function lamp(){ const g=new THREE.Group();
  cyl(g,.16,.18,.04,0x33363b,0,0,0); cyl(g,.02,.02,1.4,0x33363b,0,0,0);
  const sh=new THREE.Mesh(new THREE.CylinderGeometry(.14,.24,.3,12),mat(0xf3e6c8,.9)); sh.position.y=1.5; g.add(sh);
  return [g,.2,.2]; }
function plantB(k=1){ const g=new THREE.Group();
  cyl(g,.22*k,.17*k,.35*k,0x8a6a4a,0,0,0,12);
  const lf=new THREE.Mesh(new THREE.IcosahedronGeometry(.42*k,1),mat(0x3f7d3a,1)); lf.position.y=.78*k; lf.castShadow=true; g.add(lf);
  return [g,.26*k,.26*k]; }
const sizeOf=(f,k)=>()=>{const [g,hx,hz]=f(); g.scale.setScalar(k); return [g,hx*k,hz*k];};

// id, Hebrew name, factory. Grouped by category for the catalog menu.
const CATALOG = [
  ['ספות',[
    ['sofa2','ספה 2 מושבים',()=>sofaB(1.6)],
    ['sofa3','ספה 3 מושבים',()=>sofaB(2.2)],
    ['sofa4','ספה גדולה',()=>sofaB(2.8,1.0,0x8a7a6a,0x7a6a5a,0xb3a594)],
    ['sofaL','ספה פינתית',()=>cornerSofa()],
    ['sofaS','ספה קטנה (ספה זוגית)',()=>sofaB(1.3,.85,0xa07a6a,0x8f6a5a,0xc2a090)],
    ['arm1','כורסה',F.armchair],
    ['arm2','כורסה גדולה',sizeOf(F.armchair,1.25)],
    ['arm3','כורסה קטנה',sizeOf(F.armchair,.8)],
  ]],
  ['שולחנות עבודה',[
    ['deskS','שולחן עבודה קטן',()=>deskB(1.0,.5)],
    ['deskM','שולחן עבודה רגיל',()=>deskB(1.4,.7)],
    ['deskL','שולחן עבודה גדול',()=>deskB(1.8,.8,0x9b7f5e)],
    ['deskC','שולחן פינתי',()=>lDesk()],
  ]],
  ['כיסאות',[
    ['chairO','כיסא משרדי',()=>officeChair()],
    ['chairO2','כיסא משרדי גדול',sizeOf(()=>officeChair(0x6a4a3a),1.15)],
    ['chairD','כיסא אוכל',F.diningChair],
    ['stool','שרפרף',()=>stool()],
    ['stoolH','שרפרף בר',()=>stool(0x7d6a54,.78)],
    ['bench','ספסל',()=>bench(1.2)],
  ]],
  ['מיטות',[
    ['bed90','מיטת יחיד 90',()=>bedB(.95)],
    ['bed120','מיטה וחצי 120',()=>bedB(1.25)],
    ['bed160','מיטה זוגית 160',()=>bedB(1.65)],
    ['bed180','מיטה זוגית 180',()=>bedB(1.85,2.1,0x6e573b,0xb49a7d)],
  ]],
  ['שולחנות',[
    ['tblD4','שולחן אוכל קטן',()=>tableB(1.2,.8)],
    ['tblD6','שולחן אוכל',()=>tableB(1.6,.9)],
    ['tblD8','שולחן אוכל גדול',()=>tableB(2.2,1.0)],
    ['tblC','שולחן סלון',()=>tableB(1.1,.6,.4)],
    ['tblR','שולחן צד עגול',()=>roundTableB(.3,.5)],
    ['tblR2','שולחן עגול',()=>roundTableB(.55,.72)],
  ]],
  ['אחסון',[
    ['wardS','ארון 1.0 מ׳',()=>wardrobeB(1.0)],
    ['wardM','ארון 1.8 מ׳',()=>wardrobeB(1.8)],
    ['wardL','ארון 2.4 מ׳',()=>wardrobeB(2.4)],
    ['shelfS','ספרייה קטנה',()=>bookshelf(.8,1.2)],
    ['shelfL','ספרייה גבוהה',()=>bookshelf(1.6,1.9)],
    ['dress','שידה',()=>dresser()],
    ['tvS','מזנון טלוויזיה',()=>tvB(1.6)],
    ['tvL','מזנון טלוויזיה גדול',()=>tvB(2.2)],
  ]],
  ['אחר',[
    ['lamp','מנורת עמידה',()=>lamp()],
    ['plantS','עציץ',()=>plantB(1)],
    ['plantL','עציץ גדול',()=>plantB(1.5)],
    ['tvS','טלוויזיה קטנה על הקיר (43")',()=>F.tv(0.95)],
    ['tvL','טלוויזיה גדולה על הקיר (65")',()=>F.tv(1.45)],
  ]],
];
const CAT_MAP={}; CATALOG.forEach(([,items])=>items.forEach(([id,name,f])=>CAT_MAP[id]={name,factory:f}));

// name, factory, px, py (plan pixels), rotY, draggable. rot 0 = back to north; PI/2 = back to west; -PI/2 = back to east; PI = back to south
const H=Math.PI/2, PI=Math.PI;
const sc=(f,k)=>()=>{const [g,hx,hz]=f(); g.scale.setScalar(k); return [g,hx*k,hz*k];};
const PLACEMENTS_PX = [
  // master bedroom
  ['מיטה זוגית', F.doubleBed, 345,320, H, true],
  ['ארון', F.wardrobe, 521,278, -H, true],
  // bedroom A
  ['מיטת יחיד', F.singleBed, 612,193, H, true],
  ['ארון', F.wardrobe, 732,225, -H, true],
  ['שולחן עבודה', F.desk, 568,290, H, true],
  ['כיסא', F.chair, 604,288, -H, true],
  // bedroom B
  ['מיטת יחיד', F.singleBed, 925,232, 0, true],
  ['שולחן עבודה', F.desk, 800,186, 0, true],
  ['כיסא', F.chair, 800,222, PI, true],
  ['ארון', F.wardrobe, 890,340, PI, true],
  // safe room / kids
  ['מיטת יחיד', F.singleBed, 425,545, 0, true],
  ['ארון', F.wardrobe, 450,447, 0, true],
  ['שולחן עבודה', F.desk, 540,590, PI, true],
  ['כיסא', F.chair, 540,560, 0, true],
  // living room
  ['ספה', F.sofa, 862,708, H, true],
  ['כורסה', F.armchair, 930,634, 0, true],
  ['כורסה', F.armchair, 930,786, PI, true],
  ['שולחן סלון', F.coffeeTable, 935,710, H, true],
  ['מזנון טלוויזיה', F.tvConsole, 1028,705, -H, true],
  // kitchen + dining
  ['שיש מטבח', ()=>F.counter(2.8,.65), 690,452, 0, false],
  ['מקרר', F.fridge, 806,455, 0, false],
  ['שיש מטבח', ()=>F.counter(.65,2.5), 618,540, 0, false],
  ['שולחן אוכל', F.diningTable, 750,560, 0, true],
  ['כיסא אוכל', F.diningChair, 722,530, 0, true],
  ['כיסא אוכל', F.diningChair, 750,530, 0, true],
  ['כיסא אוכל', F.diningChair, 778,530, 0, true],
  ['כיסא אוכל', F.diningChair, 722,590, PI, true],
  ['כיסא אוכל', F.diningChair, 750,590, PI, true],
  ['כיסא אוכל', F.diningChair, 778,590, PI, true],
  // bathrooms
  ['אסלה', F.toilet, 304,455, H, false],
  ['כיור', F.sink, 298,508, H, false],
  ['אמבטיה', F.tub, 336,553, H, false],
  ['כיור', F.sink, 985,312, 0, false],
  ['אסלה', F.toilet, 1033,352, -H, false],
  ['מכונת כביסה', F.washer, 1150,322, -H, false],
  ['מכונת כביסה', F.washer, 1150,356, -H, false],
  ['אסלה', F.toilet, 1150,416, -H, false],
  ['אמבטיה', F.tub, 1115,468, H, false],
  ['כיור', F.sink, 1040,474, PI, false],
  // terraces
  ['ספה חוץ', sc(F.sofa,.62), 590,722, H, true],
  ['שולחן סלון', sc(F.coffeeTable,.8), 650,722, H, true],
  ['כורסה', sc(F.armchair,.85), 706,690, -H, true],
  ['כורסה', sc(F.armchair,.85), 706,754, -H, true],
  ['שולחן גינה', sc(F.outTable,.85), 272,700, 0, true],
  ['כיסא נוח', F.lounge, 222,738, 0.7, true],
  ['כיסא נוח', F.lounge, 258,766, 0.7, true],
  ['מנגל', F.bbq, 162,662, 0, true],
  ['שולחן גינה', sc(F.outTable,.85), 428,118, 0, true],
  ['שולחן עגול', F.roundTable, 988,262, 0, true],
];
const PLACEMENTS = PLACEMENTS_PX.map(([n,f,px,py,r,d])=>[n,f,mx(px),mz(py),r,d]);

function oddQuarter(rot){ return Math.abs(Math.round(rot/(Math.PI/2)))%2===1; }
function applyRot(item,rot){
  const q=Math.PI/4, k=Math.round(rot/q); if(Math.abs(rot-k*q)<0.01) rot=k*q;
  item.group.rotation.y=rot;
  const c=Math.abs(Math.cos(rot)), sn=Math.abs(Math.sin(rot));
  const cc=c<1e-6?0:c, ss=sn<1e-6?0:sn;
  item.hx=cc*item.bx+ss*item.bz; item.hz=ss*item.bx+cc*item.bz;
}
function syncCollider(item){
  const c=colliders.find(c=>c.item===item); if(!c) return;
  const p=item.group.position;
  c.minX=p.x-item.hx; c.maxX=p.x+item.hx; c.minZ=p.z-item.hz; c.maxZ=p.z+item.hz;
}
function addItem(name,factory,x,z,rot,draggable,key){
  const [g,hx,hz]=factory();
  g.position.set(x,0.05,z);
  scene.add(g);
  const item={group:g,name,draggable,key,bx:hx,bz:hz,hx,hz};
  applyRot(item,rot);
  g.traverse(o=>{ if(o.isMesh){ o.userData.item=item; pickMeshes.push(o); } });
  furniture.push(item);
  colliders.push({minX:0,maxX:0,minZ:0,maxZ:0,item});
  syncCollider(item);
  return item;
}
function removeItem(item){
  scene.remove(item.group);
  const fi=furniture.indexOf(item); if(fi>=0) furniture.splice(fi,1);
  for(let i=pickMeshes.length-1;i>=0;i--) if(pickMeshes[i].userData.item===item) pickMeshes.splice(i,1);
  const ci=colliders.findIndex(c=>c.item===item); if(ci>=0) colliders.splice(ci,1);
}
function resolveKey(key){
  if(key[0]==='h'&&PLACEMENTS[+key.slice(1)]){ const [n,f,x,z,r,d]=PLACEMENTS[+key.slice(1)]; return {name:n,factory:f,home:[x,z,r]}; }
  return CAT_MAP[key]||null;
}
function buildHome(){
  PLACEMENTS.forEach(([n,f,x,z,r,d],i)=>addItem(n,f,x,z,r,d,'h'+i));
}
buildHome();

// selection highlight
const hl = new THREE.BoxHelper(undefined, 0x3fa7ff);
hl.visible=false; scene.add(hl);
let selected=null;
let held=null, panMode=false, orbMid=null, dragOff={x:0,z:0};
let furnLocked=localStorage.getItem('apartment3d-lock')==='1';
// wall-aware furniture movement: furniture can never be dragged or carried through walls
function wallPen(item,x,z){
  const hx=item.hx,hz=item.hz; let pen=0;
  if(x-hx<-0.2) pen+=-0.2-(x-hx); if(x+hx>19.2) pen+=x+hx-19.2;
  if(z-hz<-0.2) pen+=-0.2-(z-hz); if(z+hz>13.2) pen+=z+hz-13.2;
  for(const c of colliders){ if(c.item) continue;
    const ox=Math.min(x+hx,c.maxX)-Math.max(x-hx,c.minX), oz=Math.min(z+hz,c.maxZ)-Math.max(z-hz,c.minZ);
    if(ox>0&&oz>0) pen+=Math.min(ox,oz); }
  return pen;
}
function moveItemTo(item,tx,tz){
  const p=item.group.position; let x=p.x,z=p.z;
  const dx=tx-x,dz=tz-z, n=Math.max(1,Math.ceil(Math.hypot(dx,dz)/0.06)), sx=dx/n, sz=dz/n;
  for(let i=0;i<n;i++){
    const cur=wallPen(item,x,z)+1e-4;
    if(wallPen(item,x+sx,z+sz)<=cur){ x+=sx; z+=sz; }
    else if(wallPen(item,x+sx,z)<=cur){ x+=sx; }
    else if(wallPen(item,x,z+sz)<=cur){ z+=sz; }
    else break;
  }
  p.x=x; p.z=z; syncCollider(item);
}
function freeSpot(item,x,z){
  if(wallPen(item,x,z)<1e-4) return [x,z];
  for(let r=0.2;r<4;r+=0.2) for(let a=0;a<12;a++){
    const px=x+r*Math.cos(a*Math.PI/6), pz=z+r*Math.sin(a*Math.PI/6);
    if(wallPen(item,px,pz)<1e-4) return [px,pz]; }
  return [x,z];
}
function select(item){
  selected=item;
  if(item){ hl.setFromObject(item.group); hl.visible=true; }
  else hl.visible=false;
  hint(item ? item.name+(item.draggable?' - גרור להזזה, ↻ לסיבוב, 🗑 להסרה':' - רהיט קבוע') : '');
}

// ---------- paint ----------
const SWATCHES=['#f3efe7','#e8dcc8','#d7e5d0','#bcd4e6','#f2c9c0','#e6e0f0','#f5e6b8','#c9c2b8','#8fa98f','#4a6b8a'];
let paintColor=SWATCHES[0];
const swDiv=document.getElementById('swatches');
SWATCHES.forEach((c,i)=>{
  const b=document.createElement('button'); b.className='swatch'+(i===0?' sel':'');
  b.style.background=c;
  b.onclick=()=>{ paintColor=c; document.querySelectorAll('.swatch').forEach(s=>s.classList.remove('sel')); b.classList.add('sel'); };
  swDiv.appendChild(b);
});
document.getElementById('custom-color').addEventListener('input',e=>{
  paintColor=e.target.value;
  document.querySelectorAll('.swatch').forEach(s=>s.classList.remove('sel'));
});
function paintWall(wallId,color){
  for(const m of wallGroups[wallId]||[]){
    if(m.material===glassMat) continue;
    if(m.material===wallMat) m.material=wallMat.clone();
    m.material.color.set(color);
  }
  saveState();
}

// ---------- persistence ----------
const LS='apartment3d-v1', LAYOUT=6;  // bump LAYOUT on any wall/furniture change: stale saves are ignored
function saveState(){
  try{
    const cols={};
    wallGroups.forEach((ms,i)=>{ const m=ms.find(m=>m.material!==glassMat);
      if(m && m.material!==wallMat) cols[i]='#'+m.material.color.getHexString(); });
    const items=furniture.filter(f=>f.draggable).map(f=>[f.key,+f.group.position.x.toFixed(2),+f.group.position.z.toFixed(2),+f.group.rotation.y.toFixed(3)]);
    let pv=PAINT; if(!pv){ try{ pv=(JSON.parse(localStorage.getItem(LS)||'null')||{}).paint; }catch(e){} }
    localStorage.setItem(LS,JSON.stringify({lv:LAYOUT,cols,items,paint:pv||[]}));
  }catch(e){}
}
function clearMovable(){ furniture.filter(f=>f.draggable).forEach(removeItem); }
function loadState(){
  try{
    const s=JSON.parse(localStorage.getItem(LS)||'null'); if(!s) return;
    let list=null;
    if(s.lv===6) list=s.items;
    else if(s.lv===5){ const idx=PLACEMENTS.map((p,i)=>i).filter(i=>PLACEMENTS[i][5]); list=(s.fur||[]).map((p,k)=>['h'+idx[k],p[0],p[1],p[2]]); }
    else return;
    Object.entries(s.cols||{}).forEach(([id,c])=>paintWall(+id,c));
    if(list&&list.length){
      clearMovable();
      for(const [key,x,z,r] of list){ const d=resolveKey(key); if(d) addItem(d.name,d.factory,x,z,r,true,key); }
    }
    saveState();
  }catch(e){}
}

// ---------- player + cameras ----------
const player={x:mx(1078),z:mz(541),yaw:Math.PI/2,pitch:0};
const EYE=1.6;
let mode='walk';               // walk | arrange | paint
let yawObj=new THREE.Object3D();
walkCam.position.set(0,EYE,0);

const orbit={theta:0, phi:0.2, r:26, cx:mx(640), cz:mz(450)};
function fitOrbit(){
  const asp=innerWidth/innerHeight, t=Math.tan(THREE.MathUtils.degToRad(topCam.fov/2));
  const needW=10.9/(asp*t), needH=7.7/t;
  orbit.r=Math.min(70,Math.max(14,needW,needH)*1.04);
}
function resetView(){ orbit.theta=0; orbit.phi=0.2; orbit.cx=mx(640); orbit.cz=mz(450); fitOrbit(); updateTopCam(); }
function updateTopCam(){
  const {theta,phi,r,cx,cz}=orbit;
  topCam.position.set(cx+r*Math.sin(phi)*Math.sin(theta), r*Math.cos(phi), cz+r*Math.sin(phi)*Math.cos(theta));
  topCam.lookAt(cx,0,cz);
}

const keys={};
addEventListener('keydown',e=>{ keys[e.code]=true;
  if(e.code==='KeyR'){ if(mode==='arrange'&&selected) rotateSelected(); else if(mode==='walk'&&held) rotateItem(held); }
  if(e.code==='KeyE'&&mode==='walk'){ if(held) release(); else grab(); }
  if((e.code==='Delete'||e.code==='Backspace')&&mode==='arrange') removeSelected(); });
addEventListener('keyup',e=>keys[e.code]=false);

let locked=false;
canvas.addEventListener('click',()=>{
  if(mode==='walk'&&!isTouch&&!locked) canvas.requestPointerLock();
});
document.addEventListener('pointerlockchange',()=>{
  locked=document.pointerLockElement===canvas;
  document.getElementById('crosshair').classList.toggle('hidden', !(mode==='walk'&&(locked||isTouch)));
});
document.addEventListener('mousemove',e=>{
  if(!locked) return;
  player.yaw-=e.movementX*0.0023;
  player.pitch=Math.max(-1.4,Math.min(1.4,player.pitch-e.movementY*0.0023));
});

// touch input
const isTouch='ontouchstart'in window||navigator.maxTouchPoints>0;
let joyId=null, joyOX=0, joyOY=0, joyDX=0, joyDY=0;
let lookId=null, lookX=0, lookY=0;
const joyEl=document.getElementById('joystick'), knob=document.getElementById('joystick-knob');

// orbit / pick pointer state (non-walk modes)
let orbPtrs=new Map(), orbDist=0, tapInfo=null, dragItem=null;

canvas.addEventListener('pointerdown',e=>{
  if(mode==='walk'&&isTouch){
    if(e.clientX<innerWidth/2&&joyId===null){
      joyId=e.pointerId; joyOX=e.clientX; joyOY=e.clientY; joyDX=joyDY=0;
      joyEl.classList.remove('hidden');
      joyEl.style.left=(joyOX-55)+'px'; joyEl.style.top=(joyOY-55)+'px';
    } else if(lookId===null){ lookId=e.pointerId; lookX=e.clientX; lookY=e.clientY; }
    return;
  }
  if(mode==='walk') return;
  orbPtrs.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(orbPtrs.size===2){
    const [a,b]=[...orbPtrs.values()]; orbDist=Math.hypot(a.x-b.x,a.y-b.y); orbMid={x:(a.x+b.x)/2,y:(a.y+b.y)/2}; dragItem=null;
  } else {
    tapInfo={x:e.clientX,y:e.clientY,t:performance.now()};
    const hit=pick(e.clientX,e.clientY,pickMeshes);
    dragItem=(mode==='arrange'&&!panMode&&!furnLocked&&e.button===0&&!e.shiftKey&&hit&&hit.object.userData.item.draggable)?hit.object.userData.item:null;
    if(dragItem){ const fp=floorPoint(e.clientX,e.clientY); if(fp){ dragOff={x:fp.x-dragItem.group.position.x,z:fp.z-dragItem.group.position.z}; } else dragOff={x:0,z:0}; select(dragItem); }
    else if(mode==='arrange'&&furnLocked&&hit&&hit.object.userData.item.draggable) hint('הרהיטים נעולים - לחץ על 🔒 בראש המסך לביטול');
  }
});
canvas.addEventListener('pointermove',e=>{
  if(mode==='walk'&&isTouch){
    if(e.pointerId===joyId){
      joyDX=Math.max(-45,Math.min(45,e.clientX-joyOX));
      joyDY=Math.max(-45,Math.min(45,e.clientY-joyOY));
      knob.style.transform=`translate(${joyDX}px,${joyDY}px)`;
    } else if(e.pointerId===lookId){
      player.yaw-=(e.clientX-lookX)*0.0048;
      player.pitch=Math.max(-1.4,Math.min(1.4,player.pitch-(e.clientY-lookY)*0.0048));
      lookX=e.clientX; lookY=e.clientY;
    }
    return;
  }
  if(mode==='walk') return;
  const p=orbPtrs.get(e.pointerId); if(!p) return;
  const dx=e.clientX-p.x, dy=e.clientY-p.y; p.x=e.clientX; p.y=e.clientY;
  if(tapInfo&&Math.hypot(e.clientX-tapInfo.x,e.clientY-tapInfo.y)>9) tapInfo=null;
  if(dragItem){
    const pt=floorPoint(e.clientX,e.clientY);
    if(pt){ moveItemTo(dragItem,pt.x-dragOff.x,pt.z-dragOff.z); hl.setFromObject(dragItem.group); }
    return;
  }
  if(orbPtrs.size===1){
    if(panMode||(e.buttons&6)||e.shiftKey) panView(dx,dy);
    else { orbit.theta-=dx*0.006; orbit.phi=Math.max(0.05,Math.min(1.25,orbit.phi-dy*0.005)); updateTopCam(); }
  }
  else if(orbPtrs.size===2){
    const [a,b]=[...orbPtrs.values()]; const d=Math.hypot(a.x-b.x,a.y-b.y);
    const mid={x:(a.x+b.x)/2,y:(a.y+b.y)/2};
    if(orbMid) panView(mid.x-orbMid.x,mid.y-orbMid.y); orbMid=mid;
    orbit.r=Math.max(6,Math.min(80,orbit.r*orbDist/Math.max(d,1))); orbDist=d; updateTopCam();
  }
});
function panView(dx,dy){
  const k=2*orbit.r*Math.tan(THREE.MathUtils.degToRad(topCam.fov/2))/innerHeight;
  const rx=Math.cos(orbit.theta), rz=-Math.sin(orbit.theta), fx=-Math.sin(orbit.theta), fz=-Math.cos(orbit.theta);
  const ky=k/Math.max(.35,Math.cos(orbit.phi));
  orbit.cx=Math.max(-3,Math.min(22,orbit.cx-rx*dx*k+fx*dy*ky));
  orbit.cz=Math.max(-4,Math.min(17,orbit.cz-rz*dx*k+fz*dy*ky));
  updateTopCam();
}
function endPtr(e){
  orbPtrs.delete(e.pointerId); if(orbPtrs.size<2) orbMid=null;
  if(e.pointerId===joyId){ joyId=null; joyDX=joyDY=0; knob.style.transform=''; joyEl.classList.add('hidden'); }
  if(e.pointerId===lookId) lookId=null;
  if(dragItem){ saveState(); dragItem=null; return; }
  if(tapInfo){
    const {x,y}=tapInfo; tapInfo=null;
    if(mode==='paint'){
      const hit=pick(x,y,paintables);
      if(hit) paintWall(hit.object.userData.wallId,paintColor);
    } else if(mode==='arrange'){
      const hit=pick(x,y,pickMeshes);
      select(hit?hit.object.userData.item:null);
    }
  }
}
canvas.addEventListener('contextmenu',e=>e.preventDefault());
canvas.addEventListener('pointerup',endPtr);
canvas.addEventListener('pointercancel',endPtr);
canvas.addEventListener('wheel',e=>{
  if(mode!=='walk'){ orbit.r=Math.max(6,Math.min(80,orbit.r+e.deltaY*0.04)); updateTopCam(); }
},{passive:true});

// mouse drag in overview also rotates with drag (desktop)
const ray=new THREE.Raycaster();
function ndc(cx,cy){ return new THREE.Vector2((cx/innerWidth)*2-1, -(cy/innerHeight)*2+1); }
function pick(cx,cy,list){
  ray.setFromCamera(ndc(cx,cy),activeCam);
  const hits=ray.intersectObjects(list,false);
  return hits[0]||null;
}
function floorPoint(cx,cy){
  ray.setFromCamera(ndc(cx,cy),activeCam);
  const t=-ray.ray.origin.y/ray.ray.direction.y;
  if(t<0) return null;
  return ray.ray.origin.clone().addScaledVector(ray.ray.direction,t);
}

// ---------- collision ----------
function collide(nx,nz){
  const r=0.25;
  for(const c of colliders){
    if(held&&c.item===held) continue;
    if(nx>c.minX-r&&nx<c.maxX+r&&nz>c.minZ-r&&nz<c.maxZ+r){
      return true;
    }
  }
  return false;
}

// ---------- modes / UI ----------
const $=id=>document.getElementById(id);
function hint(t,ms=2600){
  const h=$('hint'); h.textContent=t;
  h.classList.toggle('show',!!t);
  clearTimeout(hint._t); if(t) hint._t=setTimeout(()=>h.classList.remove('show'),ms);
}
function setMode(m){
  mode=m;
  document.querySelectorAll('.mode').forEach(b=>b.classList.remove('active'));
  $('btn-'+m).classList.add('active');
  $('palette').classList.toggle('hidden',m!=='paint');
  $('arrangebar').classList.toggle('hidden',m!=='arrange');
  $('walkbar').classList.toggle('hidden',m!=='walk');
  $('panbtn').classList.toggle('hidden',m==='walk');
  $('catalog').classList.add('hidden'); release();
  if(m!=='walk'&&typeof setBrush==='function') setBrush(false);
  if(document.exitPointerLock&&locked) document.exitPointerLock();
  const walking=m==='walk';
  ceil.visible=walking;
  labelSprites.forEach(s=>s.visible=!walking);
  activeCam=walking?walkCam:topCam;
  document.getElementById('crosshair').classList.toggle('hidden',!(walking&&(locked||isTouch)));
  document.querySelectorAll('.walkonly').forEach(b=>b.style.display=walking?'':'none');
  select(null);
  if(!walking) updateTopCam();
  if(m==='arrange') hint('גע ברהיט וגרור כדי להזיז');
  if(m==='paint') hint('בחר צבע וגע בקיר');
}
$('btn-walk').onclick=()=>setMode('walk');
$('btn-arrange').onclick=()=>setMode('arrange');
$('btn-paint').onclick=()=>setMode('paint');
$('btn-help').onclick=()=>$('help-overlay').style.display='flex';
$('btn-start').onclick=()=>{
  $('help-overlay').style.display='none';
  if(mode==='walk'&&!isTouch) canvas.requestPointerLock();
};
function rotateItem(item){
  if(furnLocked){ hint('הרהיטים נעולים - בטל את הנעילה כדי לסובב'); return false; }
  const oldRot=item.group.rotation.y, p=item.group.position;
  const before=wallPen(item,p.x,p.z);
  applyRot(item,oldRot+Math.PI/4);
  if(wallPen(item,p.x,p.z)>before+1e-4){
    const [fx,fz]=freeSpot(item,p.x,p.z);
    if(wallPen(item,fx,fz)>before+1e-4){ applyRot(item,oldRot); hint('אין מקום לסובב כאן'); return false; }
    p.x=fx; p.z=fz;
  }
  syncCollider(item); if(item===selected) hl.setFromObject(item.group); saveState(); return true;
}
function rotateSelected(){ if(selected&&selected.draggable) rotateItem(selected); }
function removeSelected(){
  if(!selected) return;
  if(furnLocked){ hint('הרהיטים נעולים - בטל את הנעילה כדי להסיר'); return; }
  if(!selected.draggable){ hint('רהיט קבוע - אי אפשר להסיר'); return; }
  const n=selected.name; removeItem(selected); select(null); saveState(); hint('הוסר: '+n);
}
$('btn-remove').onclick=removeSelected;
// ----- walk mode: grab and carry furniture -----
function holdDist(it){ return Math.max(it.hx,it.hz)+0.8; }
function updateWalkBtns(){
  $('btn-grab').textContent=held?'✋ שחרר':'✋ אחוז';
  $('btn-walk-rot').classList.toggle('hidden',!held);
  $('btn-walk-del').classList.toggle('hidden',!held);
}
function release(){ if(held){ held=null; saveState(); } if(typeof updateWalkBtns==='function') updateWalkBtns(); hl.visible=false; }
function grab(){
  if(furnLocked){ hint('הרהיטים נעולים - בטל את הנעילה כדי להזיז'); return; }
  ray.setFromCamera(new THREE.Vector2(0,0),walkCam);
  const hits=ray.intersectObjects(pickMeshes.filter(m=>m.userData.item.draggable),false);
  const h=hits[0];
  if(!h||h.distance>4.5){ hint('כוון את העיגול לרהיט (עד 4 מטר) ולחץ אחוז'); return; }
  held=h.object.userData.item; updateWalkBtns(); hint(held.name+' - הזז כדי לשאת, ↻ לסיבוב, שחרר להנחה',3500);
}
$('btn-grab').onclick=()=>{ if(held) { release(); hint('הונח'); } else grab(); };

// ----- furniture movement lock -----
function setFurnLock(v,quiet){
  furnLocked=!!v;
  try{ localStorage.setItem('apartment3d-lock',furnLocked?'1':'0'); }catch(e){}
  const b=$('btn-lock'); if(b){ b.textContent=furnLocked?'🔒':'🔓'; b.classList.toggle('active',furnLocked); }
  if(furnLocked&&held) release();
  if(!quiet) hint(furnLocked?'הרהיטים נעולים - לא ניתן להזיז אותם':'נעילת הרהיטים בוטלה');
}
const lockBtn=$('btn-lock'); if(lockBtn) lockBtn.onclick=()=>setFurnLock(!furnLocked);
setFurnLock(furnLocked,true);
$('btn-walk-rot').onclick=()=>{ if(held) rotateItem(held); };
$('btn-walk-del').onclick=()=>{ if(!held) return; if(furnLocked){ hint('הרהיטים נעולים - בטל את הנעילה כדי להסיר'); return; } const it=held; held=null; removeItem(it); saveState(); updateWalkBtns(); hint('הוסר: '+it.name); };
function carryStep(){
  if(!held) return;
  const d=holdDist(held), tx=player.x-Math.sin(player.yaw)*d, tz=player.z-Math.cos(player.yaw)*d;
  moveItemTo(held,tx,tz);
  if(Math.hypot(held.group.position.x-player.x,held.group.position.z-player.z)>d+2.2){ release(); hint('הרהיט נתקע - הונח'); }
}
// ----- catalog -----
let catTab=0;
function buildCatalog(){
  const tabs=$('cat-tabs'), grid=$('cat-grid'); tabs.innerHTML=''; grid.innerHTML='';
  CATALOG.forEach(([title],i)=>{ const b=document.createElement('button'); b.className='cat-tab'+(i===catTab?' sel':''); b.textContent=title;
    b.onclick=()=>{ catTab=i; buildCatalog(); }; tabs.appendChild(b); });
  CATALOG[catTab][1].forEach(([id,name,f])=>{
    const [g,hx,hz]=f();
    const b=document.createElement('button'); b.className='cat-item';
    b.innerHTML='<b>'+name+'</b><span>'+(hx*2).toFixed(1)+' × '+(hz*2).toFixed(1)+' מ׳</span>';
    b.onclick=()=>addFromCatalog(id); grid.appendChild(b); });
}
function openCatalog(){ if(furnLocked){ hint('הרהיטים נעולים - בטל את הנעילה כדי להוסיף'); return; } buildCatalog(); $('catalog').classList.remove('hidden'); }
function addFromCatalog(id){
  if(furnLocked){ hint('הרהיטים נעולים - בטל את הנעילה כדי להוסיף'); return; }
  const d=CAT_MAP[id]; if(!d) return;
  $('catalog').classList.add('hidden');
  let x,z;
  if(mode==='walk'){ release(); x=player.x-Math.sin(player.yaw)*2.0; z=player.z-Math.cos(player.yaw)*2.0; }
  else { const pt=floorPoint(innerWidth/2,innerHeight/2); x=pt?pt.x:orbit.cx; z=pt?pt.z:orbit.cz; x=Math.max(0.5,Math.min(18,x)); z=Math.max(0.5,Math.min(12.2,z)); }
  const it=addItem(d.name,d.factory,x,z,mode==='walk'?player.yaw+Math.PI:0,true,id);
  const [fx,fz]=freeSpot(it,x,z); it.group.position.x=fx; it.group.position.z=fz; syncCollider(it);
  if(mode==='walk'){ held=it; updateWalkBtns(); hint('נוסף: '+d.name+' - הזז כדי למקם, שחרר להנחה',3500); }
  else { select(it); hint('נוסף: '+d.name+' - גרור למקום'); }
  saveState();
}
$('btn-add').onclick=openCatalog; $('btn-walk-add').onclick=openCatalog;
$('cat-close').onclick=()=>$('catalog').classList.add('hidden');
$('btn-pan').onclick=()=>{ panMode=!panMode; $('btn-pan').classList.toggle('active',panMode); hint(panMode?'גרור באצבע אחת כדי להזיז את המבט':'גרור לסיבוב. שתי אצבעות: זום והזזה'); };
$('btn-rotate').onclick=rotateSelected;
$('btn-reset').onclick=()=>{
  if(furnLocked){ hint('הרהיטים נעולים - בטל את הנעילה כדי לאפס את הסידור'); return; }
  localStorage.removeItem(LS); release(); select(null);
  clearMovable();
  PLACEMENTS.forEach(([n,f,x,z,r,d],i)=>{ if(d) addItem(n,f,x,z,r,true,'h'+i); });
  hint('הסידור אופס');
};
$('btn-paint-center').onclick=()=>{
  ray.setFromCamera(new THREE.Vector2(0,0),walkCam);
  const hits=ray.intersectObjects(paintables.filter(m=>m.material!==glassMat),false);
  if(hits[0]&&hits[0].distance<4) paintWall(hits[0].object.userData.wallId,paintColor);
};

// ---------- resize / loop ----------
function resize(){
  renderer.setSize(innerWidth,innerHeight,false);
  for(const c of [walkCam,topCam]){ c.aspect=innerWidth/innerHeight; c.updateProjectionMatrix(); }
  if(typeof fitOrbit==='function'&&!resize.once){ resize.once=1; fitOrbit(); }
}
addEventListener('resize',resize); resize();

const clock=new THREE.Clock();
function tick(){
  requestAnimationFrame(tick);
  const dt=Math.min(clock.getDelta(),.05);
  if(mode==='walk'){
    let fx=0,fz=0;
    if(keys.KeyW||keys.ArrowUp)fz+=1; if(keys.KeyS||keys.ArrowDown)fz-=1;
    if(keys.KeyA||keys.ArrowLeft)fx-=1; if(keys.KeyD||keys.ArrowRight)fx+=1;
    if(isTouch&&joyId!==null){ fx+=joyDX/45; fz-=joyDY/45; }
    const sp=keys.ShiftLeft?4.6:2.6;
    const s=Math.sin(player.yaw),c=Math.cos(player.yaw);
    let mx=(-s*fz+ c*fx)*sp*dt, mz=(-c*fz- s*fx)*sp*dt;
    if(mx||mz){
      const nx=player.x+mx, nz=player.z+mz;
      if(!collide(nx,player.z)) player.x=nx;
      if(!collide(player.x,nz)) player.z=nz;
    }
    player.x=Math.max(-1,Math.min(19.5,player.x));
    player.z=Math.max(-1,Math.min(13.5,player.z));
    carryStep();
    walkCam.position.set(player.x,EYE,player.z);
    walkCam.rotation.set(0,0,0);
    walkCam.rotation.order='YXZ';
    walkCam.rotation.y=player.yaw; walkCam.rotation.x=player.pitch;
  }
  if(mode!=='walk'){
    let kx=0,ky=0; if(keys.KeyA||keys.ArrowLeft)kx-=1; if(keys.KeyD||keys.ArrowRight)kx+=1; if(keys.KeyW||keys.ArrowUp)ky-=1; if(keys.KeyS||keys.ArrowDown)ky+=1;
    if(kx||ky){ const sp=orbit.r*0.9*dt; const rx=Math.cos(orbit.theta),rz=-Math.sin(orbit.theta),fx=-Math.sin(orbit.theta),fz=-Math.cos(orbit.theta);
      orbit.cx=Math.max(-3,Math.min(22,orbit.cx+(rx*kx-fx*ky)*sp)); orbit.cz=Math.max(-4,Math.min(17,orbit.cz+(rz*kx-fz*ky)*sp)); updateTopCam(); } }
  paintTick();
  renderer.render(scene,activeCam);
}

window.__apt={moveItemTo,wallPen,addFromCatalog,openCatalog,removeItem,addItem,rotateItem,panView,grab,release,get held(){return held;},get selected(){return selected;},select,CAT_MAP,CATALOG,topCam,player,orbit,colliders,furniture,setMode,paintWall,wallGroups,mx,mz,resetView,updateTopCam,THREE,get furnLocked(){return furnLocked;},setFurnLock};
loadState();
$('walkbar').classList.remove('hidden'); $('panbtn').classList.add('hidden'); updateWalkBtns();
ceil.visible=true;
labelSprites.forEach(s=>s.visible=false);
fitOrbit(); updateTopCam();
$('btn-north').onclick=()=>{ resetView(); hint('מבט צפוני כמו בתוכנית'); };
tick();

// ---------- global saves (shared backend) ----------
const API='https://apartment3d-saves.ilanis-likely.workers.dev';
const TK='apartment3d-tokens';
const myTokens=()=>{ try{return JSON.parse(localStorage.getItem(TK)||'{}');}catch(e){return {};} };
function snapshot(){
  const cols={};
  wallGroups.forEach((ms,i)=>{ const m=ms.find(m=>m.material!==glassMat);
    if(m && m.material!==wallMat) cols[i]='#'+m.material.color.getHexString(); });
  const items=furniture.filter(f=>f.draggable).map(f=>[f.key,+f.group.position.x.toFixed(2),+f.group.position.z.toFixed(2),+f.group.rotation.y.toFixed(3)]);
  return {lv:LAYOUT,cols,items,paint:PAINT||[]};
}
function applySnapshot(s){
  if(!s||s.lv!==LAYOUT||!Array.isArray(s.items)) return false;
  release(); select(null);
  wallGroups.forEach(ms=>ms.forEach(m=>{ if(m.material!==glassMat && m.material!==wallMat){ m.material=wallMat; } }));
  Object.entries(s.cols||{}).forEach(([id,c])=>paintWall(+id,c));
  setPaint(Array.isArray(s.paint)?s.paint:[]);
  clearMovable();
  for(const [key,x,z,r] of s.items){ const d=resolveKey(key); if(d) addItem(d.name,d.factory,x,z,r,true,key); }
  saveState(); return true;
}
function rndTok(){ const a=new Uint8Array(24); crypto.getRandomValues(a); return [...a].map(x=>x.toString(16).padStart(2,'0')).join(''); }
const esc=t=>String(t==null?'':t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
async function api(path,opt){
  const r=await fetch(API+path,opt); let j=null; try{ j=await r.json(); }catch(e){}
  if(!r.ok) throw new Error((j&&j.error)||('HTTP '+r.status));
  return j;
}
async function doSave(){
  const name=(prompt('שם לשמירה (עד 40 תווים):','')||'').trim(); if(!name) return;
  const lastA=localStorage.getItem('apartment3d-author')||'';
  const author=(prompt('השם שלך (לא חובה, יופיע ברשימה הציבורית):',lastA)||'').trim();
  localStorage.setItem('apartment3d-author',author);
  const snap=snapshot(), tot=(snap.paint||[]).reduce((a,x)=>a+x.p.length,0);
  if((snap.paint||[]).length>300||tot>12000||JSON.stringify(snap).length>95000){ hint('יש יותר מדי ציורים על הקירות לשמירה גלובלית. מחק חלק ונסה שוב',6000); return; }
  const token=rndTok();
  hint('שומר...',8000);
  try{
    const r=await api('/saves',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,author,token,data:snap})});
    const t=myTokens(); t[r.id]=token; localStorage.setItem(TK,JSON.stringify(t));
    hint('נשמר: '+name+' (ייתכן שיופיע ברשימה אחרי כדקה)',5000);
  }catch(e){ hint('השמירה נכשלה: '+(navigator.onLine?e.message:'אין חיבור'),5000); }
}
async function openLoad(){
  const sh=$('loadsheet'); sh.classList.remove('hidden');
  const body=$('load-body'); body.innerHTML='<div class="ls-msg">טוען...</div>';
  try{
    const r=await api('/saves'); const mine=myTokens();
    if(!r.saves.length){ body.innerHTML='<div class="ls-msg">אין עדיין שמירות</div>'; return; }
    body.innerHTML='';
    for(const s of r.saves){
      const old=s.lv!==LAYOUT;
      const row=document.createElement('div'); row.className='ls-row'+(old?' old':'');
      const d=new Date(s.ts).toLocaleString('he-IL',{day:'numeric',month:'numeric',hour:'2-digit',minute:'2-digit'});
      row.innerHTML='<div class="ls-main"><b>'+esc(s.name)+'</b><span>'+(s.author?esc(s.author)+' · ':'')+d+' · '+s.n+' פריטים'+(old?' · גרסה ישנה':'')+'</span></div>';
      const go=document.createElement('button'); go.textContent='טען'; go.disabled=old;
      go.onclick=async()=>{
        go.textContent='...';
        try{ const f=await api('/saves/'+s.id);
          if(applySnapshot(f.data)){ sh.classList.add('hidden'); hint('נטען: '+s.name); } else { go.textContent='טען'; hint('השמירה לא תואמת לגרסה הנוכחית'); }
        }catch(e){ go.textContent='טען'; hint('הטעינה נכשלה: '+e.message,4000); }
      };
      row.appendChild(go);
      if(mine[s.id]){
        const del=document.createElement('button'); del.textContent='🗑'; del.title='מחק';
        del.onclick=async()=>{
          if(!confirm('למחוק את "'+s.name+'" לכולם?')) return;
          try{ await api('/saves/'+s.id,{method:'DELETE',headers:{'X-Token':mine[s.id]}});
            const t=myTokens(); delete t[s.id]; localStorage.setItem(TK,JSON.stringify(t)); row.remove(); hint('נמחק');
          }catch(e){ hint('המחיקה נכשלה: '+e.message,4000); }
        };
        row.appendChild(del);
      }
      body.appendChild(row);
    }
  }catch(e){ body.innerHTML='<div class="ls-msg">שגיאה בטעינת הרשימה: '+esc(navigator.onLine?e.message:'אין חיבור')+'</div>'; }
}
$('btn-save').onclick=doSave;
$('btn-load').onclick=openLoad;
$('load-close').onclick=()=>$('loadsheet').classList.add('hidden');


// ---------- wall brush (walk mode): lines, shapes and freehand on walls ----------
var PAINT, paintGroup=null, penDown=false, penStart=null, penCur=null, brushOn=false;
var tool='brush', brushR=0.035;
const decalMats={};
const decalMat=c=>decalMats[c]||(decalMats[c]=new THREE.MeshStandardMaterial({color:c,roughness:.92,polygonOffset:true,polygonOffsetFactor:-3,polygonOffsetUnits:-3}));
const dabGeo=new THREE.CircleGeometry(1,14), quadGeo=new THREE.PlaneGeometry(1,1);
function basisFor(nx,nz){
  const n=new THREE.Vector3(nx,0,nz), x=new THREE.Vector3(0,1,0).cross(n).normalize(), y=n.clone().cross(x);
  return {n,x,y};
}
function decal(geo,c,B,pos,sx,sy,rot,off){
  const m=new THREE.Mesh(geo,decalMat(c));
  const q=new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(B.x,B.y,B.n));
  m.quaternion.copy(q); m.position.copy(pos).addScaledVector(B.n,0.004+off);
  if(rot) m.rotateZ(rot);
  m.scale.set(sx,sy,1); return m;
}
function strokeMesh(st,idx){
  const g=new THREE.Group(), B=basisFor(st.n[0],st.n[1]), off=(idx%40)*0.0002, r=st.r;
  const P=[]; for(let i=0;i+2<st.p.length;i+=3) P.push(new THREE.Vector3(st.p[i],st.p[i+1],st.p[i+2]));
  if(!P.length) return g;
  const uv=p=>[p.dot(B.x),p.y];
  if(st.k==='b'){
    let last=null;
    for(let i=0;i<P.length;i++){
      const a=P[i], b=P[i+1]||P[i];
      const d=a.distanceTo(b), n=Math.max(1,Math.ceil(d/(r*0.6)));
      for(let j=0;j<(i===P.length-1?1:n);j++) g.add(decal(dabGeo,st.c,B,a.clone().lerp(b,j/n),r,r,0,off));
    }
  } else if(st.k==='l'&&P.length>1){
    const [a,b]=[P[0],P[1]], [u0,v0]=uv(a),[u1,v1]=uv(b), len=Math.hypot(u1-u0,v1-v0), ang=Math.atan2(v1-v0,u1-u0);
    g.add(decal(quadGeo,st.c,B,a.clone().lerp(b,.5),len,2*r,ang,off));
    g.add(decal(dabGeo,st.c,B,a,r,r,0,off)); g.add(decal(dabGeo,st.c,B,b,r,r,0,off));
  } else if(st.k==='r'&&P.length>1){
    const [a,b]=[P[0],P[1]], [u0,v0]=uv(a),[u1,v1]=uv(b);
    g.add(decal(quadGeo,st.c,B,a.clone().lerp(b,.5),Math.abs(u1-u0)||.01,Math.abs(v1-v0)||.01,0,off));
  } else if(st.k==='c'&&P.length>1){
    const R=Math.max(.02,P[0].distanceTo(P[1]));
    g.add(decal(dabGeo,st.c,B,P[0],R,R,0,off));
  }
  return g;
}
function setPaint(arr){
  if(paintGroup){ scene.remove(paintGroup); }
  PAINT=arr; paintGroup=new THREE.Group(); scene.add(paintGroup);
  PAINT.forEach((st,i)=>paintGroup.add(strokeMesh(st,i)));
}
function addStroke(st){
  PAINT.push(st); paintGroup.add(strokeMesh(st,PAINT.length-1)); saveState();
}
function aimPoint(){
  ray.setFromCamera(new THREE.Vector2(0,0),walkCam);
  const hits=ray.intersectObjects(paintables.filter(m=>m.material!==glassMat),false);
  const h=hits[0]; if(!h||h.distance>12||!h.face) return null;
  const n=h.face.normal; if(Math.abs(n.y)>0.5) return null;
  return {p:h.point.clone(),nx:Math.round(n.x),nz:Math.round(n.z),wallId:h.object.userData.wallId};
}
const rnd=v=>Math.round(v*100)/100;
var liveMesh=null, liveStroke=null;
function showLive(st){
  if(liveMesh){ scene.remove(liveMesh); liveMesh=null; }
  if(st){ liveMesh=strokeMesh(st,PAINT.length); scene.add(liveMesh); }
}
function sameSurface(a,b){
  if(a.nx!==b.nx||a.nz!==b.nz) return false;
  return a.nx? Math.abs(a.p.x-b.p.x)<0.03 : Math.abs(a.p.z-b.p.z)<0.03;
}
function paintTick(){
  if(mode!=='walk'||!brushOn||!penDown||tool==='wall') return;
  const a=aimPoint(); if(!a) return;
  if(tool==='brush'){
    if(!liveStroke||!sameSurface(liveStroke.a,a)){
      if(liveStroke) finishStroke();
      liveStroke={a,st:{k:'b',c:paintColor,r:brushR,n:[a.nx,a.nz],p:[]}};
    }
    const p=liveStroke.st.p, n=p.length;
    if(n===0||Math.hypot(a.p.x-p[n-3],a.p.y-p[n-2],a.p.z-p[n-1])>=0.04){
      if(n<1200){ p.push(rnd(a.p.x),rnd(a.p.y),rnd(a.p.z)); showLive(liveStroke.st); } else { finishStroke(); setPen(false); hint('הקו ארוך מדי, התחל קו חדש'); }
    }
  } else if(penStart){
    if(sameSurface(penStart,a)){
      penCur=a; showLive({k:tool==='line'?'l':tool==='rect'?'r':'c',c:paintColor,r:brushR,n:[a.nx,a.nz],p:[rnd(penStart.p.x),rnd(penStart.p.y),rnd(penStart.p.z),rnd(a.p.x),rnd(a.p.y),rnd(a.p.z)]});
    }
  }
}
function finishStroke(){
  if(liveStroke){ if(liveStroke.st.p.length>=3) addStroke(liveStroke.st); liveStroke=null; }
  showLive(null);
}
function setPen(on){
  penDown=on; $('btn-pen').textContent=on?(tool==='brush'?'⏹ סיים קו':'⏹ סיים'):(tool==='wall'?'🖌 צבע קיר':'✏️ צייר');
  $('btn-pen').classList.toggle('active',on);
}
function penPress(){
  if(mode!=='walk'||!brushOn) return;
  if(tool==='wall'){ const a=aimPoint(); if(a) paintWall(a.wallId,paintColor); else hint('כוון אל קיר'); return; }
  if(tool==='brush'){
    if(penDown){ finishStroke(); setPen(false); } else { const a=aimPoint(); if(!a){ hint('כוון אל קיר'); return; } setPen(true); hint('מצייר... הזז את המבט, ולחץ שוב לסיום',3500); }
    return;
  }
  // line / rect / circle: press once for the start, again for the end
  if(!penStart){ const a=aimPoint(); if(!a){ hint('כוון אל קיר'); return; } penStart=a; penCur=null; setPen(true); hint('כוון לנקודת הסיום ולחץ שוב'); }
  else {
    if(penCur){ addStroke({k:tool==='line'?'l':tool==='rect'?'r':'c',c:paintColor,r:brushR,n:[penStart.nx,penStart.nz],p:[rnd(penStart.p.x),rnd(penStart.p.y),rnd(penStart.p.z),rnd(penCur.p.x),rnd(penCur.p.y),rnd(penCur.p.z)]}); }
    else hint('הנקודה השנייה חייבת להיות על אותו קיר');
    penStart=null; penCur=null; showLive(null); setPen(false);
  }
}
function cancelPen(){ liveStroke=null; penStart=null; penCur=null; showLive(null); setPen(false); }
function setTool(t){
  cancelPen(); tool=t;
  document.querySelectorAll('.tl').forEach(b=>b.classList.toggle('sel',b.dataset.t===t));
  setPen(false);
}
function setBrush(on){
  brushOn=on; if(!on) cancelPen();
  $('brushbar').classList.toggle('hidden',!on);
  $('btn-brush').classList.toggle('active',on);
  if(on) hint('כוון את העיגול אל קיר ולחץ ✏️ צייר, ואז הזז את המבט',5000);
}
// UI wiring
(function(){
  const sw=$('bb-swatches');
  SWATCHES.forEach(c=>{ const b=document.createElement('div'); b.className='swatch'; b.style.background=c;
    b.onclick=()=>{ paintColor=c; sw.querySelectorAll('.swatch').forEach(x=>x.classList.remove('sel')); b.classList.add('sel'); }; sw.appendChild(b); });
  paintColor=SWATCHES[9]; sw.children[9].classList.add('sel'); document.querySelectorAll('#swatches .swatch').forEach((x,i)=>x.classList.toggle('sel',i===9));
  $('bb-color').oninput=e=>{ paintColor=e.target.value; sw.querySelectorAll('.swatch').forEach(x=>x.classList.remove('sel')); };
  document.querySelectorAll('.tl').forEach(b=>b.onclick=()=>setTool(b.dataset.t));
  document.querySelectorAll('.sz').forEach(b=>b.onclick=()=>{ brushR=+b.dataset.r; document.querySelectorAll('.sz').forEach(x=>x.classList.toggle('sel',x===b)); });
  $('btn-pen').onclick=penPress;
  $('btn-brush').onclick=()=>setBrush(!brushOn);
  $('btn-pundo').onclick=()=>{ if(penDown||penStart){ cancelPen(); return; } if(!PAINT.length) return; PAINT.pop(); setPaint(PAINT); saveState(); hint('בוטל'); };
  $('btn-pclear').onclick=()=>{ if(!PAINT.length) return; if(!confirm('למחוק את כל הציורים על הקירות?')) return; setPaint([]); saveState(); };
  addEventListener('keydown',e=>{ if(e.code==='KeyE'&&mode==='walk'&&brushOn) penPress(); });
  try{ const s=JSON.parse(localStorage.getItem(LS)||'null'); setPaint(s&&Array.isArray(s.paint)?s.paint:[]); }catch(e){ setPaint([]); }
  const oldSet=setMode;
})();
window.__apt.penPress=penPress; window.__apt.setBrush=setBrush; window.__apt.setTool=setTool; window.__apt.aimPoint=aimPoint; window.__apt.getPaint=()=>PAINT;
