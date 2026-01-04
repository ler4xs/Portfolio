// Minimal voxel-style canvas rendering without external libs
const sceneEl = document.getElementById('scene');
const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d');
sceneEl.appendChild(canvas);

const DPR = Math.min(2, window.devicePixelRatio || 1);
function resize() {
  const rect = sceneEl.getBoundingClientRect();
  canvas.width = Math.floor(rect.width * DPR);
  canvas.height = Math.floor(rect.height * DPR);
  canvas.style.width = rect.width + 'px';
  canvas.style.height = rect.height + 'px';
}
window.addEventListener('resize', () => { resize(); draw(); });
resize();

// Isometric voxel projection parameters
const iso = {
  tile: 24, // pixel size per block
  ox: 0, oy: 0, // origin offset, computed per frame
};

// Simple PRNG for repeatable terrain
function rand(seed) {
  let x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

// Height map using value noise
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
  const nx1 = lerp(a, b, fx);
  const nx2 = lerp(c, d, fx);
  return lerp(nx1, nx2, fy);
}

const world = {
  w: 20,
  h: 20,
  maxZ: 8,
};

function heightAt(x, y) {
  const n = noise(x * 30, y * 30);
  return Math.floor(2 + n * (world.maxZ - 2));
}

const palette = {
  grass: ['#3cb371', '#2e8b57', '#236b46'],
  dirt: ['#70543e', '#5a4534', '#4a392c'],
  stone: ['#8f9aa3', '#6e7781', '#565e66'],
  water: ['#4da3ff', '#2b78e4', '#1e4f91'],
};

function faceShade(hex, k) {
  // Apply simple darken by multiplying channels
  const toRGB = h => h.match(/.{1,2}/g).map(v => parseInt(v, 16));
  const [r, g, b] = toRGB(hex.replace('#',''));
  const d = (x) => Math.max(0, Math.min(255, Math.floor(x * k)));
  return `rgb(${d(r)}, ${d(g)}, ${d(b)})`;
}

function isoProject(ix, iy, iz) {
  const t = iso.tile;
  const x = (ix - iy) * t + iso.ox;
  const y = (ix + iy) * t * 0.5 + iso.oy - iz * t;
  return { x, y };
}

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

function draw() {
  const w = canvas.width, h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  // origin center
  iso.ox = w * 0.5;
  iso.oy = 40 * DPR;

  // sky gradient
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, 'rgba(60,179,113,0.12)');
  sky.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  // water level
  const waterLevel = 3;

  // draw terrain back-to-front
  for (let iz = 0; iz < world.maxZ; iz++) {
    for (let iy = world.h - 1; iy >= 0; iy--) {
      for (let ix = world.w - 1; ix >= 0; ix--) {
        const hgt = heightAt(ix, iy);
        if (iz > hgt) continue;
        const type = iz === hgt ? 'grass' : 'dirt';
        drawBlock(ix, iy, iz, type);
      }
    }
  }

  // water overlay (simple)
  ctx.globalAlpha = 0.7;
  for (let iy = 0; iy < world.h; iy++) {
    for (let ix = 0; ix < world.w; ix++) {
      const hgt = heightAt(ix, iy);
      if (hgt < waterLevel) {
        drawBlock(ix, iy, waterLevel, 'water');
      }
    }
  }
  ctx.globalAlpha = 1;
}

draw();

// Simple hover highlight: fake cursor block
let cursor = { ix: 10, iy: 10 };
sceneEl.addEventListener('mousemove', (e) => {
  const rect = canvas.getBoundingClientRect();
  const mx = (e.clientX - rect.left) * DPR - iso.ox;
  const my = (e.clientY - rect.top) * DPR - iso.oy;
  // Reverse iso approx to grid indices
  const ix = Math.round((my / (iso.tile * 0.5) + mx / iso.tile) / 2);
  const iy = Math.round((my / (iso.tile * 0.5) - mx / iso.tile) / 2);
  cursor.ix = Math.max(0, Math.min(world.w - 1, ix));
  cursor.iy = Math.max(0, Math.min(world.h - 1, iy));
  draw();
  const z = heightAt(cursor.ix, cursor.iy) + 1;
  drawBlock(cursor.ix, cursor.iy, z, 'stone');
});

// Theme toggle
const toggleBtn = document.getElementById('toggle-theme');
let isLight = false;
toggleBtn.addEventListener('click', () => {
  isLight = !isLight;
  document.body.classList.toggle('light', isLight);
  toggleBtn.textContent = isLight ? 'โหมดกลางวัน' : 'โหมดกลางคืน';
});

// Subtle camera sway animation
let t = 0;
function animate() {
  t += 0.005;
  iso.oy = 40 * DPR + Math.sin(t) * 6 * DPR;
  draw();
  requestAnimationFrame(animate);
}
animate();
