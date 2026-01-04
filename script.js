const click = document.getElementById("click");
const sections = document.querySelectorAll("section");
const menu = document.getElementById("menu");

function sfx() {
  if (click) click.play().catch(() => {});
}

function openSection(id) {
  sfx();
  menu.classList.add("hidden");
  sections.forEach(s => s.classList.add("hidden"));
  document.getElementById(id).classList.remove("hidden");
}

function back() {
  sfx();
  sections.forEach(s => s.classList.add("hidden"));
  menu.classList.remove("hidden");
}

function copy() {
  sfx();
  navigator.clipboard.writeText("https://github.com/yourname");
}