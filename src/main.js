const STORAGE_KEY = "classroom-name-wheel:v1";
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
const winner = document.querySelector("#winner");
const spinButton = document.querySelector("#spinButton");
const resetButton = document.querySelector("#resetButton");
const addNameForm = document.querySelector("#addNameForm");
const nameInput = document.querySelector("#nameInput");
const bulkNames = document.querySelector("#bulkNames");
const bulkAddButton = document.querySelector("#bulkAddButton");
const allOnButton = document.querySelector("#allOnButton");
const allOffButton = document.querySelector("#allOffButton");
const sampleButton = document.querySelector("#sampleButton");
const clearButton = document.querySelector("#clearButton");

let names = loadNames();
let rotation = 0;
let spinning = false;

function createId() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function loadNames() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (Array.isArray(stored)) {
      return stored.filter((item) => item && typeof item.name === "string");
    }
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }

  return DEFAULT_NAMES.map((name) => ({ id: createId(), name, active: true }));
}

function saveNames() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(names));
}

function getActiveNames() {
  return names.filter((item) => item.active);
}

function normalizeName(value) {
  return value.trim().replace(/\s+/g, " ");
}

function addNames(values) {
  const existing = new Set(names.map((item) => item.name.toLowerCase()));
  const freshNames = values
    .map(normalizeName)
    .filter(Boolean)
    .filter((name) => {
      const key = name.toLowerCase();
      if (existing.has(key)) return false;
      existing.add(key);
      return true;
    });

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
  winner.textContent = "Round and round...";

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

    rotation = (startRotation + finalRotation) % (Math.PI * 2);
    spinning = false;
    winner.textContent = `${activeNames[selectedIndex].name} was picked!`;
    renderList();
  }

  requestAnimationFrame(animate);
}

addNameForm.addEventListener("submit", (event) => {
  event.preventDefault();
  addNames([nameInput.value]);
  nameInput.value = "";
  nameInput.focus();
});

bulkAddButton.addEventListener("click", () => {
  const pastedNames = bulkNames.value.split(/[\n,]+/);
  addNames(pastedNames);
  bulkNames.value = "";
});

spinButton.addEventListener("click", spinWheel);

resetButton.addEventListener("click", () => {
  rotation = 0;
  winner.textContent = "Ready for the next spin.";
  drawWheel();
});

allOnButton.addEventListener("click", () => {
  names = names.map((item) => ({ ...item, active: true }));
  saveAndRender();
});

allOffButton.addEventListener("click", () => {
  names = names.map((item) => ({ ...item, active: false }));
  saveAndRender();
});

sampleButton.addEventListener("click", () => {
  names = DEFAULT_NAMES.map((name) => ({ id: createId(), name, active: true }));
  winner.textContent = "Sample roster loaded.";
  saveAndRender();
});

clearButton.addEventListener("click", () => {
  names = [];
  winner.textContent = "The wheel is clear.";
  saveAndRender();
});

window.addEventListener("resize", drawWheel);

function normalizeRotation(value) {
  return ((value % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
}

renderList();
drawWheel();
