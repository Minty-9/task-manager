const form = document.getElementById("taskForm");
const taskList = document.getElementById("taskList");
const filterButtons = document.querySelectorAll(".filters button");
const totalTasksEl = document.getElementById("totalTasks");
const pendingTasksEl = document.getElementById("pendingTasks");
const completedTasksEl = document.getElementById("completedTasks");

let tasks = JSON.parse(localStorage.getItem("tasks")) || [];

Notification.requestPermission();

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const title = document.getElementById("taskTitle").value.trim();
  const priority = document.getElementById("taskPriority").value;
  const due = document.getElementById("taskDue").value;

  if (!title || !due) return;

  const task = {
    id: Date.now(),
    title,
    priority,
    due,
    completed: false,
    lastNotified: null,
  };

  tasks.push(task);
  saveTasks();
  form.reset();
  renderTasks();
});

function renderTasks(filter = "all") {
  // Clear previous tasks
taskList.innerHTML = "";

// Reverse order: newest first
const filtered = [...tasks].reverse().filter(t => {
  if (filter === "pending") return !t.completed;
  if (filter === "completed") return t.completed;
  return true;
});

filtered.forEach((task) => {
  const li = document.createElement("li");
  li.classList.add(`priority-${task.priority}`);
  if (task.completed) li.classList.add("completed");

  li.innerHTML = `
    <div class="top-row">
      <input type="checkbox" ${task.completed ? "checked" : ""} onchange="toggleComplete(${task.id})">
      <span class="title">${task.title}</span>
      <button onclick="editTask(${task.id})">✏️</button>
      <button onclick="deleteTask(${task.id})">🗑️</button>
    </div>
    <div class="labels">
      <span class="label-priority-${task.priority}">Priority: ${task.priority}</span>
      <span>Due: ${new Date(task.due).toLocaleString()}</span>
    </div>
  `;

  taskList.appendChild(li);
});


  updateDashboard();
}

function saveTasks() {
  localStorage.setItem("tasks", JSON.stringify(tasks));
}

function toggleComplete(id) {
  tasks = tasks.map(t => t.id === id ? {...t, completed: !t.completed} : t);
  saveTasks();
  renderTasks();
}

function editTask(id) {
  const t = tasks.find(task => task.id === id);
  const newTitle = prompt("Edit task:", t.title);
  if (newTitle) {
    t.title = newTitle.trim();
    saveTasks();
    renderTasks();
  }
}

function deleteTask(id) {
  tasks = tasks.filter(t => t.id !== id);
  saveTasks();
  renderTasks();
}

filterButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelector(".filters button.active").classList.remove("active");
    btn.classList.add("active");
    renderTasks(btn.dataset.filter);
  });
});

function updateDashboard() {
  const total = tasks.length;
  const pending = tasks.filter(t => !t.completed).length;
  const completed = tasks.filter(t => t.completed).length;

  animateCounter(totalTasksEl, total);
  animateCounter(pendingTasksEl, pending);
  animateCounter(completedTasksEl, completed);
}

function animateCounter(element, value) {
  element.textContent = element.id === "totalTasks" ? `Total: ${value}` :
                        element.id === "pendingTasks" ? `Pending: ${value}` :
                        `Completed: ${value}`;

  element.classList.remove("pop");       // reset animation
  void element.offsetWidth;             // trigger reflow
  element.classList.add("pop");         // start animation
}


renderTasks();

// ---------------- Notifications ---------------- //

function checkTasks() {
  const now = new Date();

  tasks.forEach(task => {
    if (task.completed) return;
    const due = new Date(task.due);
    const timeDiff = (due - now) / (1000 * 60 * 60); // hours

    const freq = getNotifyFrequency(task.priority);
    const last = task.lastNotified ? new Date(task.lastNotified) : null;
    const hoursSinceLast = last ? (now - last) / (1000 * 60 * 60) : Infinity;

    if (timeDiff <= 24 && hoursSinceLast >= freq) {
      showNotification(task);
      task.lastNotified = now.toISOString();
      saveTasks();
    }
  });
}

function getNotifyFrequency(priority) {
  switch (priority) {
    case "high": return 8; // every 8h
    case "medium": return 24; // daily
    case "low": return 72; // every 3 days
  }
}

function showNotification(task) {
  if (Notification.permission === "granted") {
    new Notification("Minty Task Reminder", {
      body: `${task.title} (${task.priority.toUpperCase()})`,
      icon: "https://cdn-icons-png.flaticon.com/512/3039/3039396.png"
    });
  }
}

setInterval(checkTasks, 60 * 60 * 1000); // check hourly
