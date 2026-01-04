/* =========================
   RANDOM SEED (NEW EVERY REFRESH)
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

/* =========================
   WORLD CONFIG (LOGICAL)
========================= */
const WORLD_W = 32;
const WORLD_H = 32;

/* =========================
   RESIZE (FIT CONTAINER)
========================= */
let TILE = 16;

function resize() {
  const rect = sceneEl.getBoundingClientRect();

  // คำนวณ tile ให้ "โลกทั้งใบพอดีกรอบ"
  TILE = Math.floor(
    Math.min(rect.width / WORLD_W, rect.height / WORLD_H)
  );

  const viewW = TILE * WORLD_W;
  const viewH = TILE * WORLD_H;

  canvas.width = Math.floor(viewW * DPR);
  canvas.height = Math.floor(viewH * DPR);
  canvas.style.width = viewW + "px";
  canvas.style.height = viewH + "px";

  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
}
window.addEventListener("resize", resize);
resize();

/* =========================
   RNG / NOISE
========================= */
function rand(n) {
  return Math.abs(Math.sin(n * 9999 + WORLD_SEED) * 10000) % 1;
}

function noise(x, y, scale = 1) {
  const s = 16 * scale;
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
   BIOME
========================= */
const BIOME = {
  FOREST: "forest",
  DESERT: "desert",
  CHERRY: "cherry"
};

function biomeAt(x, y) {
  const n = noise(x * 4, y * 4, 4);
  if (n < 0.33) return BIOME.DESERT;
  if (n < 0.66) return BIOME.FOREST;
  return BIOME.CHERRY;
}

/* =========================
   WORLD GENERATION
========================= */
const SEA_LEVEL = 0.42;
const world = [];

for (let y = 0; y < WORLD_H; y++) {
  world[y] = [];
  for (let x = 0; x < WORLD_W; x++) {
    const h = noise(x * 6, y * 6);
    const biome = biomeAt(x, y);

    let tile = "grass";
    if (h < SEA_LEVEL) tile = "water";
    else if (biome === BIOME.DESERT) tile = "sand";
    else if (biome === BIOME.CHERRY) tile = "cherryGrass";

    world[y][x] = {
      biome,
      height: h,
      tile,
      tree: null
    };
  }
}

/* =========================
   TREE PLACEMENT (NO STICKING)
========================= */
const TREE_CELL = 3;
const treeGrid = new Set();

for (let y = 0; y < WORLD_H; y++) {
  for (let x = 0; x < WORLD_W; x++) {
    const t = world[y][x];
    if (t.tile === "water") continue;

    const cx = Math.floor(x / TREE_CELL);
    const cy = Math.floor(y / TREE_CELL);
    const key = `${cx},${cy}`;

    if (treeGrid.has(key)) continue;

    const r = rand(cx * 1000 + cy * 77);
    if (r < 0.7) continue;

    if (t.biome === BIOME.FOREST) {
      t.tree = "tree";
      treeGrid.add(key);
    }
    if (t.biome === BIOME.CHERRY) {
      t.tree = "cherry";
      treeGrid.add(key);
    }
  }
}

/* =========================
   COLORS
========================= */
const colors = {
  grass: "#3cb371",
  cherryGrass: "#f2a7c6",
  sand: "#e6d690",
  water: "#4da3ff",
  tree: "#2e8b57",
  cherry: "#ff9acb",
  trunk: "#6b4f3a",
  stone: "#8f9aa3"
};

/* =========================
   DRAW
========================= */
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let y = 0; y < WORLD_H; y++) {
    for (let x = 0; x < WORLD_W; x++) {
      const t = world[y][x];

      ctx.fillStyle = colors[t.tile];
      ctx.fillRect(x * TILE, y * TILE, TILE, TILE);

      if (t.tree) {
        ctx.fillStyle = colors.trunk;
        ctx.fillRect(
          x * TILE + TILE * 0.35,
          y * TILE + TILE * 0.45,
          TILE * 0.3,
          TILE * 0.45
        );

        ctx.fillStyle = colors[t.tree];
        ctx.fillRect(
          x * TILE + TILE * 0.1,
          y * TILE + TILE * 0.05,
          TILE * 0.8,
          TILE * 0.6
        );
      }
    }
  }
}

/* =========================
   PLACE BLOCK (DEBUG)
========================= */
sceneEl.addEventListener("click", e => {
  const r = canvas.getBoundingClientRect();
  const x = Math.floor((e.clientX - r.left) / TILE);
  const y = Math.floor((e.clientY - r.top) / TILE);
  if (!world[y] || !world[y][x]) return;

  world[y][x].tile = "stone";
  draw();
});

/* =========================
   START
========================= */
draw();
