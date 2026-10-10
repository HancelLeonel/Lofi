const $ = (id) => document.getElementById(id);
const LS_KEY = "lofi-cafe-stations";

// Estación: { id, title, name }. "title" viene de YouTube; "name" es un nombre
// personalizado opcional que tiene prioridad sobre el título.
const save = () => { try { localStorage.setItem(LS_KEY, JSON.stringify(stations)); } catch {} };
const loadStations = () => {
  try {
    const s = JSON.parse(localStorage.getItem(LS_KEY));
    if (Array.isArray(s)) return s;
  } catch {}
  return STREAMS.map((s) => ({ id: s.id, title: s.name, name: "" }));
};

let stations = loadStations();
let currentId = null, player = null, ready = false, editing = false;

const label = (s) => s.name || s.title || s.id;
const thumb = (id) => `https://i.ytimg.com/vi/${id}/mqdefault.jpg`;

function videoId(input) {
  const m = input.match(/(?:v=|youtu\.be\/|\/live\/|\/embed\/|\/shorts\/)([\w-]{11})/) || input.match(/^([\w-]{11})$/);
  return m && m[1];
}

// Título real desde YouTube (oEmbed permite CORS y no requiere API key)
async function fetchTitle(id) {
  try {
    const r = await fetch(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent("https://www.youtube.com/watch?v=" + id)}`);
    if (!r.ok) return null;
    return (await r.json()).title || null;
  } catch { return null; }
}

async function refreshTitle(s) {
  const t = await fetchTitle(s.id);
  if (t && t !== s.title) { s.title = t; save(); render(); updateNow(); }
}

function render() {
  document.body.classList.toggle("editing", editing);
  $("edit").textContent = editing ? "Listo" : "Editar";
  const list = $("list");
  list.innerHTML = "";
  if (!stations.length) {
    list.innerHTML = '<li class="empty">No hay estaciones. Pega un link de YouTube abajo.</li>';
    return;
  }
  stations.forEach((s, i) => {
    const li = document.createElement("li");
    if (s.id === currentId) li.classList.add("active");

    const img = document.createElement("img");
    img.src = thumb(s.id); img.alt = ""; img.loading = "lazy";
    li.appendChild(img);

    if (editing) {
      const input = document.createElement("input");
      input.className = "name"; input.value = label(s);
      input.placeholder = s.title || "Nombre";
      input.onchange = () => {
        const v = input.value.trim();
        s.name = v && v !== s.title ? v : "";
        save(); updateNow();
      };
      li.appendChild(input);

      const mk = (txt, title, fn, disabled) => {
        const b = document.createElement("button");
        b.className = "icon"; b.textContent = txt; b.title = title; b.disabled = !!disabled;
        b.onclick = (e) => { e.stopPropagation(); fn(); };
        li.appendChild(b);
      };
      mk("↑", "Subir", () => move(i, -1), i === 0);
      mk("↓", "Bajar", () => move(i, 1), i === stations.length - 1);
      mk("↻", "Restaurar título de YouTube", () => { s.name = ""; save(); refreshTitle(s); render(); updateNow(); });
      mk("✕", "Eliminar", () => remove(i));
    } else {
      const span = document.createElement("span");
      span.className = "name"; span.textContent = label(s);
      li.appendChild(span);
      li.onclick = () => select(s.id);
    }
    list.appendChild(li);
  });
}

function move(i, d) {
  const j = i + d;
  if (j < 0 || j >= stations.length) return;
  [stations[i], stations[j]] = [stations[j], stations[i]];
  save(); render();
}

function remove(i) {
  const [s] = stations.splice(i, 1);
  if (s.id === currentId) { currentId = null; ready && player.stopVideo(); updateNow(); }
  save(); render();
}

function updateNow() {
  const s = stations.find((x) => x.id === currentId);
  $("now").textContent = s ? label(s) : "Elige una estación";
}

function select(id) {
  if (!ready || !stations.length) return;
  const s = stations.find((x) => x.id === id);
  if (!s) return;
  currentId = id;
  player.loadVideoById(id);
  updateNow(); render();
}

function step(d) {
  if (!stations.length) return;
  const i = stations.findIndex((s) => s.id === currentId);
  select(stations[(i + d + stations.length) % stations.length].id);
}

// La API de YouTube llama a esta función global cuando está lista
window.onYouTubeIframeAPIReady = () => {
  player = new YT.Player("player", {
    playerVars: { playsinline: 1 },
    events: {
      onReady: () => { ready = true; player.setVolume($("volume").value); },
      onStateChange: (e) => { $("play").textContent = e.data === YT.PlayerState.PLAYING ? "⏸" : "▶"; },
    },
  });
};

$("play").onclick = () => {
  if (!ready) return;
  if (!currentId) return stations[0] && select(stations[0].id);
  player.getPlayerState() === YT.PlayerState.PLAYING ? player.pauseVideo() : player.playVideo();
};
$("prev").onclick = () => step(-1);
$("next").onclick = () => step(1);
$("volume").oninput = (e) => ready && player.setVolume(e.target.value);
$("showVideo").onchange = (e) => $("player-wrap").classList.toggle("hidden", !e.target.checked);
$("edit").onclick = () => { editing = !editing; render(); };

$("add").onsubmit = (e) => {
  e.preventDefault();
  const id = videoId($("url").value.trim());
  if (!id) return alert("No pude encontrar el ID del video en ese link.");
  if (stations.some((s) => s.id === id)) return alert("Esa estación ya está en la lista.");
  const s = { id, title: "", name: "" };
  stations.push(s);
  $("url").value = "";
  save(); render(); refreshTitle(s);
};

$("reset").onclick = () => {
  if (!confirm("¿Restaurar la lista original de streams.js? Se perderán tus cambios.")) return;
  stations = STREAMS.map((s) => ({ id: s.id, title: s.name, name: "" }));
  currentId = null; ready && player.stopVideo();
  save(); updateNow(); render();
  stations.forEach(refreshTitle);
};

render();
stations.forEach(refreshTitle); // sincroniza títulos con YouTube al abrir
