// Minimal voxel-style canvas rendering without external libs

/* =========================
   SETUP
========================= */
const sceneEl = document.getElementById("scene");
const canvas = document.createElement("canvas");
const ctx = canvas.getContext("2d");
sceneEl.appendChild(canvas);

const DPR = Math.min(2, window.devicePixelRatio || 1);

function resize() {
  const rect = sceneEl.getBoundingClientRect();
  canvas.width = Math.floor(rect.width * DPR);
  canvas.height = Math.floor(rect.height * DPR);
  canvas.style.width = rect.width + "px";
  canvas.style.height = rect.height + "px";
}
window.addEventListener("resize", () => {
  resize();
  draw();
});
resize();

/* =========================
   ISOMETRIC CONFIG
========================= */
const iso = {
  tile: 24,
  ox: 0,
  oy: 0
};

/* =========================
   NOISE / WORLD
========================= */
function rand(seed) {
  let x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function noise(x, y) {
  const s = 42;
  const i = Math.floor(x / s);
  const j = Math.floor(y / s);
  const fx = (x % s) / s;
  const fy = (y % s) / s;

  const a = rand(i * 37 + j * 913);
  const b = rand((i + 1) * 37 + j * 913);
  const c = rand(i * 37 + (j + 1) * 913);
  const d = rand((i + 1) * 37 + (j + 1) * 913);

  const lerp = (p, q, t) => p + (q - p) * t;
  return lerp(lerp(a, b, fx), lerp(c, d, fx), fy);
}

const world = {
  w: 20,
  h: 20,
  maxZ: 8
};

function heightAt(x, y) {
  const n = noise(x * 30, y * 30);
  return Math.floor(2 + n * (world.maxZ - 2));
}

/* =========================
   BLOCK DATA
========================= */
const palette = {
  grass: ["#3cb371", "#2e8b57", "#236b46"],
  dirt: ["#70543e", "#5a4534", "#4a392c"],
  stone: ["#8f9aa3", "#6e7781", "#565e66"],
  water: ["#4da3ff", "#2b78e4", "#1e4f91"]
};

function faceShade(hex, k) {
  const rgb = hex.replace("#", "").match(/.{2}/g).map(v => parseInt(v, 16));
  return `rgb(${rgb.map(v => Math.floor(v * k)).join(",")})`;
}

/* =========================
   PROJECTION
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

  // top
  ctx.fillStyle = palette[type][0];
  ctx.beginPath();
  ctx.moveTo(p.x, p.y);
  ctx.lineTo(p.x + t, p.y + t * 0.5);
  ctx.lineTo(p.x, p.y + t);
  ctx.lineTo(p.x - t, p.y + t * 0.5);
  ctx.closePath();
  ctx.fill();

  // left
  ctx.fillStyle = faceShade(palette[type][1], 0.9);
  ctx.beginPath();
  ctx.moveTo(p.x - t, p.y + t * 0.5);
  ctx.lineTo(p.x - t, p.y + t * 1.5);
  ctx.lineTo(p.x, p.y + t * 2);
  ctx.lineTo(p.x, p.y + t);
  ctx.closePath();
  ctx.fill();

  // right
  ctx.fillStyle = faceShade(palette[type][2], 0.8);
  ctx.beginPath();
  ctx.moveTo(p.x + t, p.y + t * 0.5);
  ctx.lineTo(p.x + t, p.y + t * 1.5);
  ctx.lineTo(p.x, p.y + t * 2);
  ctx.lineTo(p.x, p.y + t);
  ctx.closePath();
  ctx.fill();
}

/* =========================
   PLACED BLOCK STORAGE
========================= */
const placedBlocks = new Map();
const key = (x, y, z) => `${x},${y},${z}`;

/* =========================
   DRAW SCENE
========================= */
function draw() {
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  iso.ox = w * 0.5;
  iso.oy = 40 * DPR;

  // sky
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, "rgba(60,179,113,0.12)");
  sky.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  const waterLevel = 3;

  // terrain
  for (let iz = 0; iz < world.maxZ; iz++) {
    for (let iy = world.h - 1; iy >= 0; iy--) {
      for (let ix = world.w - 1; ix >= 0; ix--) {
        const hgt = heightAt(ix, iy);
        if (iz > hgt) continue;
        drawBlock(ix, iy, iz, iz === hgt ? "grass" : "dirt");
      }
    }
  }

  // water
  ctx.globalAlpha = 0.7;
  for (let iy = 0; iy < world.h; iy++) {
    for (let ix = 0; ix < world.w; ix++) {
      if (heightAt(ix, iy) < waterLevel) {
        drawBlock(ix, iy, waterLevel, "water");
      }
    }
  }
  ctx.globalAlpha = 1;

  // placed blocks
  for (const [k, type] of placedBlocks) {
    const [x, y, z] = k.split(",").map(Number);
    drawBlock(x, y, z, type);
  }

  // cursor preview
  const z = heightAt(cursor.ix, cursor.iy) + 1;
  drawBlock(cursor.ix, cursor.iy, z, "stone");
}

/* =========================
   CURSOR
========================= */
let cursor = { ix: 10, iy: 10 };

sceneEl.addEventListener("mousemove", e => {
  const rect = canvas.getBoundingClientRect();
  const mx = (e.clientX - rect.left) * DPR - iso.ox;
  const my = (e.clientY - rect.top) * DPR - iso.oy;

  const ix = Math.round((my / (iso.tile * 0.5) + mx / iso.tile) / 2);
  const iy = Math.round((my / (iso.tile * 0.5) - mx / iso.tile) / 2);

  cursor.ix = Math.max(0, Math.min(world.w - 1, ix));
  cursor.iy = Math.max(0, Math.min(world.h - 1, iy));
  draw();
});

/* =========================
   PLACE BLOCK (CLICK)
========================= */
sceneEl.addEventListener("click", () => {
  const x = cursor.ix;
  const y = cursor.iy;
  const z = heightAt(x, y) + 1;

  const k = key(x, y, z);
  if (placedBlocks.has(k)) return;

  placedBlocks.set(k, "stone");
  draw();
});

/* =========================
   THEME TOGGLE
========================= */
const toggleBtn = document.getElementById("toggle-theme");
let isLight = false;

toggleBtn.addEventListener("click", () => {
  isLight = !isLight;
  document.body.classList.toggle("light", isLight);
  toggleBtn.textContent = isLight ? "โหมดกลางวัน" : "โหมดกลางคืน";
});

/* =========================
   CAMERA SWAY
========================= */
let t = 0;
function animate() {
  t += 0.005;
  iso.oy = 40 * DPR + Math.sin(t) * 6 * DPR;
  draw();
  requestAnimationFrame(animate);
}

draw();
animate();
