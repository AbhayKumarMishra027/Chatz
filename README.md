# Chatz — A Little Space to Connect

**Chatz** is a full-stack social and messaging web application that brings community posts and private conversations together in one place.

🔗 **Live Application:** https://chatz-khaki.vercel.app  
⚙️ **Backend API:** https://chatz-ulbz.onrender.com  
💻 **GitHub Repository:** https://github.com/AbhayKumarMishra027/Chatz  
🎬 **Demo Video:** _Add the public 3–5 minute demo video link before submission._

---

## 1. Problem Statement

Online communities often use separate platforms for sharing updates, discovering people, and having private conversations. This can make it harder to maintain a connected community experience.

Chatz aims to bring these interactions together in a single application, allowing users to publish posts, discover people, manage relationships, and communicate privately.

## 2. Target Users

Chatz is designed for:
- Students and college communities
- People building professional or interest-based networks
- Small communities that want social sharing and direct messaging in one place

## 3. Key Features

### Authentication and Profiles
- User registration, login, and logout
- Cookie-based authentication using HttpOnly cookies
- Editable user profiles and privacy preferences
- Public and private profile support

### Social Feed
- Create and view posts
- Public and followers-only post visibility
- Like and comment on posts
- Save posts privately
- Follow and unfollow users

### Discovery and Community
- Search for users and discover public content
- Follow relationships and private-account follow requests
- Block and unblock accounts
- Notifications for relevant account and social activity
- Report users or content

### Direct Messaging
- Persistent one-to-one conversations
- Message requests and request handling
- Read state and unread counts
- Real-time message delivery, typing indicators, and presence using Socket.IO
- Message deletion actions

### Media
- Cloudinary integration for image storage
- Backend media routes for avatars and post images
- Image availability depends on valid Cloudinary configuration and successful production integration

### User Experience
- React-based interface with responsive styling
- Light and dark themes
- Dedicated pages for Home, Explore, Messages, Notifications, Saved, Profile, and Settings

> Features are described from the implementation and repository structure. Production behavior should be confirmed using the deployed application before treating every workflow as verified.

## 4. Technology Stack

| Layer | Technologies |
|---|---|
| Frontend | React, Vite, React Router |
| API communication | Axios |
| Real-time communication | Socket.IO Client, Socket.IO |
| Backend | Node.js, Express |
| Database | MongoDB Atlas, Mongoose |
| Authentication | JWT, bcrypt, HttpOnly cookies |
| Validation | Zod |
| Security | Helmet, CORS, express-rate-limit |
| Media storage | Cloudinary |
| Frontend hosting | Vercel |
| Backend hosting | Render |
| Version control | Git, GitHub |

## 5. Architecture

Chatz uses a frontend/backend architecture with persistent database storage and real-time communication.

```text
                 User's Browser
                       |
                       v
              Vercel: React + Vite
                       |
              REST API + Socket.IO
                       |
                       v
              Render: Express API
                 /           \
                v             v
         MongoDB Atlas     Cloudinary
         Application Data  Image Storage
```

### Main components

- **Frontend (`frontend/`)**: React pages, navigation, forms, client-side state, API calls, and Socket.IO client integration.
- **Backend (`backend/`)**: Express routes, authentication, validation, authorization, error handling, and real-time communication.
- **Database**: MongoDB stores users, relationships, posts, messages, notifications, and other application records.
- **Media storage**: Cloudinary stores uploaded images when media configuration is available.

The REST API is organized around resources such as authentication, users, posts, saved posts, messages, notifications, reports, and media.

The application does not claim end-to-end encryption.

## 6. Project Structure

```text
Chatz/
├── frontend/
│   ├── src/
│   ├── public/
│   ├── package.json
│   ├── vite.config.js
│   └── vercel.json
├── backend/
│   ├── src/
│   │   ├── config/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── realtime/
│   │   ├── routes/
│   │   └── services/
│   ├── test/
│   ├── package.json
│   └── .env.example
├── package.json
└── README.md
```

## 7. Local Setup

### Prerequisites

- Node.js compatible with the project's Vite requirements (Node.js 20.19+ or 22.12+)
- npm
- A MongoDB Atlas database, or another appropriately configured MongoDB instance
- Cloudinary credentials if you want to use media uploads

### Step 1: Clone the repository

```bash
git clone https://github.com/AbhayKumarMishra027/Chatz.git
cd Chatz
```

### Step 2: Install dependencies

From the repository root:

```bash
npm install
```

### Step 3: Configure the backend

Copy `backend/.env.example` to `backend/.env` and configure:

```env
NODE_ENV=development
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_random_secret_of_at_least_32_characters
CLIENT_URL=http://localhost:5173

CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

`MONGODB_URI` and a `JWT_SECRET` of at least 32 characters are required for startup. Add valid Cloudinary credentials when using media functionality.

Generate a random JWT secret locally:

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Never commit `.env` files or share secret values.

### Step 4: Configure the frontend

Copy `frontend/.env.example` to `frontend/.env`.

For local development, the default configuration is:

```env
VITE_API_URL=http://localhost:5000
```

The frontend environment variable contains the API's base URL, not private credentials.

### Step 5: Run the application

From the repository root:

```bash
npm run dev
```

This starts the frontend and backend development servers.

- Frontend: http://localhost:5173
- Backend health endpoint: http://localhost:5000/api/health

To run the services separately, use two terminals:

```bash
npm run dev:backend
```

```bash
npm run dev:frontend
```

## 8. Available Scripts

Run these commands from the repository root.

| Command | Purpose |
|---|---|
| `npm run dev` | Start frontend and backend development servers |
| `npm run dev:frontend` | Start the Vite frontend |
| `npm run dev:backend` | Start the backend in development mode |
| `npm run build` | Build the frontend for production |
| `npm test` | Run the backend Node.js test suite |
| `npm start` | Start the backend |

## 9. Environment Variables

### Backend — Render or local environment

| Variable | Purpose |
|---|---|
| `NODE_ENV` | Runtime environment |
| `PORT` | HTTP server port; Render supplies this in production |
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | Secret used for JWT signing |
| `CLIENT_URL` | Allowed frontend origin for credentialed requests |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Private Cloudinary API secret |

### Frontend — Vercel or local environment

| Variable | Purpose |
|---|---|
| `VITE_API_URL` | Public base URL of the backend API |

Do not put `MONGODB_URI`, `JWT_SECRET`, or `CLOUDINARY_API_SECRET` in frontend environment variables. Vite variables prefixed with `VITE_` are exposed to browser code.

## 10. Deployment

Chatz uses Vercel for the frontend, Render for the backend, MongoDB Atlas for persistent data, and Cloudinary for media storage.

### Frontend — Vercel

- Repository: `AbhayKumarMishra027/Chatz`
- Root directory: `frontend`
- Framework preset: Vite
- Build command: `npm run build`
- Output directory: `dist`
- Environment variable: `VITE_API_URL=https://chatz-ulbz.onrender.com`

The repository includes `frontend/vercel.json` to rewrite client-side routes to `index.html`.

Live URL: https://chatz-khaki.vercel.app

### Backend — Render

- Repository: `AbhayKumarMishra027/Chatz`
- Root directory: `backend`
- Build command: `npm install`
- Start command: `npm start`

Configure the backend environment variables in Render. Set `NODE_ENV=production`, use the MongoDB Atlas connection string, configure a strong JWT secret, and set `CLIENT_URL` to the exact production frontend origin:

```env
CLIENT_URL=https://chatz-khaki.vercel.app
```

The backend exposes a health endpoint at:

https://chatz-ulbz.onrender.com/api/health

Expected response:

```json
{
  "status": "ok",
  "service": "chatz-api"
}
```

### Production verification

Deployment success alone does not prove that all workflows work. Verify registration, login, persistent sessions, posts, profile privacy, image uploads, and two-account messaging in production.

Cross-origin cookies, CORS, and Socket.IO authentication must be configured correctly for the deployed origins. Render's free service may sleep when idle, which can cause a delay on the first request.

## 11. Security Considerations

The backend includes security and validation measures such as:

- Password hashing with bcrypt
- HttpOnly cookie-based authentication
- JWT validation
- Input validation using Zod
- Helmet security headers
- Credentialed CORS configuration
- API rate limiting
- Server-side authorization for protected resources
- Privacy and block-related access checks

Production deployment should use HTTPS, correctly scoped credentials, a strong JWT secret, and suitable database network access rules.

## 12. Testing and Verification

The repository includes backend tests and frontend test scripts.

Run:

```bash
npm test
npm run build
```

These commands help verify backend tests and frontend compilation. They do not, by themselves, establish that all live production workflows work.

Important manual checks include:

- Registration, login, logout, and session persistence
- Profile editing and privacy rules
- Follow/unfollow and private-account requests
- Post visibility, likes, comments, and saved posts
- User search, blocking, and reporting
- Message requests, unread/read state, and real-time delivery
- Cloudinary-backed media upload and delivery
- Mobile layout and desktop regression checks

## 13. Known Limitations

- Production authentication and cross-origin cookie behavior must be verified after environment configuration.
- Image functionality depends on correct Cloudinary configuration and production testing.
- Mobile navigation and layout refinements remain planned.
- The application does not currently claim end-to-end encryption, group conversations, voice/video calls, or a dedicated moderation dashboard.

## 14. Demo Video and Submission

The end-term project guidelines request a **3–5 minute demo video** showing the problem, target users, major workflows, interesting functionality, and the working application.

Before final submission:

- Confirm that the GitHub repository is accessible.
- Verify the deployed application and backend health endpoint.
- Test the important workflows using separate accounts.
- Add the public demo video URL to this README.
- Verify that all links work without requiring extra permissions.

**Official submission form:**  
https://forms.gle/sBy4sfqyiRG2Zpom9

## 15. Author

**Abhay Kumar*

GitHub: [AbhayKumarMishra027](https://github.com/AbhayKumarMishra027)

---

*Chatz — A little space to connect.*
