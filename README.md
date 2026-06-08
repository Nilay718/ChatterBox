# ChatterBox — Real-Time Chat Application

A real-time chat application built with the MERN stack and Socket.io.

🔗 **Live Demo:** [chatterbox-3ao8.onrender.com](https://chatterbox-3ao8.onrender.com)

> **Note:** The app is hosted on Render's free tier, so the first load may take ~30 seconds if the server is waking up.

---

## Features

- User signup, login, logout (JWT authentication)
- One-to-one real-time chat
- Group chat (create, join, leave)
- Online/offline status
- Typing indicators
- Read receipts (blue checkmarks)
- Unread message count
- Last seen timestamps
- Image & file sharing (Cloudinary)
- Emoji picker
- Message edit & delete
- Infinite scroll for chat history
- User search
- Dark mode
- Responsive design (mobile-friendly)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, TailwindCSS v3 |
| Backend | Node.js, Express.js |
| Database | MongoDB (Mongoose) |
| Real-time | Socket.io |
| Auth | JWT (access + refresh tokens) |
| File Storage | Cloudinary |

---

## Project Structure

```
chatterbox/
├── .gitignore
├── README.md
│
├── server/                     # Backend
│   ├── .env.example
│   ├── package.json
│   ├── server.js               # Entry point
│   ├── config/                 # DB, Cloudinary, env validation
│   ├── controllers/            # Route handlers
│   ├── middleware/              # Auth, errors, rate limiting
│   ├── models/                 # Mongoose schemas
│   ├── routes/                 # API route definitions
│   ├── socket/                 # Socket.io event handlers
│   └── utils/                  # Logger, JWT helpers
│
└── client/                     # Frontend
    ├── .env.example
    ├── package.json
    ├── index.html
    ├── vite.config.js
    ├── tailwind.config.js
    └── src/
        ├── App.jsx             # Routing
        ├── main.jsx            # Entry point
        ├── index.css           # Global styles
        ├── api/                # Axios setup
        ├── context/            # Auth, Chat, Socket, Theme
        ├── hooks/              # Custom hooks
        ├── pages/              # Login, Signup, Home
        ├── components/
        │   ├── auth/           # Login/Signup forms
        │   ├── chat/           # Chat window, messages
        │   ├── common/         # Avatar, Badge, Modal
        │   ├── group/          # Group create/manage
        │   └── sidebar/        # Chat list, search, profile
        └── utils/              # Constants, helpers
```

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18 or higher
- [MongoDB Atlas](https://www.mongodb.com/atlas) account (free tier works)
- [Cloudinary](https://cloudinary.com/) account (free tier works)

### 1. Install Dependencies

```bash
# Install backend dependencies
cd server
npm install

# Install frontend dependencies
cd ../client
npm install
```

### 2. Set Up Environment Variables

Create a `.env` file in `server/` (copy from `.env.example`):

```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/chatterbox
JWT_ACCESS_SECRET=your_secret_here
JWT_REFRESH_SECRET=your_secret_here
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
CLIENT_URL=http://localhost:5173
```

Create a `.env` file in `client/`:

```env
VITE_API_URL=http://localhost:5000
VITE_SOCKET_URL=http://localhost:5000
```

### 3. Run the App

```bash
# Terminal 1 — start the backend
cd server
npm run dev

# Terminal 2 — start the frontend
cd client
npm run dev
```

Open http://localhost:5173 in your browser.

---

## API Endpoints

### Auth — `/api/auth`
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/register` | Create account |
| POST | `/login` | Login |
| POST | `/logout` | Logout |
| POST | `/refresh` | Refresh token |

### Users — `/api/users`
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/profile` | Get profile |
| PUT | `/profile` | Update profile |
| GET | `/search?q=` | Search users |

### Chats — `/api/chats`
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Get all chats |
| POST | `/` | Start a chat |
| POST | `/group` | Create group |
| PUT | `/group/:id` | Update group |
| PUT | `/group/:id/add` | Add member |
| PUT | `/group/:id/remove` | Remove member |
| DELETE | `/group/:id/leave` | Leave group |

### Messages — `/api/messages`
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/:chatId` | Get messages |
| POST | `/` | Send message |
| PUT | `/:id` | Edit message |
| DELETE | `/:id` | Delete message |

---

## License

MIT
