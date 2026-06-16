const STORAGE_KEY = "pandu-time-logger:v1";
const LOCK_KEY = "pandu-time-logger-lock:v1";

const app = document.querySelector("#app");
const lockScreen = document.querySelector("#lock-screen");
const lockForm = document.querySelector("#lock-form");
const accessCodeInput = document.querySelector("#access-code");
const confirmCodeInput = document.querySelector("#confirm-code");
const confirmCodeLabel = document.querySelector("#confirm-code-label");
const lockCopy = document.querySelector("#lock-copy");
const lockMessage = document.querySelector("#lock-message");
const unlockButton = document.querySelector("#unlock-btn");
const form = document.querySelector("#entry-form");
const dateInput = document.querySelector("#date");
const hoursInput = document.querySelector("#hours");
const weightInput = document.querySelector("#weight");
const entriesBody = document.querySelector("#entries");
const chart = document.querySelector("#chart");
const emptyState = document.querySelector("#empty-state");
const exportButton = document.querySelector("#export-btn");
const importFile = document.querySelector("#import-file");
const clearButton = document.querySelector("#clear-btn");
const lockButton = document.querySelector("#lock-btn");
const ctx = chart.getContext("2d");

let entries = loadEntries();
let lockConfig = loadLockConfig();

dateInput.value = new Date().toISOString().slice(0, 10);
setupLockScreen();

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const date = dateInput.value;
  const hours = parseOptionalNumber(hoursInput.value);
  const weight = parseOptionalNumber(weightInput.value);

  if (!date || (hours === null && weight === null)) {
    return;
  }

  entries = [
    ...entries.filter((entry) => entry.date !== date),
    { date, hours, weight },
  ].sort(byDate);

  saveEntries();
  hoursInput.value = "";
  weightInput.value = "";
  render();
});

entriesBody.addEventListener("click", (event) => {
  const button = event.target.closest("[data-delete]");
  if (!button) return;

  entries = entries.filter((entry) => entry.date !== button.dataset.delete);
  saveEntries();
  render();
});

exportButton.addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(entries, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `time-logger-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
});

importFile.addEventListener("change", async () => {
  const [file] = importFile.files;
  if (!file) return;

  try {
    const imported = JSON.parse(await file.text());
    if (!Array.isArray(imported)) throw new Error("Invalid data");

    entries = imported
      .map(normalizeEntry)
      .filter(Boolean)
      .sort(byDate);

    saveEntries();
    render();
  } catch {
    alert("That file does not look like a Time Logger export.");
  } finally {
    importFile.value = "";
  }
});

clearButton.addEventListener("click", () => {
  if (!entries.length) return;
  if (!confirm("Clear all saved entries from this browser?")) return;

  entries = [];
  saveEntries();
  render();
});

lockButton.addEventListener("click", () => {
  app.hidden = true;
  lockScreen.hidden = false;
  accessCodeInput.value = "";
  confirmCodeInput.value = "";
  lockMessage.textContent = "";
  accessCodeInput.focus();
});

lockForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  lockMessage.textContent = "";

  if (!globalThis.crypto?.subtle) {
    lockMessage.textContent = "Open this app over HTTPS or localhost to use the lock.";
    return;
  }

  const code = accessCodeInput.value;
  if (!code) {
    lockMessage.textContent = "Enter your access code.";
    return;
  }

  if (code.length < 4) {
    lockMessage.textContent = "Use at least 4 characters.";
    return;
  }

  if (!lockConfig) {
    if (!confirmCodeInput.value) {
      lockMessage.textContent = "Type the same code in both boxes.";
      return;
    }

    if (code !== confirmCodeInput.value) {
      lockMessage.textContent = "The codes do not match.";
      return;
    }

    lockConfig = await createLockConfig(code);
    localStorage.setItem(LOCK_KEY, JSON.stringify(lockConfig));
    unlockApp();
    return;
  }

  if (await verifyCode(code, lockConfig)) {
    unlockApp();
  } else {
    lockMessage.textContent = "Incorrect code.";
  }
});

window.addEventListener("resize", drawChart);

function setupLockScreen() {
  if (lockConfig) {
    lockCopy.textContent = "Enter your code to unlock this browser.";
    confirmCodeLabel.hidden = true;
    confirmCodeInput.required = false;
    unlockButton.textContent = "Unlock";
  } else {
    lockCopy.textContent = "Type the same code twice to set it for this browser.";
    confirmCodeLabel.hidden = false;
    confirmCodeInput.required = true;
    unlockButton.textContent = "Set code";
  }

  lockScreen.hidden = false;
  app.hidden = true;
  accessCodeInput.focus();
}

function unlockApp() {
  lockScreen.hidden = true;
  app.hidden = false;
  accessCodeInput.value = "";
  confirmCodeInput.value = "";
  render();
}

function loadEntries() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(saved)
      ? saved.map(normalizeEntry).filter(Boolean).sort(byDate)
      : [];
  } catch {
    return [];
  }
}

function saveEntries() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

function loadLockConfig() {
  try {
    const config = JSON.parse(localStorage.getItem(LOCK_KEY) || "null");
    if (!config || !config.salt || !config.hash) return null;
    return config;
  } catch {
    return null;
  }
}

async function createLockConfig(code) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return {
    salt: bytesToBase64(salt),
    hash: await hashCode(code, salt),
  };
}

async function verifyCode(code, config) {
  const salt = base64ToBytes(config.salt);
  const hash = await hashCode(code, salt);
  return hash === config.hash;
}

async function hashCode(code, salt) {
  const encodedCode = new TextEncoder().encode(code);
  const input = new Uint8Array(salt.length + encodedCode.length);
  input.set(salt);
  input.set(encodedCode, salt.length);
  const digest = await crypto.subtle.digest("SHA-256", input);
  return bytesToBase64(new Uint8Array(digest));
}

function bytesToBase64(bytes) {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function base64ToBytes(base64) {
  const binary = atob(base64);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function normalizeEntry(entry) {
  if (!entry || !/^\d{4}-\d{2}-\d{2}$/.test(entry.date)) return null;

  return {
    date: entry.date,
    hours: toNullableNumber(entry.hours),
    weight: toNullableNumber(entry.weight),
  };
}

function parseOptionalNumber(value) {
  if (value.trim() === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function toNullableNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function byDate(a, b) {
  return a.date.localeCompare(b.date);
}

function render() {
  renderTable();
  drawChart();
}

function renderTable() {
  if (!entries.length) {
    entriesBody.innerHTML = `<tr><td colspan="4">No entries yet.</td></tr>`;
    return;
  }

  entriesBody.innerHTML = entries
    .map(
      (entry) => `
        <tr>
          <td>${formatDate(entry.date)}</td>
          <td>${formatNumber(entry.hours)}</td>
          <td>${formatNumber(entry.weight)}</td>
          <td><button class="delete-btn" type="button" data-delete="${entry.date}">Delete</button></td>
        </tr>
      `,
    )
    .join("");
}

function drawChart() {
  const ratio = window.devicePixelRatio || 1;
  const box = chart.getBoundingClientRect();
  chart.width = Math.max(700, Math.round(box.width * ratio));
  chart.height = Math.max(360, Math.round(box.height * ratio));
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

  const width = chart.width / ratio;
  const height = chart.height / ratio;
  ctx.clearRect(0, 0, width, height);

  const hoursSeries = entries.filter((entry) => entry.hours !== null);
  const weightSeries = entries.filter((entry) => entry.weight !== null);
  const hasData = hoursSeries.length || weightSeries.length;
  emptyState.hidden = hasData;

  drawGrid(width, height);
  if (!hasData) return;

  const plot = {
    left: 68,
    right: width - 72,
    top: 32,
    bottom: height - 58,
  };
  const dates = entries.map((entry) => new Date(`${entry.date}T00:00:00`).getTime());
  const minDate = Math.min(...dates);
  const maxDate = Math.max(...dates);
  const hoursScale = makeScale(hoursSeries.map((entry) => entry.hours), 0, 24);
  const weightScale = makeScale(weightSeries.map((entry) => entry.weight));

  drawAxis(plot, width, height, hoursScale, weightScale, minDate, maxDate);
  drawLine(hoursSeries, "hours", plot, minDate, maxDate, hoursScale, "#1b7f79");
  drawLine(weightSeries, "weight", plot, minDate, maxDate, weightScale, "#c75146");
}

function drawGrid(width, height) {
  const plot = {
    left: 68,
    right: width - 72,
    top: 32,
    bottom: height - 58,
  };

  ctx.strokeStyle = "#e5e9e6";
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let index = 0; index <= 4; index += 1) {
    const y = plot.top + ((plot.bottom - plot.top) * index) / 4;
    ctx.moveTo(plot.left, y);
    ctx.lineTo(plot.right, y);
  }
  ctx.stroke();
}

function drawAxis(plot, width, height, hoursScale, weightScale, minDate, maxDate) {
  ctx.fillStyle = "#637071";
  ctx.font = "700 12px system-ui, sans-serif";
  ctx.textBaseline = "middle";

  for (let index = 0; index <= 4; index += 1) {
    const t = index / 4;
    const y = plot.bottom - (plot.bottom - plot.top) * t;
    ctx.textAlign = "right";
    ctx.fillText(interpolate(hoursScale.min, hoursScale.max, t).toFixed(1), plot.left - 10, y);
    ctx.textAlign = "left";
    ctx.fillText(interpolate(weightScale.min, weightScale.max, t).toFixed(1), plot.right + 10, y);
  }

  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";
  ctx.fillStyle = "#1b7f79";
  ctx.fillText("hours", 8, 18);
  ctx.fillStyle = "#c75146";
  ctx.textAlign = "right";
  ctx.fillText("kg", width - 10, 18);

  const dateLabels = makeDateLabels(minDate, maxDate);
  ctx.fillStyle = "#637071";
  ctx.textBaseline = "top";
  dateLabels.forEach((date) => {
    const x = xForDate(date.getTime(), plot, minDate, maxDate);
    ctx.textAlign = x < width / 2 ? "left" : "right";
    ctx.fillText(shortDate(date), x, height - 38);
  });
}

function drawLine(series, key, plot, minDate, maxDate, scale, color) {
  if (!series.length) return;

  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 3;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.beginPath();

  series.forEach((entry, index) => {
    const date = new Date(`${entry.date}T00:00:00`).getTime();
    const x = xForDate(date, plot, minDate, maxDate);
    const y = yForValue(entry[key], plot, scale);
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  series.forEach((entry) => {
    const date = new Date(`${entry.date}T00:00:00`).getTime();
    const x = xForDate(date, plot, minDate, maxDate);
    const y = yForValue(entry[key], plot, scale);
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
  });
}

function makeScale(values, floor, ceiling) {
  const clean = values.filter((value) => value !== null);
  if (!clean.length) return { min: floor ?? 0, max: ceiling ?? 1 };

  let min = Math.min(...clean);
  let max = Math.max(...clean);
  const spread = max - min || Math.max(Math.abs(max) * 0.1, 1);
  min -= spread * 0.18;
  max += spread * 0.18;

  if (floor !== undefined) min = Math.max(floor, min);
  if (ceiling !== undefined) max = Math.min(ceiling, max);
  if (min === max) max = min + 1;
  return { min, max };
}

function xForDate(date, plot, minDate, maxDate) {
  if (minDate === maxDate) return (plot.left + plot.right) / 2;
  return plot.left + ((date - minDate) / (maxDate - minDate)) * (plot.right - plot.left);
}

function yForValue(value, plot, scale) {
  return plot.bottom - ((value - scale.min) / (scale.max - scale.min)) * (plot.bottom - plot.top);
}

function interpolate(min, max, t) {
  return min + (max - min) * t;
}

function makeDateLabels(minDate, maxDate) {
  if (minDate === maxDate) return [new Date(minDate)];
  return [new Date(minDate), new Date(maxDate)];
}

function formatDate(date) {
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(`${date}T00:00:00`));
}

function shortDate(date) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(date);
}

function formatNumber(value) {
  return value === null ? "-" : Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 });
}
