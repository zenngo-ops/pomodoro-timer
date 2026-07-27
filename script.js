const MODES = {
  work: { label: "作業", duration: 25 * 60, color: "#e85d5d" },
  short: { label: "短い休憩", duration: 5 * 60, color: "#4caf9e" },
  long: { label: "長い休憩", duration: 15 * 60, color: "#5b8def" },
};

const CIRCUMFERENCE = 2 * Math.PI * 90;

const timeDisplay = document.getElementById("timeDisplay");
const ringProgress = document.querySelector(".ring-progress");
const startBtn = document.getElementById("startBtn");
const resetBtn = document.getElementById("resetBtn");
const cycleCountEl = document.getElementById("cycleCount");
const modeButtons = document.querySelectorAll(".mode-btn");
const alarmSound = document.getElementById("alarmSound");
const settingsBtn = document.getElementById("settingsBtn");
const settingsPanel = document.getElementById("settingsPanel");
const saveSettingsBtn = document.getElementById("saveSettingsBtn");
const workInput = document.getElementById("workInput");
const shortInput = document.getElementById("shortInput");
const longInput = document.getElementById("longInput");

const SETTINGS_KEY = "pomodoro-durations";

function loadDurations() {
  try {
    const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY));
    if (saved && saved.work > 0 && saved.short > 0 && saved.long > 0) return saved;
  } catch {
    // 保存データが壊れている場合はデフォルト値を使う
  }
  return { work: 25, short: 5, long: 15 };
}

function applyDurations(minutes) {
  MODES.work.duration = minutes.work * 60;
  MODES.short.duration = minutes.short * 60;
  MODES.long.duration = minutes.long * 60;
}

applyDurations(loadDurations());

let currentMode = "work";
let secondsLeft = MODES[currentMode].duration;
let timerId = null;
let isRunning = false;

const todayKey = () => `pomodoro-${new Date().toISOString().slice(0, 10)}`;

function loadCycleCount() {
  return Number(localStorage.getItem(todayKey() + "-cycles") || 0);
}

function saveCycleCount(count) {
  localStorage.setItem(todayKey() + "-cycles", String(count));
}

function formatTime(totalSeconds) {
  const m = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
  const s = Math.floor(totalSeconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function updateDisplay() {
  timeDisplay.textContent = formatTime(secondsLeft);
  const total = MODES[currentMode].duration;
  const fraction = secondsLeft / total;
  ringProgress.style.strokeDashoffset = String(CIRCUMFERENCE * (1 - fraction));
  document.documentElement.style.setProperty("--accent", MODES[currentMode].color);
}

function setMode(mode) {
  currentMode = mode;
  isRunning = false;
  clearInterval(timerId);
  secondsLeft = MODES[mode].duration;
  startBtn.textContent = "開始";
  modeButtons.forEach((btn) => btn.classList.toggle("active", btn.dataset.mode === mode));
  updateDisplay();
}

function requestNotificationPermission() {
  if (typeof Notification !== "undefined" && Notification.permission === "default") {
    Notification.requestPermission();
  }
}

function showNotification(finishedMode, nextMode) {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
  new Notification(`${MODES[finishedMode].label}終了！`, {
    body: `次は${MODES[nextMode].label}です`,
  });
}

function tick() {
  if (secondsLeft <= 0) {
    clearInterval(timerId);
    isRunning = false;
    startBtn.textContent = "開始";
    alarmSound.play().catch(() => {});
    const finishedMode = currentMode;
    if (currentMode === "work") {
      const newCount = loadCycleCount() + 1;
      saveCycleCount(newCount);
      cycleCountEl.textContent = String(newCount);
      const nextMode = newCount % 4 === 0 ? "long" : "short";
      showNotification(finishedMode, nextMode);
      setMode(nextMode);
    } else {
      showNotification(finishedMode, "work");
      setMode("work");
    }
    return;
  }
  secondsLeft -= 1;
  updateDisplay();
}

function toggleTimer() {
  if (isRunning) {
    clearInterval(timerId);
    isRunning = false;
    startBtn.textContent = "開始";
  } else {
    requestNotificationPermission();
    isRunning = true;
    startBtn.textContent = "一時停止";
    timerId = setInterval(tick, 1000);
  }
}

modeButtons.forEach((btn) => {
  btn.addEventListener("click", () => setMode(btn.dataset.mode));
});

settingsBtn.addEventListener("click", () => {
  const durations = loadDurations();
  workInput.value = durations.work;
  shortInput.value = durations.short;
  longInput.value = durations.long;
  settingsPanel.hidden = !settingsPanel.hidden;
});

saveSettingsBtn.addEventListener("click", () => {
  const durations = {
    work: Number(workInput.value),
    short: Number(shortInput.value),
    long: Number(longInput.value),
  };
  const invalidLabels = Object.entries(durations)
    .filter(([, value]) => !(value > 0))
    .map(([mode]) => MODES[mode].label);
  if (invalidLabels.length > 0) {
    alert(`${invalidLabels.join("、")}に1分以上の値を入力してください`);
    return;
  }
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(durations));
  applyDurations(durations);
  settingsPanel.hidden = true;
  setMode(currentMode);
});

startBtn.addEventListener("click", toggleTimer);

resetBtn.addEventListener("click", () => {
  isRunning = false;
  clearInterval(timerId);
  secondsLeft = MODES[currentMode].duration;
  startBtn.textContent = "開始";
  updateDisplay();
});

cycleCountEl.textContent = String(loadCycleCount());
updateDisplay();

// --- タスク管理 ---

const taskForm = document.getElementById("taskForm");
const taskInput = document.getElementById("taskInput");
const taskList = document.getElementById("taskList");
const doneCountEl = document.getElementById("doneCount");
const totalCountEl = document.getElementById("totalCount");
const clearDoneBtn = document.getElementById("clearDoneBtn");

function tasksKey() {
  return todayKey() + "-tasks";
}

function loadTasks() {
  try {
    return JSON.parse(localStorage.getItem(tasksKey()) || "[]");
  } catch {
    return [];
  }
}

function saveTasks(tasks) {
  localStorage.setItem(tasksKey(), JSON.stringify(tasks));
}

function renderTasks() {
  const tasks = loadTasks();
  taskList.innerHTML = "";
  tasks.forEach((task) => {
    const li = document.createElement("li");
    li.className = task.done ? "done" : "";
    li.innerHTML = `
      <input type="checkbox" ${task.done ? "checked" : ""} data-id="${task.id}" />
      <span class="task-text"></span>
      <button class="del-btn" data-id="${task.id}" aria-label="削除">✕</button>
    `;
    li.querySelector(".task-text").textContent = task.text;
    taskList.appendChild(li);
  });
  doneCountEl.textContent = String(tasks.filter((t) => t.done).length);
  totalCountEl.textContent = String(tasks.length);
}

taskForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = taskInput.value.trim();
  if (!text) return;
  const tasks = loadTasks();
  tasks.push({ id: Date.now(), text, done: false });
  saveTasks(tasks);
  taskInput.value = "";
  renderTasks();
});

taskList.addEventListener("click", (e) => {
  const target = e.target;
  if (target.matches("input[type='checkbox']")) {
    const id = Number(target.dataset.id);
    const tasks = loadTasks().map((t) => (t.id === id ? { ...t, done: target.checked } : t));
    saveTasks(tasks);
    renderTasks();
  } else if (target.matches(".del-btn")) {
    const id = Number(target.dataset.id);
    const tasks = loadTasks().filter((t) => t.id !== id);
    saveTasks(tasks);
    renderTasks();
  }
});

clearDoneBtn.addEventListener("click", () => {
  const tasks = loadTasks().filter((t) => !t.done);
  saveTasks(tasks);
  renderTasks();
});

renderTasks();
