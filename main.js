/* =========================
   RANDOM SEED (NEW EVERY REFRESH)
========================= */
const WORLD_SEED = crypto.getRandomValues(new Uint32Array(1))[0];
console.log("WORLD SEED:", WORLD_SEED);

/* =========================
   SETUP
========================= */
const sceneEl = document.querySelector(".scene");
const canvas = document.createElement("canvas");
const ctx = canvas.getContext("2d");
sceneEl.appendChild(canvas);

const DPR = Math.min(2, window.devicePixelRatio || 1);

/* =========================
   RESIZE
========================= */
function resize() {
  const r = sceneEl.getBoundingClientRect();
  canvas.width = Math.floor(r.width * DPR);
  canvas.height = Math.floor(r.height * DPR);
  canvas.style.width = r.width + "px";
  canvas.style.height = r.height + "px";
}
window.addEventListener("resize", resize);
resize();

/* =========================
   ISOMETRIC
========================= */
const iso = { tile: 24, ox: 0, oy: 0 };

/* =========================
   RNG / NOISE
========================= */
function rand(n) {
  return Math.abs(Math.sin(n + WORLD_SEED) * 10000) % 1;
}

function noise(x, y, scale = 1) {
  const s = 64 * scale;
  const i = Math.floor(x / s);
  const j = Math.floor(y / s);
  const fx = (x % s) / s;
  const fy = (y % s) / s;

  const a = rand(i * 73856093 ^ j * 19349663);
  const b = rand((i + 1) * 73856093 ^ j * 19349663);
  const c = rand(i * 73856093 ^ (j + 1) * 19349663);
  const d = rand((i + 1) * 73856093 ^ (j + 1) * 19349663);

  const lerp = (p, q, t) => p + (q - p) * t;
  return lerp(lerp(a, b, fx), lerp(c, d, fx), fy);
}

/* =========================
   WORLD CONFIG
========================= */
const world = { w: 20, h: 20 };
const SEA_LEVEL = 4;
const MAX_HEIGHT = 8;
const MIN_TREE_DISTANCE = 3;

/* =========================
   HEIGHT (CONTROLLED)
========================= */
function heightAt(x, y) {
  const base = noise(x * 24, y * 24);
  const detail = noise(x * 80, y * 80);
  const h = base * 0.75 + detail * 0.25;
  return Math.max(2, Math.floor(3 + h * (MAX_HEIGHT - 3)));
}

/* =========================
   BIOME
========================= */
const BIOME = {
  FOREST: "forest",
  DESERT: "desert",
  CHERRY: "cherry"
};

function biomeAt(x, y) {
  const n = noise(x * 6, y * 6, 2);
  if (n < 0.33) return BIOME.DESERT;
  if (n < 0.66) return BIOME.FOREST;
  return BIOME.CHERRY;
}

/* =========================
   PALETTE
========================= */
const palette = {
  grass: ["#3cb371", "#2e8b57", "#236b46"],
  dirt: ["#70543e", "#5a4534", "#4a392c"],
  sand: ["#e6d690", "#d1c37a", "#bfae64"],
  cherryGrass: ["#f2a7c6", "#de8fb2", "#c7759c"],
  water: ["#4da3ff", "#2b78e4", "#1e4f91"],
  stone: ["#8f9aa3", "#6e7781", "#565e66"],
  wood: ["#8b5a2b", "#6f451e", "#5a3718"],
  leaf: ["#4caf50", "#3e8e41", "#2f6b31"],
  cherryLeaf: ["#ffb7d5", "#e89bbd", "#c97fa1"]
};

function shade(hex, k) {
  const rgb = hex.replace("#", "").match(/.{2}/g).map(v => parseInt(v, 16));
  return `rgb(${rgb.map(v => Math.floor(v * k)).join(",")})`;
}

/* =========================
   ISO PROJECT
========================= */
function isoProject(ix, iy, iz) {
  const t = iso.tile;
  return {
    x: (ix - iy) * t + iso.ox,
    y: (ix + iy) * t * 0.5 + iso.oy - iz * t
  };
}

/* =========================
   DRAW BLOCK
========================= */
function drawBlock(ix, iy, iz, type) {
  const t = iso.tile;
  const p = isoProject(ix, iy, iz);

  ctx.fillStyle = palette[type][0];
  ctx.beginPath();
  ctx.moveTo(p.x, p.y);
  ctx.lineTo(p.x + t, p.y + t * 0.5);
  ctx.lineTo(p.x, p.y + t);
  ctx.lineTo(p.x - t, p.y + t * 0.5);
  ctx.fill();

  ctx.fillStyle = shade(palette[type][1], 0.9);
  ctx.beginPath();
  ctx.moveTo(p.x - t, p.y + t * 0.5);
  ctx.lineTo(p.x - t, p.y + t * 1.5);
  ctx.lineTo(p.x, p.y + t * 2);
  ctx.lineTo(p.x, p.y + t);
  ctx.fill();

  ctx.fillStyle = shade(palette[type][2], 0.8);
  ctx.beginPath();
  ctx.moveTo(p.x + t, p.y + t * 0.5);
  ctx.lineTo(p.x + t, p.y + t * 1.5);
  ctx.lineTo(p.x, p.y + t * 2);
  ctx.lineTo(p.x, p.y + t);
  ctx.fill();
}

/* =========================
   CAVE SYSTEM
========================= */
function isCave(x, y, z) {
  if (z >= heightAt(x, y) - 1) return false; // ไม่ทะลุพื้น
  if (z < 1) return false;                   // ไม่เจาะล่างสุด
  return noise(x * 18 + z * 12, y * 18 + z * 12) > 0.68;
}

/* =========================
   TREE SYSTEM
========================= */
function canPlaceTree(x, y, placed) {
  for (let dy = -MIN_TREE_DISTANCE; dy <= MIN_TREE_DISTANCE; dy++) {
    for (let dx = -MIN_TREE_DISTANCE; dx <= MIN_TREE_DISTANCE; dx++) {
      if (placed.has(`${x + dx},${y + dy}`)) return false;
    }
  }
  return true;
}

function drawTree(x, y, cherry) {
  const z = heightAt(x, y) + 1;
  drawBlock(x, y, z, "wood");
  drawBlock(x, y, z + 1, "wood");

  const leaf = cherry ? "cherryLeaf" : "leaf";
  [[0,0,2],[1,0,2],[-1,0,2],[0,1,2],[0,-1,2],[0,0,3]]
    .forEach(([dx,dy,dz]) => drawBlock(x+dx, y+dy, z+dz, leaf));
}

/* =========================
   PLAYER BLOCKS
========================= */
const placedBlocks = new Map();
const key = (x,y,z)=>`${x},${y},${z}`;

/* =========================
   DRAW WORLD
========================= */
let cursor = { ix: 10, iy: 10 };

function draw() {
  ctx.clearRect(0,0,canvas.width,canvas.height);
  iso.ox = canvas.width * 0.5;
  iso.oy = 40 * DPR;

  // terrain + caves
  for (let iy = world.h - 1; iy >= 0; iy--) {
    for (let ix = world.w - 1; ix >= 0; ix--) {
      const h = heightAt(ix, iy);
      const biome = biomeAt(ix, iy);

      let top = "grass";
      if (biome === BIOME.DESERT) top = "sand";
      if (biome === BIOME.CHERRY) top = "cherryGrass";

      for (let iz = 0; iz <= h; iz++) {
        if (isCave(ix, iy, iz)) continue;
        drawBlock(ix, iy, iz, iz === h ? top : "dirt");
      }
    }
  }

  // water
  ctx.globalAlpha = 0.75;
  for (let y=0;y<world.h;y++)
    for (let x=0;x<world.w;x++)
      if (heightAt(x,y) <= SEA_LEVEL)
        drawBlock(x,y,SEA_LEVEL,"water");
  ctx.globalAlpha = 1;

  // trees (spaced)
  const treeMap = new Set();
  for (let y=0;y<world.h;y++) {
    for (let x=0;x<world.w;x++) {
      if (heightAt(x,y) <= SEA_LEVEL) continue;

      const biome = biomeAt(x,y);
      const n = noise(x * 32, y * 32);

      let chance = 0;
      if (biome === BIOME.FOREST) chance = 0.82;
      if (biome === BIOME.CHERRY) chance = 0.86;
      if (biome === BIOME.DESERT) continue;

      if (n > chance && canPlaceTree(x,y,treeMap)) {
        treeMap.add(`${x},${y}`);
        drawTree(x,y, biome === BIOME.CHERRY);
      }
    }
  }

  // placed blocks
  for (const [k,type] of placedBlocks) {
    const [x,y,z]=k.split(",").map(Number);
    drawBlock(x,y,z,type);
  }

  // cursor preview
  drawBlock(cursor.ix, cursor.iy, heightAt(cursor.ix,cursor.iy)+1, "stone");
}

/* =========================
   INPUT
========================= */
function updateCursor(mx,my){
  cursor.ix = Math.max(0, Math.min(world.w-1,
    Math.round((my/(iso.tile*0.5)+mx/iso.tile)/2)));
  cursor.iy = Math.max(0, Math.min(world.h-1,
    Math.round((my/(iso.tile*0.5)-mx/iso.tile)/2)));
}

sceneEl.addEventListener("mousemove",e=>{
  const r=canvas.getBoundingClientRect();
  updateCursor((e.clientX-r.left)*DPR-iso.ox,(e.clientY-r.top)*DPR-iso.oy);
  draw();
});

sceneEl.addEventListener("click",()=>{
  const z = heightAt(cursor.ix,cursor.iy)+1;
  placedBlocks.set(key(cursor.ix,cursor.iy,z),"stone");
  draw();
});

sceneEl.addEventListener("touchstart",e=>{
  e.preventDefault();
  const t=e.touches[0];
  const r=canvas.getBoundingClientRect();
  updateCursor((t.clientX-r.left)*DPR-iso.ox,(t.clientY-r.top)*DPR-iso.oy);
  placedBlocks.set(key(cursor.ix,cursor.iy,heightAt(cursor.ix,cursor.iy)+1),"stone");
  draw();
},{passive:false});

/* =========================
   LOOP
========================= */
(function loop(){
  draw();
  requestAnimationFrame(loop);
})();
