// =========================
// SETUP
// =========================
const sceneEl = document.querySelector(".scene");
const canvas = document.createElement("canvas");
const ctx = canvas.getContext("2d");
sceneEl.appendChild(canvas);

const DPR = Math.min(2, window.devicePixelRatio || 1);

// =========================
// RESIZE
// =========================
function resize() {
  const r = sceneEl.getBoundingClientRect();
  canvas.width = Math.floor(r.width * DPR);
  canvas.height = Math.floor(r.height * DPR);
  canvas.style.width = r.width + "px";
  canvas.style.height = r.height + "px";
}
window.addEventListener("resize", resize);
resize();

// =========================
// ISOMETRIC CONFIG
// =========================
const iso = { tile: 24, ox: 0, oy: 0 };

// =========================
// NOISE / WORLD
// =========================
function rand(seed) {
  return Math.sin(seed * 999) * 10000 % 1;
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

const world = { w: 20, h: 20, maxZ: 8 };
const waterLevel = 3;

function heightAt(x, y) {
  return Math.floor(2 + noise(x * 30, y * 30) * (world.maxZ - 2));
}

// =========================
// BLOCK PALETTE
// =========================
const palette = {
  grass: ["#3cb371", "#2e8b57", "#236b46"],
  dirt: ["#70543e", "#5a4534", "#4a392c"],
  stone: ["#8f9aa3", "#6e7781", "#565e66"],
  water: ["#4da3ff", "#2b78e4", "#1e4f91"],
  wood: ["#8b5a2b", "#6f451e", "#5a3718"],
  leaf: ["#4caf50", "#3e8e41", "#2f6b31"]
};

function shade(hex, k) {
  const rgb = hex.replace("#", "").match(/.{2}/g).map(v => parseInt(v, 16));
  return `rgb(${rgb.map(v => Math.floor(v * k)).join(",")})`;
}

// =========================
// ISO PROJECTION
// =========================
function isoProject(ix, iy, iz) {
  const t = iso.tile;
  return {
    x: (ix - iy) * t + iso.ox,
    y: (ix + iy) * t * 0.5 + iso.oy - iz * t
  };
}

// =========================
// DRAW BLOCK
// =========================
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

// =========================
// TREE GENERATION
// =========================
function hasTree(x, y) {
  return noise(x * 99, y * 99) > 0.78 && heightAt(x, y) > waterLevel;
}

function drawTree(x, y) {
  const baseZ = heightAt(x, y) + 1;

  // trunk
  drawBlock(x, y, baseZ, "wood");
  drawBlock(x, y, baseZ + 1, "wood");

  // leaves
  const leaves = [
    [0, 0, 2],
    [1, 0, 2],
    [-1, 0, 2],
    [0, 1, 2],
    [0, -1, 2],
    [0, 0, 3]
  ];

  for (const [dx, dy, dz] of leaves) {
    drawBlock(x + dx, y + dy, baseZ + dz, "leaf");
  }
}

// =========================
// PLAYER PLACED BLOCKS
// =========================
const placedBlocks = new Map();
const key = (x, y, z) => `${x},${y},${z}`;

// =========================
// DRAW SCENE
// =========================
let cursor = { ix: 10, iy: 10 };

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  iso.ox = canvas.width * 0.5;
  iso.oy = 40 * DPR;

  // terrain
  for (let iz = 0; iz < world.maxZ; iz++) {
    for (let iy = world.h - 1; iy >= 0; iy--) {
      for (let ix = world.w - 1; ix >= 0; ix--) {
        const h = heightAt(ix, iy);
        if (iz > h) continue;
        drawBlock(ix, iy, iz, iz === h ? "grass" : "dirt");
      }
    }
  }

  // water
  ctx.globalAlpha = 0.75;
  for (let iy = 0; iy < world.h; iy++) {
    for (let ix = 0; ix < world.w; ix++) {
      if (heightAt(ix, iy) < waterLevel) {
        drawBlock(ix, iy, waterLevel, "water");
      }
    }
  }
  ctx.globalAlpha = 1;

  // trees
  for (let iy = 0; iy < world.h; iy++) {
    for (let ix = 0; ix < world.w; ix++) {
      if (hasTree(ix, iy)) drawTree(ix, iy);
    }
  }

  // placed blocks
  for (const [k, type] of placedBlocks) {
    const [x, y, z] = k.split(",").map(Number);
    drawBlock(x, y, z, type);
  }

  // cursor preview
  drawBlock(cursor.ix, cursor.iy, heightAt(cursor.ix, cursor.iy) + 1, "stone");
}

// =========================
// INPUT (MOUSE + TOUCH)
// =========================
function updateCursor(mx, my) {
  cursor.ix = Math.max(0, Math.min(world.w - 1,
    Math.round((my / (iso.tile * 0.5) + mx / iso.tile) / 2)
  ));
  cursor.iy = Math.max(0, Math.min(world.h - 1,
    Math.round((my / (iso.tile * 0.5) - mx / iso.tile) / 2)
  ));
}

sceneEl.addEventListener("mousemove", e => {
  const r = canvas.getBoundingClientRect();
  updateCursor(
    (e.clientX - r.left) * DPR - iso.ox,
    (e.clientY - r.top) * DPR - iso.oy
  );
  draw();
});

sceneEl.addEventListener("click", () => {
  const z = heightAt(cursor.ix, cursor.iy) + 1;
  const k = key(cursor.ix, cursor.iy, z);
  if (!placedBlocks.has(k)) placedBlocks.set(k, "stone");
  draw();
});

// mobile
sceneEl.addEventListener("touchstart", e => {
  e.preventDefault();
  const t = e.touches[0];
  const r = canvas.getBoundingClientRect();
  updateCursor(
    (t.clientX - r.left) * DPR - iso.ox,
    (t.clientY - r.top) * DPR - iso.oy
  );
  const z = heightAt(cursor.ix, cursor.iy) + 1;
  placedBlocks.set(key(cursor.ix, cursor.iy, z), "stone");
  draw();
}, { passive: false });

// =========================
// LOOP
// =========================
function loop() {
  draw();
  requestAnimationFrame(loop);
}
loop();
