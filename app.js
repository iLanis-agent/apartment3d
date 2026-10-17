// Apartment 3D - interactive walkthrough built from the floor plan.
// Walk (first-person), Arrange (move furniture), Paint (recolor walls).
import * as THREE from 'three';

// ---------- plan data (meters; dimensions per the plan's labels) ----------
const WALL_H = 2.7, EXT_T = 0.2, INT_T = 0.12;

// openings: {at (m along wall), w, type:'door'|'window'|'open'}
const WALLS = [
  // exterior
  {x1:0,z1:0,x2:14,z2:0,t:EXT_T,openings:[
    {at:2.0,w:1.8,type:'window'},{at:5.7,w:1.6,type:'window'},{at:8.9,w:1.6,type:'window'},
    {at:11.3,w:0.6,type:'window'},{at:13.0,w:0.8,type:'window'}]},
  {x1:0,z1:0,x2:0,z2:7.13,t:EXT_T,openings:[
    {at:2.0,w:1.4,type:'window'},{at:5.7,w:0.6,type:'window'}]},
  {x1:14,z1:0,x2:14,z2:10.05,t:EXT_T,openings:[
    {at:1.2,w:0.8,type:'window'},{at:5.0,w:1.0,type:'door'},{at:7.5,w:1.8,type:'window'}]},
  {x1:0,z1:7.13,x2:1.53,z2:7.13,t:EXT_T,openings:[{at:0.7,w:0.6,type:'window'}]},
  {x1:1.53,z1:7.69,x2:4.48,z2:7.69,t:EXT_T,openings:[
    {at:0.6,w:0.9,type:'door'},{at:2.3,w:1.0,type:'window'}]},
  {x1:4.48,z1:7.75,x2:8.23,z2:7.75,t:EXT_T,openings:[{at:0.9,w:1.0,type:'window'},{at:2.6,w:2.0,type:'open'}]},
  {x1:8.23,z1:10.05,x2:12.23,z2:10.05,t:EXT_T,openings:[{at:2.0,w:2.4,type:'open'}]},
  {x1:12.23,z1:10.05,x2:14,z2:10.05,t:EXT_T,openings:[{at:0.9,w:0.9,type:'window'}]},
  // interior - north bedrooms
  {x1:4.10,z1:0,x2:4.10,z2:3.50,t:INT_T,openings:[]},
  {x1:0,z1:3.50,x2:4.10,z2:3.50,t:INT_T,openings:[{at:3.4,w:0.9,type:'door'}]},
  {x1:4.10,z1:2.80,x2:7.30,z2:2.80,t:INT_T,openings:[{at:2.4,w:0.9,type:'door'}]},
  {x1:7.30,z1:0,x2:7.30,z2:3.15,t:INT_T,openings:[]},
  {x1:7.30,z1:3.15,x2:10.55,z2:3.15,t:INT_T,openings:[{at:0.6,w:0.9,type:'door'}]},
  {x1:10.55,z1:0,x2:10.55,z2:3.15,t:INT_T,openings:[]},
  // wc north + bath east
  {x1:10.55,z1:1.23,x2:12.15,z2:1.23,t:INT_T,openings:[{at:0.35,w:0.8,type:'door'}]},
  {x1:12.15,z1:0,x2:12.15,z2:1.23,t:INT_T,openings:[]},
  {x1:12.15,z1:2.53,x2:14,z2:2.53,t:INT_T,openings:[{at:0.9,w:0.8,type:'door'}]},
  // wc east (services)
    {x1:10.55,z1:1.23,x2:10.55,z2:4.21,t:INT_T,openings:[]},
  {x1:12.0,z1:1.23,x2:12.0,z2:4.21,t:INT_T,openings:[{at:2.2,w:0.8,type:'door'}]},
  {x1:10.55,z1:4.21,x2:14,z2:4.21,t:INT_T,openings:[{at:2.45,w:1.6,type:'open'}]},
  // bathroom west + kids
  {x1:0,z1:4.60,x2:1.53,z2:4.60,t:INT_T,openings:[{at:1.1,w:0.8,type:'door'}]},
  {x1:1.53,z1:4.60,x2:1.53,z2:7.69,t:INT_T,openings:[]},
  {x1:1.53,z1:4.60,x2:4.48,z2:4.60,t:INT_T,openings:[{at:2.27,w:0.9,type:'door'}]},
  {x1:4.48,z1:4.60,x2:4.48,z2:7.75,t:INT_T,openings:[]},
  // kitchen
  {x1:4.48,z1:4.60,x2:8.23,z2:4.60,t:INT_T,openings:[{at:1.35,w:0.9,type:'door'}]},
  // long divider kitchen|dining / living
  {x1:8.23,z1:4.60,x2:8.23,z2:10.05,t:INT_T,openings:[{at:1.6,w:2.8,type:'open'}]},
  // living north + east
  {x1:8.23,z1:4.60,x2:12.23,z2:4.60,t:INT_T,openings:[{at:2.0,w:2.6,type:'open'}]},
  {x1:12.23,z1:4.60,x2:12.23,z2:10.05,t:INT_T,openings:[{at:0.6,w:0.9,type:'door'}]},
];

// floors: [x1,z1,x2,z2, kind]
const FLOORS = [
  [0,0,14,10.05,'wood'],
  [0,3.60,1.53,6.13,'tile'],            // bathroom west
  [10.55,0,12.08,1.23,'tile'],          // wc north
  [12.08,0,14,2.53,'tile'],             // bath east
  [10.55,2.53,12.0,4.21,'tile'],        // wc east
  [4.48,4.60,8.23,7.75,'kfloor'],        // kitchen + dining
  [0,7.13,1.53,8.0,'deck'],            // terrace west step-up
  [1.53,7.69,4.48,8.0,'deck'],
  [0,8.0,8.23,11.11,'deck'],
  [4.48,7.75,8.23,8.0,'deck'],           // main terrace
  [8.23,10.05,11.01,11.11,'deck'],
  [0,-1.8,3.3,0,'deck'],                // north-west deck
  [11.5,-1.8,14,0,'deck'],              // north-east deck
  [3.3,-1.8,11.5,0,'lawn'],             // garden lawn
  [11.01,10.05,14,11.11,'lawn'],          // east/south lawn strip
];

const LABELS = [
  [2.05,1.75,'חדר שינה ראשי'],[5.7,1.4,'חדר שינה'],[8.9,1.6,'חדר שינה'],
  [3.0,6.1,'חדר ילדים'],[6.35,5.4,'מטבח'],[10.2,7.3,'סלון'],
  [0.75,5.85,'רחצה'],[11.3,0.6,'שירותים'],[13.0,1.3,'אמבטיה'],[11.3,3.4,'שירותים'],
  [5.5,9.6,'מרפסת'],[7.4,-0.9,'גינה'],[13.3,5.0,'כניסה'],
];

const CEIL = [0,0,14,10.05];

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
sun.position.set(-14, 22, -10);
sun.castShadow = true;
sun.shadow.mapSize.set(2048,2048);
sun.shadow.camera.left=-20; sun.shadow.camera.right=20;
sun.shadow.camera.top=20; sun.shadow.camera.bottom=-20;
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
};

// ground base under everything
const base = new THREE.Mesh(new THREE.BoxGeometry(60,0.2,60),
  new THREE.MeshStandardMaterial({color:0x6f9a52,roughness:1}));
base.position.set(7,-0.11,5); base.receiveShadow=true; scene.add(base);

for(const [x1,z1,x2,z2,kind] of FLOORS){
  const m=new THREE.Mesh(new THREE.BoxGeometry(x2-x1,0.06,z2-z1),floorMats[kind]);
  m.position.set((x1+x2)/2, kind==='deck'?0.045:0.03, (z1+z2)/2);
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
const ceil = new THREE.Mesh(new THREE.BoxGeometry(CEIL[2]-CEIL[0],0.08,CEIL[3]-CEIL[1]),
  new THREE.MeshStandardMaterial({color:0xf7f5f0,roughness:1}));
ceil.position.set((CEIL[0]+CEIL[2])/2, WALL_H+0.04, (CEIL[1]+CEIL[3])/2);
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
rail(0,11.11,11.01,11.11); rail(0,8.0,0,11.11); rail(11.01,8.0,11.01,11.11);
rail(0,6.13,0,8.0); rail(0,-1.8,14,-1.8); rail(0,-1.8,0,0); rail(14,-1.8,14,0);

// a few garden trees
function tree(x,z){
  const g=new THREE.Group();
  const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.09,.13,1.1,8),
    new THREE.MeshStandardMaterial({color:0x6b4a2c}));
  trunk.position.y=.55;
  const crown=new THREE.Mesh(new THREE.IcosahedronGeometry(.85,1),
    new THREE.MeshStandardMaterial({color:0x4e7d3a,roughness:1}));
  crown.position.y=1.6; crown.castShadow=true;
  g.add(trunk,crown); g.position.set(x,0,z); scene.add(g);
}
tree(4.3,-1.0); tree(9.8,-0.8); tree(13.2,9.0); tree(12.4,10.6);

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
LABELS.forEach(([x,z,t])=>label(x,z,t));

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
  bbq(){ const g=new THREE.Group();
    cyl(g,.3,.25,.5,0x2e3238,0,.55,0);
    cyl(g,.04,.04,.55,0x54585e,-.2,0,-.2); cyl(g,.04,.04,.55,0x54585e,.2,0,-.2); cyl(g,.04,.04,.55,0x54585e,0,0,.22);
    return [g,.32,.32]; },
};

// name, factory, x, z, rotY, draggable
const PLACEMENTS = [
  ['מיטה זוגית', F.doubleBed, 1.7, 1.75, Math.PI/2, true],
  ['ארון', F.wardrobe, 3.7, 1.9, Math.PI/2, true],
  ['מיטת יחיד', F.singleBed, 4.65, 0.85, 0, true],
  ['שולחן עבודה', F.desk, 5.0, 2.35, Math.PI, true],
  ['כיסא', F.chair, 5.0, 1.75, 0, true],
  ['מיטת יחיד', F.singleBed, 10.0, 0.8, 0, true],
  ['ארון', F.wardrobe, 9.4, 2.75, 0, true],
  ['מיטת יחיד', F.singleBed, 2.95, 6.3, Math.PI, true],
  ['שולחן עבודה', F.desk, 2.0, 5.3, Math.PI/2, true],
  ['כיסא', F.chair, 2.0, 6.15, -Math.PI/2, true],
  ['ספה', F.sofa, 8.85, 7.6, Math.PI/2, true],
  ['כורסה', F.armchair, 10.0, 6.3, Math.PI, true],
  ['שולחן סלון', F.coffeeTable, 10.6, 7.75, 0, true],
  ['מזנון טלוויזיה', F.tvConsole, 11.9, 7.75, -Math.PI/2, true],
  ['שולחן אוכל', F.diningTable, 5.7, 7.0, 0, true],
  ['כיסא אוכל', F.diningChair, 5.0, 7.0, Math.PI/2, true],
  ['כיסא אוכל', F.diningChair, 6.4, 7.0, -Math.PI/2, true],
  ['כיסא אוכל', F.diningChair, 5.3, 6.45, 0, true],
  ['כיסא אוכל', F.diningChair, 5.7, 7.45, Math.PI, true],
  ['שיש מטבח', ()=>F.counter(1.9,.65), 7.2, 4.95, 0, false],
  ['שיש מטבח', ()=>F.counter(.65,2.9), 4.85, 6.1, 0, false],
  ['אמבטיה', F.tub, 0.42, 6.25, 0, false],
  ['אסלה', F.toilet, 0.45, 5.1, Math.PI, false],
  ['כיור', F.sink, 1.25, 6.6, Math.PI/2, false],
  ['מכונת כביסה', F.washer, 11.62, 1.7, 0, false],
  ['אמבטיה', F.tub, 13.55, 0.6, Math.PI/2, false],
  ['אסלה', F.toilet, 12.5, 1.9, Math.PI, false],
  ['כיור', F.sink, 13.62, 2.2, Math.PI, false],
  ['אסלה', F.toilet, 11.75, 0.85, Math.PI, false],
  ['כיור', F.sink, 11.75, 0.3, Math.PI, false],
  ['כיור', F.sink, 11.7, 2.85, 0, false],
  ['שולחן גינה', F.outTable, 2.6, 9.5, 0, true],
  ['כיסא נוח', F.lounge, 5.2, 10.2, 0, true],
  ['כיסא נוח', F.lounge, 6.1, 10.2, 0, true],
  ['מנגל', F.bbq, 0.6, 8.6, 0, true],
];

for(const [name,factory,x,z,rot,draggable] of PLACEMENTS){
  const [g,hx,hz]=factory();
  g.position.set(x,0,z); g.rotation.y=rot;
  scene.add(g);
  const item={group:g,name,draggable,hx,hz,home:{x,z,rot}};
  g.traverse(o=>{ if(o.isMesh){ o.userData.item=item; pickMeshes.push(o); } });
  furniture.push(item);
  colliders.push({minX:x-hx,maxX:x+hx,minZ:z-hz,maxZ:z+hz,item});
}

// selection highlight
const hl = new THREE.BoxHelper(undefined, 0x3fa7ff);
hl.visible=false; scene.add(hl);
let selected=null;
function select(item){
  selected=item;
  if(item){ hl.setFromObject(item.group); hl.visible=true; }
  else hl.visible=false;
  hint(item ? item.name+' - גרור להזזה, ↻ לסיבוב' : '');
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
const LS='apartment3d-v1', LAYOUT=4;  // bump LAYOUT on any wall/furniture change: stale saves are ignored
function saveState(){
  try{
    const cols={};
    wallGroups.forEach((ms,i)=>{ const m=ms.find(m=>m.material!==glassMat);
      if(m && m.material!==wallMat) cols[i]='#'+m.material.color.getHexString(); });
    const fur=furniture.filter(f=>f.draggable).map(f=>[
      +f.group.position.x.toFixed(2),+f.group.position.z.toFixed(2),+f.group.rotation.y.toFixed(2)]);
    localStorage.setItem(LS,JSON.stringify({lv:LAYOUT,cols,fur}));
  }catch(e){}
}
function loadState(){
  try{
    const s=JSON.parse(localStorage.getItem(LS)||'null'); if(!s||s.lv!==LAYOUT) return;
    Object.entries(s.cols||{}).forEach(([id,c])=>paintWall(+id,c));
    furniture.filter(f=>f.draggable).forEach((f,i)=>{
      const p=(s.fur||[])[i]; if(!p) return;
      f.group.position.x=p[0]; f.group.position.z=p[1]; f.group.rotation.y=p[2];
      const c=colliders.find(c=>c.item===f);
      if(c){ c.minX=p[0]-f.hx; c.maxX=p[0]+f.hx; c.minZ=p[1]-f.hz; c.maxZ=p[1]+f.hz; }
    });
  }catch(e){}
}

// ---------- player + cameras ----------
const player={x:13.5,z:5.2,yaw:Math.PI/2,pitch:0};
const EYE=1.6;
let mode='walk';               // walk | arrange | paint
let yawObj=new THREE.Object3D();
walkCam.position.set(0,EYE,0);

const orbit={theta:0.12, phi:0.55, r:16, cx:7, cz:4.7};
function updateTopCam(){
  const {theta,phi,r,cx,cz}=orbit;
  topCam.position.set(cx+r*Math.sin(phi)*Math.sin(theta), r*Math.cos(phi), cz+r*Math.sin(phi)*Math.cos(theta));
  topCam.lookAt(cx,0,cz);
}

const keys={};
addEventListener('keydown',e=>{ keys[e.code]=true;
  if(e.code==='KeyR'&&mode==='arrange'&&selected) rotateSelected(); });
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
    const [a,b]=[...orbPtrs.values()]; orbDist=Math.hypot(a.x-b.x,a.y-b.y);
  } else {
    tapInfo={x:e.clientX,y:e.clientY,t:performance.now()};
    const hit=pick(e.clientX,e.clientY,pickMeshes);
    dragItem=(mode==='arrange'&&hit&&hit.object.userData.item.draggable)?hit.object.userData.item:null;
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
    if(pt){
      dragItem.group.position.x=Math.max(-0.4,Math.min(14.4,pt.x));
      dragItem.group.position.z=Math.max(-1.6,Math.min(11.3,pt.z));
      const c=colliders.find(c=>c.item===dragItem);
      if(c){ c.minX=pt.x-dragItem.hx; c.maxX=pt.x+dragItem.hx; c.minZ=pt.z-dragItem.hz; c.maxZ=pt.z+dragItem.hz; }
      hl.setFromObject(dragItem.group);
    }
    return;
  }
  if(orbPtrs.size===1){ orbit.theta-=dx*0.006; orbit.phi=Math.max(0.25,Math.min(1.25,orbit.phi-dy*0.005)); updateTopCam(); }
  else if(orbPtrs.size===2){
    const [a,b]=[...orbPtrs.values()]; const d=Math.hypot(a.x-b.x,a.y-b.y);
    orbit.r=Math.max(6,Math.min(32,orbit.r*orbDist/Math.max(d,1))); orbDist=d; updateTopCam();
  }
});
function endPtr(e){
  orbPtrs.delete(e.pointerId);
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
canvas.addEventListener('pointerup',endPtr);
canvas.addEventListener('pointercancel',endPtr);
canvas.addEventListener('wheel',e=>{
  if(mode!=='walk'){ orbit.r=Math.max(6,Math.min(32,orbit.r+e.deltaY*0.02)); updateTopCam(); }
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
function rotateSelected(){
  if(!selected) return;
  selected.group.rotation.y+=Math.PI/2;
  const t=selected.hx; selected.hx=selected.hz; selected.hz=t;
  const c=colliders.find(c=>c.item===selected);
  if(c){ c.minX=selected.group.position.x-selected.hx; c.maxX=selected.group.position.x+selected.hx;
         c.minZ=selected.group.position.z-selected.hz; c.maxZ=selected.group.position.z+selected.hz; }
  hl.setFromObject(selected.group); saveState();
}
$('btn-rotate').onclick=rotateSelected;
$('btn-reset').onclick=()=>{
  localStorage.removeItem(LS);
  for(const f of furniture){ if(!f.draggable) continue;
    f.group.position.set(f.home.x,0,f.home.z); f.group.rotation.y=f.home.rot;
    const c=colliders.find(c=>c.item===f);
    if(c){ c.minX=f.home.x-f.hx;c.maxX=f.home.x+f.hx;c.minZ=f.home.z-f.hz;c.maxZ=f.home.z+f.hz; } }
  select(null); hint('הסידור אופס');
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
    player.x=Math.max(-1.5,Math.min(14.8,player.x));
    player.z=Math.max(-1.6,Math.min(11.9,player.z));
    walkCam.position.set(player.x,EYE,player.z);
    walkCam.rotation.set(0,0,0);
    walkCam.rotation.order='YXZ';
    walkCam.rotation.y=player.yaw; walkCam.rotation.x=player.pitch;
  }
  renderer.render(scene,activeCam);
}

window.__apt={player,orbit,colliders,furniture,setMode,paintWall,wallGroups};
loadState();
ceil.visible=true;
labelSprites.forEach(s=>s.visible=false);
updateTopCam();
tick();
