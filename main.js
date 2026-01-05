// =========================
// SETUP
// =========================
const sceneEl = document.querySelector(".scene");
const canvas = document.createElement("canvas");
const ctx = canvas.getContext("2d");
sceneEl.appendChild(canvas);

// =========================
// WORLD CONFIG
// =========================
const world = {
  w: 20,
  h: 20
};

// =========================
// RESIZE & SCALE
// =========================
let tileSize = 16;
let offsetX = 0;
let offsetY = 0;

function resize() {
  const r = sceneEl.getBoundingClientRect();

  canvas.width = r.width;
  canvas.height = r.height;

  // คำนวณ tile ให้พอดีกรอบ
  tileSize = Math.floor(
    Math.min(
      canvas.width / world.w,
      canvas.height / world.h
    )
  );

  const worldPxW = tileSize * world.w;
  const worldPxH = tileSize * world.h;

  // จัดให้อยู่กลางกรอบ
  offsetX = Math.floor((canvas.width - worldPxW) / 2);
  offsetY = Math.floor((canvas.height - worldPxH) / 2);
}

window.addEventListener("resize", resize);
resize();

// =========================
// RNG / NOISE
// =========================
function rand(seed) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function noise(x, y) {
  return rand(x * 928371 + y * 12377);
}

// =========================
// BLOCK TYPE
// =========================
function blockAt(x, y) {
  const n = noise(x, y);
  if (n > 0.75) return "stone";
  if (n > 0.6) return "water";
  return "grass";
}

// =========================
// COLORS
// =========================
const colors = {
  grass: "#3cb371",
  stone: "#8f9aa3",
  water: "#4da3ff"
};

// =========================
// DRAW
// =========================
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let y = 0; y < world.h; y++) {
    for (let x = 0; x < world.w; x++) {
      const type = blockAt(x, y);

      ctx.fillStyle = colors[type];
      ctx.fillRect(
        offsetX + x * tileSize,
        offsetY + y * tileSize,
        tileSize,
        tileSize
      );
    }
  }

  // grid (optional – minecraft feel)
  ctx.strokeStyle = "rgba(0,0,0,0.15)";
  for (let x = 0; x <= world.w; x++) {
    ctx.beginPath();
    ctx.moveTo(offsetX + x * tileSize, offsetY);
    ctx.lineTo(offsetX + x * tileSize, offsetY + world.h * tileSize);
    ctx.stroke();
  }
  for (let y = 0; y <= world.h; y++) {
    ctx.beginPath();
    ctx.moveTo(offsetX, offsetY + y * tileSize);
    ctx.lineTo(offsetX + world.w * tileSize, offsetY + y * tileSize);
    ctx.stroke();
  }
}

// =========================
// LOOP
// =========================
function loop() {
  draw();
  requestAnimationFrame(loop);
}
loop();