/* =========================
   RANDOM SEED
========================= */
const WORLD_SEED = crypto.getRandomValues(new Uint32Array(1))[0];
console.log("SEED:", WORLD_SEED);

/* =========================
   SETUP
========================= */
const sceneEl = document.querySelector(".scene");
const canvas = document.createElement("canvas");
const ctx = canvas.getContext("2d");
sceneEl.appendChild(canvas);

const DPR = Math.min(2, window.devicePixelRatio || 1);

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
   ISO
========================= */
const iso = { tile: 24, ox: 0, oy: 0 };

/* =========================
   RNG / NOISE
========================= */
function rand(n) {
  return Math.abs(Math.sin(n * 918273 + WORLD_SEED) * 10000) % 1;
}

function noise(x, y, scale = 1) {
  const s = 64 * scale;
  const i = Math.floor(x / s);
  const j = Math.floor(y / s);
  const fx = (x % s) / s;
  const fy = (y % s) / s;

  const a = rand(i * 37 + j * 57);
  const b = rand((i + 1) * 37 + j * 57);
  const c = rand(i * 37 + (j + 1) * 57);
  const d = rand((i + 1) * 37 + (j + 1) * 57);

  const lerp = (p, q, t) => p + (q - p) * t;
  return lerp(lerp(a, b, fx), lerp(c, d, fx), fy);
}

/* =========================
   WORLD CONFIG
========================= */
const world = { w: 20, h: 20 };
const SEA_LEVEL = 4;
const MAX_HEIGHT = 8;

/* =========================
   HEIGHT (SMOOTH)
========================= */
function heightAt(x, y) {
  const h1 = noise(x * 20, y * 20);
  const h2 = noise(x * 60, y * 60);
  const h = h1 * 0.85 + h2 * 0.15;
  return Math.floor(3 + h * (MAX_HEIGHT - 3));
}

/* =========================
   BIOME (LARGE PATCH)
========================= */
const BIOME = {
  FOREST: "forest",
  DESERT: "desert",
  CHERRY: "cherry"
};

function biomeAt(x, y) {
  const n = noise(x * 5, y * 5, 2);
  if (n < 0.33) return BIOME.DESERT;
  if (n < 0.66) return BIOME.FOREST;
  return BIOME.CHERRY;
}

/* =========================
   PALETTE
========================= */
const palette = {
  grass: ["#3cb371", "#2e8b57", "#236b46"],
  cherryGrass: ["#f2a7c6", "#de8fb2", "#c7759c"],
  sand: ["#e6d690", "#d1c37a", "#bfae64"],
  dirt: ["#6b4f3a", "#5a3f2b", "#4a3324"],
  stone: ["#8f9aa3", "#6e7781", "#565e66"],
  water: ["#4da3ff", "#2b78e4", "#1e4f91"],
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
   CAVE (STONE ONLY)
========================= */
function isCave(x, y, z) {
  if (z >= heightAt(x, y) - 2) return false;
  return noise(x * 18 + z * 12, y * 18 + z * 12) > 0.7;
}

/* =========================
   TREE (GRID SPACING)
========================= */
const TREE_CELL = 4;

function treeAllowed(x, y) {
  const cx = Math.floor(x / TREE_CELL);
  const cy = Math.floor(y / TREE_CELL);
  const n = rand(cx * 999 + cy * 333);
  return n > 0.55;
}

function drawTree(x, y, cherry) {
  const z = getTopSolidZ(x, y) + 1;
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
   TOP SOLID Z (FIX CURSOR)
========================= */
function getTopSolidZ(x, y) {
  for (let z = heightAt(x, y); z >= 0; z--) {
    if (isCave(x, y, z)) continue;
    if (placedBlocks.has(key(x,y,z))) return z;
    return z;
  }
  return 0;
}

/* =========================
   DRAW WORLD
========================= */
let cursor = { ix: 10, iy: 10 };

function draw() {
  ctx.clearRect(0,0,canvas.width,canvas.height);
  iso.ox = canvas.width * 0.5;
  iso.oy = 40 * DPR;

  // terrain
  for (let y = world.h - 1; y >= 0; y--) {
    for (let x = world.w - 1; x >= 0; x--) {
      const h = heightAt(x, y);
      const biome = biomeAt(x, y);

      let top = "grass";
      if (biome === BIOME.DESERT) top = "sand";
      if (biome === BIOME.CHERRY) top = "cherryGrass";

      for (let z = 0; z <= h; z++) {
        if (isCave(x, y, z)) continue;

        let type = "stone";
        if (z === h) type = top;
        else if (z >= h - 2) type = "dirt";

        drawBlock(x, y, z, type);
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

  // trees (clean spacing)
  for (let y=0;y<world.h;y++) {
    for (let x=0;x<world.w;x++) {
      if (heightAt(x,y) <= SEA_LEVEL) continue;
      if (!treeAllowed(x,y)) continue;

      const biome = biomeAt(x,y);
      if (biome === BIOME.FOREST) drawTree(x,y,false);
      if (biome === BIOME.CHERRY) drawTree(x,y,true);
    }
  }

  // placed blocks
  for (const [k,type] of placedBlocks) {
    const [x,y,z]=k.split(",").map(Number);
    drawBlock(x,y,z,type);
  }

  // cursor preview
  const z = getTopSolidZ(cursor.ix, cursor.iy) + 1;
  drawBlock(cursor.ix, cursor.iy, z, "stone");
}

/* =========================
   INPUT
========================= */
function updateCursor(mx,my){
  cursor.ix=Math.max(0,Math.min(world.w-1,
    Math.round((my/(iso.tile*0.5)+mx/iso.tile)/2)));
  cursor.iy=Math.max(0,Math.min(world.h-1,
    Math.round((my/(iso.tile*0.5)-mx/iso.tile)/2)));
}

sceneEl.addEventListener("mousemove",e=>{
  const r=canvas.getBoundingClientRect();
  updateCursor((e.clientX-r.left)*DPR-iso.ox,(e.clientY-r.top)*DPR-iso.oy);
  draw();
});

sceneEl.addEventListener("click",()=>{
  const z = getTopSolidZ(cursor.ix,cursor.iy)+1;
  placedBlocks.set(key(cursor.ix,cursor.iy,z),"stone");
  draw();
});

sceneEl.addEventListener("touchstart",e=>{
  e.preventDefault();
  const t=e.touches[0];
  const r=canvas.getBoundingClientRect();
  updateCursor((t.clientX-r.left)*DPR-iso.ox,(t.clientY-r.top)*DPR-iso.oy);
  const z=getTopSolidZ(cursor.ix,cursor.iy)+1;
  placedBlocks.set(key(cursor.ix,cursor.iy,z),"stone");
  draw();
},{passive:false});

/* =========================
   LOOP
========================= */
(function loop(){
  draw();
  requestAnimationFrame(loop);
})();
