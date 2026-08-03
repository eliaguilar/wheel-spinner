const STORAGE_KEY = "classroom-name-wheel:v1";
const MAX_NAMES = 80;
const MAX_NAME_LENGTH = 32;
const MAX_INPUT_LENGTH = 1600;
const MAX_IMPORT_BYTES = 64 * 1024;
const DEFAULT_NAMES = [
  "Ava",
  "Noah",
  "Mia",
  "Liam",
  "Sofia",
  "Ethan",
  "Zoe",
  "Mateo"
];

const palette = [
  "#ff6b6b",
  "#ffd166",
  "#4ecdc4",
  "#7bd88f",
  "#5aa9e6",
  "#c084fc",
  "#ff9f1c",
  "#f472b6",
  "#9ad7ff",
  "#b8f2e6"
];

const canvas = document.querySelector("#wheel");
const ctx = canvas.getContext("2d");
const nameList = document.querySelector("#nameList");
const activeCount = document.querySelector("#activeCount");
const spinButton = document.querySelector("#spinButton");
const addNamesForm = document.querySelector("#addNamesForm");
const namesInput = document.querySelector("#namesInput");
const allOnButton = document.querySelector("#allOnButton");
const allOffButton = document.querySelector("#allOffButton");
const clearButton = document.querySelector("#clearButton");
const exportRosterButton = document.querySelector("#exportRosterButton");
const importRosterInput = document.querySelector("#importRosterInput");
const openAdminButton = document.querySelector("#openAdminButton");
const closeAdminButton = document.querySelector("#closeAdminButton");
const teacherDrawer = document.querySelector("#teacherDrawer");
const drawerOverlay = document.querySelector("#drawerOverlay");
const winnerModal = document.querySelector("#winnerModal");
const winnerModalTitle = document.querySelector("#winnerModalTitle");
const closeWinnerModal = document.querySelector("#closeWinnerModal");
const confettiLayer = document.querySelector("#confettiLayer");

let names = loadNames();
let rotation = 0;
let spinning = false;
let pendingWinnerId = null;
let storageWarningShown = false;

function createId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function loadNames() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (Array.isArray(stored)) {
      const sanitized = sanitizeStoredNames(stored);
      return sanitized.length ? sanitized : getDefaultNames();
    }
  } catch {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Some privacy modes block localStorage entirely.
    }
  }

  return getDefaultNames();
}

function getDefaultNames() {
  return DEFAULT_NAMES.map((name) => ({ id: createId(), name, active: true }));
}

function sanitizeStoredNames(value) {
  const seenNames = new Set();

  return value
    .map((item) => ({
      id: typeof item?.id === "string" && item.id ? item.id : createId(),
      name: normalizeName(String(item?.name ?? "")),
      active: item?.active !== false
    }))
    .filter((item) => {
      if (!item.name) return false;

      const key = item.name.toLowerCase();
      if (seenNames.has(key)) return false;

      seenNames.add(key);
      return true;
    })
    .slice(0, MAX_NAMES);
}

function saveNames() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(names));
  } catch {
    if (storageWarningShown) return;

    storageWarningShown = true;
    window.alert("The roster could not be saved in this browser.");
  }
}

function getBackupPayload() {
  return {
    app: "fri-yay-spinner",
    version: 1,
    exportedAt: new Date().toISOString(),
    names: names.map(({ name, active }) => ({ name, active }))
  };
}

function getActiveNames() {
  return names.filter((item) => item.active);
}

function normalizeName(value) {
  return value.trim().replace(/\s+/g, " ").slice(0, MAX_NAME_LENGTH);
}

function addNames(values) {
  const existing = new Set(names.map((item) => item.name.toLowerCase()));
  const remainingSlots = Math.max(MAX_NAMES - names.length, 0);
  const freshNames = values
    .map(normalizeName)
    .filter(Boolean)
    .filter((name) => {
      const key = name.toLowerCase();
      if (existing.has(key)) return false;
      existing.add(key);
      return true;
    })
    .slice(0, remainingSlots);

  if (!freshNames.length) return;

  names = [
    ...names,
    ...freshNames.map((name) => ({
      id: createId(),
      name,
      active: true
    }))
  ];
  saveAndRender();
}

function saveAndRender() {
  saveNames();
  renderList();
  drawWheel();
}

function drawWheel() {
  const activeNames = getActiveNames();
  const size = canvas.width;
  const radius = size / 2;
  const center = radius;

  ctx.clearRect(0, 0, size, size);
  ctx.save();
  ctx.translate(center, center);
  ctx.rotate(rotation);

  if (!activeNames.length) {
    drawEmptyWheel(radius);
    ctx.restore();
    return;
  }

  const slice = (Math.PI * 2) / activeNames.length;
  activeNames.forEach((item, index) => {
    const start = index * slice;
    const end = start + slice;

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, radius - 12, start, end);
    ctx.closePath();
    ctx.fillStyle = palette[index % palette.length];
    ctx.fill();

    ctx.strokeStyle = "#fff8e8";
    ctx.lineWidth = 8;
    ctx.stroke();

    drawName(item.name, start + slice / 2, radius, activeNames.length);
  });

  ctx.beginPath();
  ctx.arc(0, 0, radius - 14, 0, Math.PI * 2);
  ctx.lineWidth = 12;
  ctx.strokeStyle = "#25314f";
  ctx.stroke();

  ctx.restore();
}

function drawEmptyWheel(radius) {
  ctx.beginPath();
  ctx.arc(0, 0, radius - 18, 0, Math.PI * 2);
  ctx.fillStyle = "#fff8e8";
  ctx.fill();
  ctx.lineWidth = 12;
  ctx.strokeStyle = "#25314f";
  ctx.stroke();

  ctx.fillStyle = "#25314f";
  ctx.font = "700 34px Fredoka, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("Switch on a name", 0, -12);
  ctx.font = "700 24px Nunito, sans-serif";
  ctx.fillText("to fill the wheel", 0, 28);
}

function drawName(name, angle, radius, total) {
  ctx.save();
  ctx.rotate(angle);
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#18233f";
  ctx.font = `${total > 12 ? 23 : 29}px Fredoka, sans-serif`;
  ctx.shadowColor = "rgba(255, 255, 255, 0.7)";
  ctx.shadowBlur = 3;

  const label = fitText(name, radius * 0.52);
  ctx.fillText(label, radius - 54, 0);
  ctx.restore();
}

function fitText(text, maxWidth) {
  if (ctx.measureText(text).width <= maxWidth) return text;

  let clipped = text;
  while (clipped.length > 4 && ctx.measureText(`${clipped}...`).width > maxWidth) {
    clipped = clipped.slice(0, -1);
  }
  return `${clipped.trim()}...`;
}

function renderList() {
  const activeTotal = getActiveNames().length;
  activeCount.textContent = `${activeTotal} active`;
  spinButton.disabled = activeTotal < 2 || spinning;

  nameList.replaceChildren(
    ...names.map((item) => {
      const row = document.createElement("li");
      row.className = "name-row";

      const label = document.createElement("label");
      label.className = "switch-row";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = item.active;
      checkbox.addEventListener("change", () => {
        item.active = checkbox.checked;
        saveAndRender();
      });

      const switchTrack = document.createElement("span");
      switchTrack.className = "switch";

      const name = document.createElement("span");
      name.className = "student-name";
      name.textContent = item.name;

      const removeButton = document.createElement("button");
      removeButton.className = "remove-button";
      removeButton.type = "button";
      removeButton.setAttribute("aria-label", `Remove ${item.name}`);
      removeButton.textContent = "×";
      removeButton.addEventListener("click", () => {
        names = names.filter((nameItem) => nameItem.id !== item.id);
        saveAndRender();
      });

      label.append(checkbox, switchTrack, name);
      row.append(label, removeButton);
      return row;
    })
  );
}

function spinWheel() {
  const activeNames = getActiveNames();
  if (activeNames.length < 2 || spinning) return;

  spinning = true;
  renderList();

  const selectedIndex = Math.floor(Math.random() * activeNames.length);
  const slice = (Math.PI * 2) / activeNames.length;
  const pointerAngle = -Math.PI / 2;
  const selectedCenter = selectedIndex * slice + slice / 2;
  const fullTurns = 6 + Math.floor(Math.random() * 4);
  const startRotation = rotation;
  const targetRotation = pointerAngle - selectedCenter;
  const finalRotation =
    fullTurns * Math.PI * 2 + targetRotation - normalizeRotation(startRotation);
  const start = performance.now();
  const duration = 4300;

  function animate(now) {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 4);
    rotation = startRotation + finalRotation * eased;
    drawWheel();

    if (progress < 1) {
      requestAnimationFrame(animate);
      return;
    }

    const selectedName = activeNames[selectedIndex];

    rotation = (startRotation + finalRotation) % (Math.PI * 2);
    pendingWinnerId = selectedName.id;
    spinning = false;
    renderList();
    drawWheel();
    showWinnerCelebration(selectedName.name);
  }

  requestAnimationFrame(animate);
}

addNamesForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const value = namesInput.value.slice(0, MAX_INPUT_LENGTH);
  if (!value.trim()) return;

  const previousCount = names.length;
  addNames(value.split(/[\n,]+/));
  if (names.length === previousCount) {
    window.alert("No new names were added. They may already be on the roster.");
    return;
  }

  namesInput.value = "";
  namesInput.focus();
});

spinButton.addEventListener("click", spinWheel);

allOnButton.addEventListener("click", () => {
  names = names.map((item) => ({ ...item, active: true }));
  saveAndRender();
});

allOffButton.addEventListener("click", () => {
  names = names.map((item) => ({ ...item, active: false }));
  saveAndRender();
});

clearButton.addEventListener("click", () => {
  const nameCount = names.length;
  if (!nameCount) return;

  const shouldClear = window.confirm(
    `Clear all ${nameCount} names from the roster? This cannot be undone.`
  );

  if (!shouldClear) return;

  names = [];
  pendingWinnerId = null;
  rotation = 0;
  saveAndRender();
});

exportRosterButton.addEventListener("click", () => {
  if (!names.length) {
    window.alert("There are no names to back up yet.");
    return;
  }

  const data = JSON.stringify(getBackupPayload(), null, 2);
  const blob = new Blob([data], { type: "application/json" });
  const link = document.createElement("a");
  const dateStamp = new Date().toISOString().slice(0, 10);

  link.href = URL.createObjectURL(blob);
  link.download = `fri-yay-roster-${dateStamp}.json`;
  link.click();
  URL.revokeObjectURL(link.href);
});

importRosterInput.addEventListener("change", async () => {
  const [file] = importRosterInput.files;
  importRosterInput.value = "";
  if (!file) return;

  if (file.size > MAX_IMPORT_BYTES) {
    window.alert("That backup file is too large.");
    return;
  }

  try {
    const imported = JSON.parse(await file.text());
    const importedNames = sanitizeStoredNames(imported.names);

    if (!importedNames.length) {
      window.alert("No roster names were found in that backup file.");
      return;
    }

    const shouldReplace = window.confirm(
      `Restore ${importedNames.length} names from this backup? This will replace the current roster.`
    );

    if (!shouldReplace) return;

    names = importedNames;
    pendingWinnerId = null;
    rotation = 0;
    saveAndRender();
  } catch {
    window.alert("That backup file could not be read.");
  }
});

openAdminButton.addEventListener("click", showTeacherDrawer);
closeAdminButton.addEventListener("click", hideTeacherDrawer);
drawerOverlay.addEventListener("click", hideTeacherDrawer);

closeWinnerModal.addEventListener("click", hideWinnerCelebration);

winnerModal.addEventListener("click", (event) => {
  if (event.target === winnerModal) hideWinnerCelebration();
});

window.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  hideWinnerCelebration();
  hideTeacherDrawer();
});

window.addEventListener("resize", drawWheel);

function showWinnerCelebration(name) {
  winnerModalTitle.textContent = name;
  winnerModal.classList.add("is-open");
  winnerModal.setAttribute("aria-hidden", "false");
  closeWinnerModal.focus();
  burstConfetti();
}

function hideWinnerCelebration() {
  winnerModal.classList.remove("is-open");
  winnerModal.setAttribute("aria-hidden", "true");
  confettiLayer.replaceChildren();

  if (!pendingWinnerId) return;

  names = names.map((item) =>
    item.id === pendingWinnerId ? { ...item, active: false } : item
  );
  pendingWinnerId = null;
  rotation = 0;
  saveAndRender();
}

function showTeacherDrawer() {
  teacherDrawer.classList.add("is-open");
  drawerOverlay.classList.add("is-open");
  teacherDrawer.setAttribute("aria-hidden", "false");
  drawerOverlay.setAttribute("aria-hidden", "false");
  openAdminButton.setAttribute("aria-expanded", "true");
  namesInput.focus();
}

function hideTeacherDrawer() {
  teacherDrawer.classList.remove("is-open");
  drawerOverlay.classList.remove("is-open");
  teacherDrawer.setAttribute("aria-hidden", "true");
  drawerOverlay.setAttribute("aria-hidden", "true");
  openAdminButton.setAttribute("aria-expanded", "false");
}

function burstConfetti() {
  confettiLayer.replaceChildren();

  const colors = ["#ff6b6b", "#ffd166", "#4ecdc4", "#7bd88f", "#5aa9e6", "#c084fc", "#f472b6"];
  const pieces = 92;

  for (let index = 0; index < pieces; index += 1) {
    const piece = document.createElement("span");
    const startX = 10 + Math.random() * 80;
    const drift = (Math.random() - 0.5) * 220;
    const duration = 2.1 + Math.random() * 1.5;
    const delay = Math.random() * 0.35;

    piece.className = "confetti-piece";
    piece.style.left = `${startX}%`;
    piece.style.setProperty("--confetti-color", colors[index % colors.length]);
    piece.style.setProperty("--confetti-drift", `${drift}px`);
    piece.style.setProperty("--confetti-spin", `${Math.random() * 720 - 360}deg`);
    piece.style.animationDuration = `${duration}s`;
    piece.style.animationDelay = `${delay}s`;
    confettiLayer.append(piece);
  }
}

function normalizeRotation(value) {
  return ((value % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
}

renderList();
drawWheel();
