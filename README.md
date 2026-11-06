# 💬 Real-Time Chat Application

A fully functional, full-stack real-time chat application. Users can register, log in securely, and chat with others in real-time across multiple rooms. Built entirely with **Vanilla JavaScript**, **Node.js**, **Express**, **Socket.io**, and **MongoDB**.

🔗 **Live Demo:** [https://chat-app-dahx.onrender.com/](https://chat-app-dahx.onrender.com/)

## ✨ Features

- 🔐 **Secure Authentication** — User registration and login using JWT (JSON Web Tokens) and bcrypt password hashing.
- ⚡ **Real-Time Messaging** — Instant message delivery and receipt using Socket.io.
- 🚪 **Multiple Chat Rooms** — Switch between `#general`, `#gaming`, and `#music`.
- 🟢 **Live User Tracking** — See exactly who is online in the current room in the sidebar.
- ✍️ **Typing Indicators** — See "User is typing..." when someone is drafting a reply.
- 💾 **Persistent History** — Messages are saved to MongoDB and loaded instantly when joining a room.
- 🎨 **Modern UI** — Clean, responsive design with dynamically generated user avatars and message bubbles.
- 🌗 **Dark / Light Mode** — Toggle themes, persisted via `localStorage`.
- 🔊 **Sound Effects** — Subtle pop sound plays when receiving a new message (via Web Audio API).

## 🛠️ Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend** | HTML5, CSS3, Vanilla JavaScript (ES6+) |
| **Backend** | Node.js, Express.js |
| **Database** | MongoDB Atlas, Mongoose |
| **Real-Time** | Socket.io |
| **Auth** | JSON Web Tokens (JWT), bcryptjs |
| **Hosting** | Render (Backend), MongoDB Atlas (DB) |

