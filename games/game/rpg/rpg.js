const STORAGE_KEY = "englishQuestRpgPro_v1";

const WORLD_WIDTH = 2600;
const WORLD_HEIGHT = 1800;
const PLAYER_WIDTH = 42;
const PLAYER_HEIGHT = 60;
const NPC_WIDTH = 42;
const NPC_HEIGHT = 60;
const LEVEL_STEP = 40;

const missions = [
  {
    id: "teacher",
    name: "Teacher",
    x: 320,
    y: 260,
    shirt: "#38bdf8",
    pants: "#1d4ed8",
    skin: "#f2c9a0",
    hair: "#7c3aed",
    prompt: "What is the best response to: “How are you?”",
    options: ["I'm fine", "Blue car", "A book", "Good night"],
    answer: "I'm fine",
    speak: null,
    reward: { xp: 25, item: "Notebook" }
  },
  {
    id: "merchant",
    name: "Merchant",
    x: 820,
    y: 580,
    shirt: "#f59e0b",
    pants: "#b45309",
    skin: "#f2c9a0",
    hair: "#111827",
    prompt: "Translate: “Perro”",
    options: ["Dog", "Cat", "House", "Apple"],
    answer: "Dog",
    speak: null,
    reward: { xp: 20, item: "Word Coin" }
  },
  {
    id: "librarian",
    name: "Librarian",
    x: 1260,
    y: 360,
    shirt: "#a855f7",
    pants: "#6d28d9",
    skin: "#f2c9a0",
    hair: "#0f172a",
    prompt: "Listen and choose the word you hear.",
    options: ["library", "librery", "laboratory", "line"],
    answer: "library",
    speak: "library",
    reward: { xp: 25, item: "Library Pass" }
  },
  {
    id: "student",
    name: "Student",
    x: 1460,
    y: 1140,
    shirt: "#22c55e",
    pants: "#2563eb",
    skin: "#f2c9a0",
    hair: "#1f2937",
    prompt: "Choose the correct sentence.",
    options: ["I am a student", "Student am I", "I student am a", "A student I am"],
    answer: "I am a student",
    speak: null,
    reward: { xp: 30, item: "Grammar Key" }
  },
  {
    id: "principal",
    name: "Principal",
    x: 2100,
    y: 1440,
    shirt: "#ef4444",
    pants: "#7f1d1d",
    skin: "#f2c9a0",
    hair: "#111827",
    prompt: "Translate: “Amigo”",
    options: ["Friend", "Brother", "School", "Teacher"],
    answer: "Friend",
    speak: null,
    reward: { xp: 35, item: "Principal Seal" }
  }
];

const props = [
  { type: "tree", x: 140, y: 360, w: 52, h: 74, icon: "🌳" },
  { type: "tree", x: 220, y: 430, w: 52, h: 74, icon: "🌳" },
  { type: "tree", x: 410, y: 160, w: 52, h: 74, icon: "🌳" },
  { type: "house", x: 140, y: 1220, w: 160, h: 118, icon: "🏠" },
  { type: "house", x: 620, y: 1210, w: 160, h: 118, icon: "🏠" },
  { type: "rock", x: 930, y: 800, w: 56, h: 44, icon: "🪨" },
  { type: "rock", x: 1040, y: 840, w: 56, h: 44, icon: "🪨" },
  { type: "fence", x: 1520, y: 980, w: 116, h: 42, icon: "🚧" },
  { type: "school", x: 1860, y: 120, w: 280, h: 172, icon: "🏫" },
  { type: "tree", x: 2270, y: 420, w: 52, h: 74, icon: "🌳" },
  { type: "tree", x: 2380, y: 520, w: 52, h: 74, icon: "🌳" },
  { type: "house", x: 2200, y: 1200, w: 160, h: 118, icon: "🏠" }
];

const dom = {
  viewport: document.getElementById("viewport"),
  world: document.getElementById("world"),
  entities: document.getElementById("entities"),
  player: document.getElementById("player"),

  xpText: document.getElementById("xpText"),
  levelText: document.getElementById("levelText"),
  itemCountText: document.getElementById("itemCountText"),
  questCountText: document.getElementById("questCountText"),
  questProgressMini: document.getElementById("questProgressMini"),
  xpBarFill: document.getElementById("xpBarFill"),
  hintBox: document.getElementById("hintBox"),

  questList: document.getElementById("questList"),

  inventoryBtn: document.getElementById("inventoryBtn"),
  saveBtn: document.getElementById("saveBtn"),
  resetBtn: document.getElementById("resetBtn"),
  inventoryPanel: document.getElementById("inventoryPanel"),
  inventoryList: document.getElementById("inventoryList"),
  closeInventoryBtn: document.getElementById("closeInventoryBtn"),

  dialogOverlay: document.getElementById("dialogOverlay"),
  dialogTitle: document.getElementById("dialogTitle"),
  dialogMeta: document.getElementById("dialogMeta"),
  dialogPrompt: document.getElementById("dialogPrompt"),
  dialogOptions: document.getElementById("dialogOptions"),
  dialogFeedback: document.getElementById("dialogFeedback"),
  speakBtn: document.getElementById("speakBtn"),
  closeDialogBtn: document.getElementById("closeDialogBtn"),

  victoryOverlay: document.getElementById("victoryOverlay"),
  victoryText: document.getElementById("victoryText"),
  restartBtn: document.getElementById("restartBtn"),
  closeVictoryBtn: document.getElementById("closeVictoryBtn"),

  toast: document.getElementById("toast"),
  interactBtn: document.getElementById("interactBtn"),
  mobileButtons: Array.from(document.querySelectorAll("#mobileControls .pad-btn[data-dir]"))
};

const state = {
  mode: "play",
  player: {
    x: 180,
    y: 220
  },
  xp: 0,
  level: 1,
  inventory: [],
  completedQuests: new Set()
};

const input = {
  up: false,
  down: false,
  left: false,
  right: false
};

const missionNodes = new Map();
const obstacleRects = [];

let nearbyMission = null;
let activeMission = null;
let toastTimer = null;
let victoryShown = false;
let lastTime = 0;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function rectsOverlap(a, b) {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

function playerRectAt(x, y) {
  return {
    x,
    y,
    w: PLAYER_WIDTH,
    h: PLAYER_HEIGHT
  };
}

function missionCenter(mission) {
  return {
    x: mission.x + NPC_WIDTH / 2,
    y: mission.y + NPC_HEIGHT / 2
  };
}

function buildSaveObject() {
  return {
    player: { ...state.player },
    xp: state.xp,
    level: state.level,
    inventory: [...state.inventory],
    completedQuests: [...state.completedQuests]
  };
}

function saveGame(silent = false) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(buildSaveObject()));
    if (!silent) {
      showToast("Progreso guardado.");
    }
  } catch (error) {
    console.error("No se pudo guardar:", error);
    if (!silent) {
      showToast("No se pudo guardar el progreso.");
    }
  }
}

function loadGame() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;

  try {
    const parsed = JSON.parse(raw);

    if (parsed.player) {
      state.player.x = clamp(Number(parsed.player.x) || state.player.x, 0, WORLD_WIDTH - PLAYER_WIDTH);
      state.player.y = clamp(Number(parsed.player.y) || state.player.y, 0, WORLD_HEIGHT - PLAYER_HEIGHT);
    }

    state.xp = Math.max(0, Number(parsed.xp) || 0);
    state.level = Math.max(1, Number(parsed.level) || 1);
    state.inventory = Array.isArray(parsed.inventory) ? [...parsed.inventory] : [];
    state.completedQuests = new Set(Array.isArray(parsed.completedQuests) ? parsed.completedQuests : []);
  } catch (error) {
    console.error("Error al cargar guardado:", error);
  }
}

function addItem(name) {
  if (!state.inventory.includes(name)) {
    state.inventory.push(name);
  }
}

function xpToNextLevel() {
  return state.level * LEVEL_STEP;
}

function updateLevelProgress() {
  const previousThreshold = (state.level - 1) * LEVEL_STEP;
  const currentSpan = LEVEL_STEP;
  const progress = clamp(((state.xp - previousThreshold) / currentSpan) * 100, 0, 100);
  dom.xpBarFill.style.width = `${progress}%`;
}

function updateHUD() {
  dom.xpText.textContent = String(state.xp);
  dom.levelText.textContent = String(state.level);
  dom.itemCountText.textContent = String(state.inventory.length);
  dom.questCountText.textContent = `${state.completedQuests.size}/${missions.length}`;
  dom.questProgressMini.textContent = `${state.completedQuests.size}/${missions.length}`;
  updateLevelProgress();
}

function renderQuestList() {
  dom.questList.innerHTML = "";

  missions.forEach((mission) => {
    const li = document.createElement("li");
    li.className = mission.completed ? "quest-done" : "quest-pending";

    li.innerHTML = `
      <div class="quest-row">
        <span class="quest-name">${mission.name}</span>
        <span class="quest-status">${mission.completed ? "✅ Completada" : `+${mission.reward.xp} XP · ${mission.reward.item}`}</span>
      </div>
    `;

    dom.questList.appendChild(li);
  });
}

function renderInventory() {
  dom.inventoryList.innerHTML = "";

  if (state.inventory.length === 0) {
    dom.inventoryList.innerHTML = `
      <div class="item-card">
        <strong>Vacío</strong>
        <span>Completa misiones para conseguir objetos.</span>
      </div>
    `;
    return;
  }

  state.inventory.forEach((item) => {
    const card = document.createElement("div");
    card.className = "item-card";
    card.innerHTML = `
      <strong>${item}</strong>
      <span>Objeto obtenido en una misión.</span>
    `;
    dom.inventoryList.appendChild(card);
  });
}

function syncMissionVisual(mission) {
  const node = missionNodes.get(mission.id);
  if (!node) return;

  node.classList.toggle("completed", mission.completed);
  const badge = node.querySelector(".avatar-badge");
  if (badge) badge.textContent = mission.completed ? "✓" : "!";
}

function syncAllMissionVisuals() {
  missions.forEach((mission) => {
    mission.completed = state.completedQuests.has(mission.id);
    syncMissionVisual(mission);
  });
}

function createAvatarMarkup(name, completed, badge) {
  return `
    <div class="avatar-label">${name}</div>
    <div class="avatar-badge">${completed ? "✓" : badge}</div>
    <div class="hair"></div>
    <div class="head"></div>
    <div class="body"></div>
    <div class="arm left"></div>
    <div class="arm right"></div>
    <div class="leg left"></div>
    <div class="leg right"></div>
  `;
}

function createNpcNode(mission) {
  const npc = document.createElement("div");
  npc.className = "avatar npc";
  npc.dataset.id = mission.id;
  npc.style.left = `${mission.x}px`;
  npc.style.top = `${mission.y}px`;
  npc.style.setProperty("--skin", mission.skin);
  npc.style.setProperty("--shirt", mission.shirt);
  npc.style.setProperty("--pants", mission.pants);
  npc.style.setProperty("--hair", mission.hair);
  npc.innerHTML = createAvatarMarkup(mission.name, mission.completed, "!");
  npc.classList.toggle("completed", mission.completed);
  missionNodes.set(mission.id, npc);
  dom.entities.appendChild(npc);
}

function createPropNode(prop) {
  const el = document.createElement("div");
  el.className = `prop ${prop.type}`;
  el.style.left = `${prop.x}px`;
  el.style.top = `${prop.y}px`;
  el.style.width = `${prop.w}px`;
  el.style.height = `${prop.h}px`;
  el.innerHTML = `<span>${prop.icon}</span>`;
  dom.entities.appendChild(el);
  obstacleRects.push({
    x: prop.x,
    y: prop.y,
    w: prop.w,
    h: prop.h
  });
}

function buildWorld() {
  dom.entities.innerHTML = "";
  obstacleRects.length = 0;
  missionNodes.clear();

  props.forEach(createPropNode);
  missions.forEach((mission) => {
    mission.completed = state.completedQuests.has(mission.id);
    createNpcNode(mission);
  });

  updateQuestList();
  renderInventory();
}

function updateQuestList() {
  renderQuestList();
  updateHUD();
}

function movePlayer(dx, dy) {
  const nextX = clamp(state.player.x + dx, 0, WORLD_WIDTH - PLAYER_WIDTH);
  const nextY = clamp(state.player.y + dy, 0, WORLD_HEIGHT - PLAYER_HEIGHT);

  const horizontalRect = playerRectAt(nextX, state.player.y);
  const verticalRect = playerRectAt(state.player.x, nextY);

  const blockedX = obstacleRects.some((rect) => rectsOverlap(horizontalRect, rect));
  const blockedY = obstacleRects.some((rect) => rectsOverlap(verticalRect, rect));

  if (!blockedX) state.player.x = nextX;
  if (!blockedY) state.player.y = nextY;
}

function updatePlayerNode() {
  dom.player.style.left = `${state.player.x}px`;
  dom.player.style.top = `${state.player.y}px`;
}

function updateCamera() {
  const viewW = window.innerWidth;
  const viewH = window.innerHeight;

  const camX = clamp(
    viewW / 2 - (state.player.x + PLAYER_WIDTH / 2),
    viewW - WORLD_WIDTH,
    0
  );

  const camY = clamp(
    viewH / 2 - (state.player.y + PLAYER_HEIGHT / 2),
    viewH - WORLD_HEIGHT,
    0
  );

  dom.world.style.transform = `translate(${camX}px, ${camY}px)`;
}

function updateNearbyMission() {
  let nearest = null;
  let nearestDistance = Infinity;
  const playerCenterX = state.player.x + PLAYER_WIDTH / 2;
  const playerCenterY = state.player.y + PLAYER_HEIGHT / 2;

  missions.forEach((mission) => {
    const center = missionCenter(mission);
    const distance = Math.hypot(playerCenterX - center.x, playerCenterY - center.y);

    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearest = mission;
    }
  });

  if (nearestDistance <= 90) {
    nearbyMission = nearest;
  } else {
    nearbyMission = null;
  }
}

function updateHintBox() {
  if (state.mode !== "play") {
    dom.hintBox.textContent = state.mode === "inventory" ? "Inventario abierto." : "Diálogo abierto.";
    return;
  }

  if (nearbyMission) {
    dom.hintBox.textContent = nearbyMission.completed
      ? `${nearbyMission.name}: misión ya completada.`
      : `Cerca de ${nearbyMission.name}. Pulsa E para hablar.`;
    return;
  }

  dom.hintBox.textContent = "Explora el mapa y busca NPCs.";
}

function showToast(text) {
  dom.toast.textContent = text;
  dom.toast.classList.add("show");

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    dom.toast.classList.remove("show");
  }, 1600);
}

function openInventory() {
  if (state.mode !== "play") return;
  state.mode = "inventory";
  dom.inventoryPanel.classList.add("open");
  updateHintBox();
}

function closeInventory() {
  if (state.mode !== "inventory") return;
  state.mode = "play";
  dom.inventoryPanel.classList.remove("open");
  updateHintBox();
}

function closeDialog() {
  activeMission = null;
  dom.dialogOverlay.classList.add("hidden");

  if (state.mode === "dialog") {
    state.mode = "play";
  }

  updateHintBox();
}

function speakMissionWord(word) {
  if (!("speechSynthesis" in window)) {
    showToast("Tu navegador no soporta voz.");
    return;
  }

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(word);
  utterance.lang = "en-US";
  utterance.rate = 0.9;
  utterance.pitch = 1;
  window.speechSynthesis.speak(utterance);
}

function openDialog(mission) {
  if (state.mode !== "play") return;

  state.mode = "dialog";
  activeMission = mission;

  dom.dialogOverlay.classList.remove("hidden");
  dom.dialogTitle.textContent = mission.name;
  dom.dialogMeta.textContent = mission.completed
    ? "Ya completaste esta misión."
    : `Recompensa: +${mission.reward.xp} XP · ${mission.reward.item}`;
  dom.dialogPrompt.textContent = mission.prompt;
  dom.dialogFeedback.textContent = mission.completed
    ? "Esta lección ya fue completada. Puedes revisarla, pero no da recompensa otra vez."
    : "Elige la mejor respuesta.";

  dom.dialogOptions.innerHTML = "";

  if (mission.speak) {
    dom.speakBtn.classList.remove("hidden");
    dom.speakBtn.onclick = () => speakMissionWord(mission.speak);
  } else {
    dom.speakBtn.classList.add("hidden");
    dom.speakBtn.onclick = null;
  }

  if (mission.completed) {
    const closeButton = document.createElement("button");
    closeButton.className = "option-btn";
    closeButton.textContent = "Cerrar";
    closeButton.onclick = closeDialog;
    dom.dialogOptions.appendChild(closeButton);
    return;
  }

  mission.options.forEach((option) => {
    const button = document.createElement("button");
    button.className = "option-btn";
    button.textContent = option;

    button.onclick = () => {
      if (option === mission.answer) {
        dom.dialogFeedback.textContent = "Correcto.";
        button.classList.add("correct");
        lockDialogButtons(true);

        setTimeout(() => {
          completeMission(mission);
          closeDialog();
        }, 650);
      } else {
        dom.dialogFeedback.textContent = "Casi. Prueba otra opción.";
        button.classList.add("wrong");

        setTimeout(() => {
          button.classList.remove("wrong");
        }, 350);
      }
    };

    dom.dialogOptions.appendChild(button);
  });
}

function lockDialogButtons(locked) {
  const buttons = dom.dialogOptions.querySelectorAll("button");
  buttons.forEach((button) => {
    button.disabled = locked;
  });
}

function completeMission(mission) {
  if (state.completedQuests.has(mission.id)) {
    showToast("Esta misión ya estaba completada.");
    return;
  }

  state.completedQuests.add(mission.id);
  mission.completed = true;

  const node = missionNodes.get(mission.id);
  if (node) {
    node.classList.add("completed");
    const badge = node.querySelector(".avatar-badge");
    if (badge) badge.textContent = "✓";
  }

  addItem(mission.reward.item);
  state.xp += mission.reward.xp;

  let leveledUp = false;
  while (state.xp >= xpToNextLevel()) {
    state.level += 1;
    leveledUp = true;
  }

  if (leveledUp) {
    showToast(`Correcto. +${mission.reward.xp} XP · ${mission.reward.item} · Nivel ${state.level}`);
  } else {
    showToast(`Correcto. +${mission.reward.xp} XP · ${mission.reward.item}`);
  }

  updateHUD();
  updateQuestList();
  renderInventory();
  saveGame(true);

  if (state.completedQuests.size === missions.length) {
    showVictory();
  }
}

function showVictory() {
  if (victoryShown) return;
  victoryShown = true;
  state.mode = "victory";

  dom.victoryText.textContent = `Has completado ${missions.length} misiones, conseguido ${state.inventory.length} objetos y alcanzado nivel ${state.level}.`;
  dom.victoryOverlay.classList.remove("hidden");
  updateHintBox();
}

function hideVictory() {
  dom.victoryOverlay.classList.add("hidden");
  if (victoryShown) {
    state.mode = "play";
    updateHintBox();
  }
}

function resetGame() {
  if (!confirm("¿Seguro que quieres reiniciar todo el progreso?")) return;
  localStorage.removeItem(STORAGE_KEY);
  location.reload();
}

function currentMoveVector() {
  let vx = 0;
  let vy = 0;

  if (input.left) vx -= 1;
  if (input.right) vx += 1;
  if (input.up) vy -= 1;
  if (input.down) vy += 1;

  if (vx === 0 && vy === 0) return { vx: 0, vy: 0 };

  const length = Math.hypot(vx, vy);
  return {
    vx: vx / length,
    vy: vy / length
  };
}

function handleInteract() {
  if (state.mode !== "play") return;
  if (!nearbyMission) return;
  openDialog(nearbyMission);
}

function handleKeyDown(event) {
  const key = event.key.toLowerCase();

  if (key === "escape") {
    if (state.mode === "dialog") {
      closeDialog();
    } else if (state.mode === "inventory") {
      closeInventory();
    }
    return;
  }

  if (key === "e") {
    if (event.repeat) return;
    handleInteract();
    return;
  }

  if (key === "i") {
    if (event.repeat) return;
    if (state.mode === "inventory") {
      closeInventory();
    } else {
      openInventory();
    }
    return;
  }

  if (key === "w" || key === "arrowup") input.up = true;
  if (key === "s" || key === "arrowdown") input.down = true;
  if (key === "a" || key === "arrowleft") input.left = true;
  if (key === "d" || key === "arrowright") input.right = true;
}

function handleKeyUp(event) {
  const key = event.key.toLowerCase();

  if (key === "w" || key === "arrowup") input.up = false;
  if (key === "s" || key === "arrowdown") input.down = false;
  if (key === "a" || key === "arrowleft") input.left = false;
  if (key === "d" || key === "arrowright") input.right = false;
}

function clearInput() {
  input.up = false;
  input.down = false;
  input.left = false;
  input.right = false;
}

function gameLoop(timestamp) {
  if (!lastTime) lastTime = timestamp;
  const delta = Math.min(32, timestamp - lastTime);
  lastTime = timestamp;

  if (state.mode === "play") {
    const move = currentMoveVector();
    const speed = 4.6 * (delta / 16.6667);

    if (move.vx !== 0 || move.vy !== 0) {
      movePlayer(move.vx * speed, move.vy * speed);
    }
  }

  updatePlayerNode();
  updateCamera();
  updateNearbyMission();
  updateHintBox();
  updateHUD();

  requestAnimationFrame(gameLoop);
}

function bootstrap() {
  loadGame();
  syncAllMissionVisuals();
  buildWorld();
  updatePlayerNode();
  updateCamera();
  updateNearbyMission();
  updateHintBox();
  updateHUD();
  renderInventory();
  requestAnimationFrame(gameLoop);
}

document.addEventListener("keydown", handleKeyDown);
document.addEventListener("keyup", handleKeyUp);
window.addEventListener("blur", clearInput);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) clearInput();
});
window.addEventListener("resize", updateCamera);

dom.inventoryBtn.addEventListener("click", () => {
  if (state.mode === "inventory") {
    closeInventory();
  } else if (state.mode === "play") {
    openInventory();
  }
});

dom.closeInventoryBtn.addEventListener("click", closeInventory);
dom.saveBtn.addEventListener("click", () => saveGame(false));
dom.resetBtn.addEventListener("click", resetGame);

dom.closeDialogBtn.addEventListener("click", closeDialog);
dom.interactBtn.addEventListener("click", handleInteract);

dom.restartBtn.addEventListener("click", () => {
  localStorage.removeItem(STORAGE_KEY);
  location.reload();
});

dom.closeVictoryBtn.addEventListener("click", hideVictory);

dom.mobileButtons.forEach((button) => {
  const direction = button.dataset.dir;

  const start = (event) => {
    event.preventDefault();
    if (direction === "up") input.up = true;
    if (direction === "down") input.down = true;
    if (direction === "left") input.left = true;
    if (direction === "right") input.right = true;
  };

  const end = (event) => {
    event.preventDefault();
    if (direction === "up") input.up = false;
    if (direction === "down") input.down = false;
    if (direction === "left") input.left = false;
    if (direction === "right") input.right = false;
  };

  button.addEventListener("pointerdown", start);
  button.addEventListener("pointerup", end);
  button.addEventListener("pointerleave", end);
  button.addEventListener("pointercancel", end);
});

window.addEventListener("beforeunload", () => {
  saveGame(true);
});

bootstrap();