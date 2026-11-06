let socket; // Initialize later after auth

// DOM Elements
const joinScreen = document.getElementById("join-screen");
const chatScreen = document.getElementById("chat-screen");
const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");
const loginBtn = document.getElementById("login-btn");
const registerBtn = document.getElementById("register-btn");
const authError = document.getElementById("auth-error");
const logoutBtn = document.getElementById("logout-btn");
const messagesEl = document.getElementById("messages");
const messageForm = document.getElementById("message-form");
const messageInput = document.getElementById("message-input");
const roomLabel = document.getElementById("room-label");
const userLabel = document.getElementById("user-label");
const userList = document.getElementById("user-list");
const userCount = document.getElementById("user-count");
const typingIndicator = document.getElementById("typing-indicator");
const roomListUI = document.querySelectorAll(".room");
const themeToggle = document.getElementById("theme-toggle");

let currentUser = "";
let currentRoom = "general";
let typingTimeout = null;

// --- Theme Toggle ---
const savedTheme = localStorage.getItem("theme") || "dark";
document.documentElement.setAttribute("data-theme", savedTheme);
themeToggle.textContent = savedTheme === "dark" ? "🌙" : "☀️";
themeToggle.addEventListener("click", () => {
  const newTheme = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", newTheme);
  localStorage.setItem("theme", newTheme);
  themeToggle.textContent = newTheme === "dark" ? "🌙" : "☀️";
});

// --- Authentication Logic ---
async function handleAuth(endpoint) {
  authError.textContent = "";
  const username = usernameInput.value.trim();
  const password = passwordInput.value;
  if (!username || !password) return authError.textContent = "Enter username and password";

  try {
    const res = await fetch(`/api/${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    
    if (!res.ok) throw new Error(data.error || "Auth failed");

    // Save token and login
    localStorage.setItem("chat_token", data.token);
    localStorage.setItem("chat_user", data.username);
    initChat(data.token, data.username);
    
  } catch (err) {
    authError.textContent = err.message;
  }
}

loginBtn.addEventListener("click", () => handleAuth("login"));
registerBtn.addEventListener("click", () => handleAuth("register"));
logoutBtn.addEventListener("click", () => {
  localStorage.removeItem("chat_token");
  localStorage.removeItem("chat_user");
  window.location.reload();
});

// --- Initialize Chat ---
function initChat(token, username) {
  currentUser = username;
  
  // Connect Socket with Token
  socket = io({ auth: { token } });

  joinScreen.classList.add("hidden");
  chatScreen.classList.remove("hidden");
  messageInput.focus();
  
  userLabel.textContent = "👤 " + username;
  
  // Auto join general room
  joinRoom(currentRoom);
  setupSocketListeners();
}

function joinRoom(room) {
  messagesEl.innerHTML = "";
  typingIndicator.textContent = "";
  
  socket.emit("stopTyping"); 
  socket.emit("joinRoom", { room });

  roomLabel.textContent = "#" + room;

  fetch(`/api/messages/${encodeURIComponent(room)}`)
    .then(res => res.json())
    .then(history => history.forEach(m => renderMessage(m, m.username === currentUser)));
}

// --- Socket Events ---
function setupSocketListeners() {
  socket.on("chatMessage", (msg) => {
    if (msg.room === currentRoom) {
      renderMessage(msg, msg.username === currentUser);
      if (msg.username !== currentUser) playPopSound();
    }
  });

  socket.on("system", (text) => {
    const div = document.createElement("div");
    div.className = "system";
    div.textContent = text;
    messagesEl.appendChild(div);
    scrollBottom();
  });

  socket.on("typing", (text) => typingIndicator.textContent = text);
  socket.on("roomUsers", (users) => {
    userCount.textContent = users.length;
    userList.innerHTML = "";
    users.forEach(u => {
      const li = document.createElement("li");
      const avatar = document.createElement("div");
      avatar.className = "avatar";
      avatar.style.width = "24px";
      avatar.style.height = "24px";
      avatar.style.fontSize = "0.7rem";
      avatar.style.background = getAvatarColor(u.username);
      avatar.textContent = u.username.charAt(0).toUpperCase();

      const nameSpan = document.createElement("span");
      nameSpan.textContent = u.username + (u.username === currentUser ? " (you)" : "");
      
      li.appendChild(avatar);
      li.appendChild(nameSpan);
      userList.appendChild(li);
    });
  });
}

// --- UI Events ---
roomListUI.forEach(roomEl => {
  roomEl.addEventListener("click", () => {
    const newRoom = roomEl.dataset.room;
    if (newRoom === currentRoom) return;
    roomListUI.forEach(r => r.classList.remove("active"));
    roomEl.classList.add("active");
    currentRoom = newRoom;
    joinRoom(newRoom);
  });
});

messageForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = messageInput.value.trim();
  if (!text) return;
  socket.emit("chatMessage", { text });
  socket.emit("stopTyping");
  messageInput.value = "";
  messageInput.focus();
});

messageInput.addEventListener("input", () => {
  socket.emit("typing");
  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => socket.emit("stopTyping"), 1500);
});

// --- Helpers ---
function renderMessage(msg, isSelf) {
  const div = document.createElement("div");
  div.className = "msg" + (isSelf ? " self" : "");

  const avatar = document.createElement("div");
  avatar.className = "avatar";
  avatar.style.background = getAvatarColor(msg.username);
  avatar.textContent = msg.username.charAt(0).toUpperCase();

  const content = document.createElement("div");
  content.className = "msg-content";

  const meta = document.createElement("div");
  meta.className = "meta";
  meta.textContent = `${msg.username} · ${new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;

  const bubble = document.createElement("div");
  bubble.className = "msg-bubble";
  bubble.textContent = msg.text;

  content.appendChild(meta);
  content.appendChild(bubble);
  div.appendChild(avatar);
  div.appendChild(content);
  messagesEl.appendChild(div);
  scrollBottom();
}

function scrollBottom() {
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function getAvatarColor(name) {
  const colors = ["#ef4444", "#f97316", "#f59e0b", "#84cc16", "#22c55e", "#06b6d4", "#3b82f6", "#6366f1", "#a855f7", "#ec4899"];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

function playPopSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(600, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(900, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.1);
  } catch (e) {}
}

// --- Check for existing login on page load ---
const savedToken = localStorage.getItem("chat_token");
const savedUser = localStorage.getItem("chat_user");
if (savedToken && savedUser) {
  initChat(savedToken, savedUser);
}
