const menu = document.getElementById("menu");
const sections = document.querySelectorAll("section");

function openSection(id) {
  menu.classList.add("hidden");
  sections.forEach(s => s.classList.add("hidden"));
  document.getElementById(id).classList.remove("hidden");
}

function back() {
  sections.forEach(s => s.classList.add("hidden"));
  menu.classList.remove("hidden");
}

function copyGit() {
  navigator.clipboard.writeText("https://github.com/yourname");
}