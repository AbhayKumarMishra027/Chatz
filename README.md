# Chatz

Chatz is a responsive social space for sharing ideas and having thoughtful direct conversations.

## Problem and audience

Professional and community conversations often end up split across public feeds and disconnected private chats. Chatz gives people one place to discover community posts and continue a conversation privately. It is designed for students, professional communities, and small groups who want a calmer social feed with direct messaging.

## Features implemented

- Open registration, login/logout, HttpOnly cookie sessions, and editable profiles.
- Public and followers-only posts, following and Explore feeds, likes, comments, and private saved posts.
- User search, follow/unfollow, private profiles, and block/unblock.
- Persistent one-to-one messages, requests, unread counts, read state, typing/presence, and message deletion actions.
- In-app notifications and user/post reporting.
- Responsive layout, mobile navigation, and locally persisted light/dark theme.

Posts and messages are text-only. Image uploads are not configured.

## Current status

The repository currently includes account registration and sessions, profile editing and privacy, follows, visibility-filtered posts, comments, likes, private saves, search, blocks, reports, notifications, message requests, persistent one-to-one messages, and Socket.IO delivery/presence/typing. Avatar and post media uploads, E2EE, group conversations, and a moderator dashboard are not included. The interface does not use seeded accounts or fabricated posts.

## Stack and architecture

- `frontend/`: React, Vite, React Router, Axios, Socket.IO client, responsive CSS.
- `backend/`: Node.js, Express, Mongoose, MongoDB Atlas, Socket.IO, bcrypt, JWT, Zod.
- `backend/src/config/`: environment and database configuration.
- `backend/src/middleware/`: shared error and 404 handling.

The browser talks to a resource-oriented REST API. Socket.IO uses the authenticated session cookie for message delivery, typing, and presence. MongoDB stores persistent application data. The MVP does not claim end-to-end encryption.

The API is grouped under `/api/auth`, `/api/users`, `/api/posts`, `/api/saved`, `/api/messages`, `/api/notifications`, and `/api/reports`, plus `GET /api/health`. Requests require an authenticated cookie except health and the registration/login endpoints.

## Data model overview

- `User` stores normalized identity, hashed password, profile/privacy fields, and messaging preference.
- `Follow` has a unique follower/following pair; `Block` has a unique blocker/blocked pair.
- `Post` stores author, visibility, likes, and embedded comments; `SavedPost` is a private, unique user/post relation.
- `Conversation` stores a canonical one-to-one participant pair and request status; `Message` stores persistent history, read state, and per-user deletion state.
- `Notification` is recipient-scoped; `Report` persists user/content reports while hiding the reporter reference from normal queries.

Indexes cover identity uniqueness, relationships, feed ordering, conversation membership, message history, notifications, and report queues.

## Requirements

- Node.js 20.19+ or 22.12+ and npm.
- A MongoDB Atlas cluster for the API.

## Local setup

1. Install dependencies from the repository root:

   ```sh
   npm install
   ```

2. Copy `backend/.env.example` to `backend/.env` and configure the required values:

   ```env
   NODE_ENV=development
   PORT=5000
   MONGODB_URI=mongodb+srv://...
   JWT_SECRET=<at-least-32-random-characters>
   CLIENT_URL=http://localhost:5173
   ```

   Generate a secret locally, for example with `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`. Keep `.env` files private; they are ignored by Git.

3. Optionally copy `frontend/.env.example` to `frontend/.env` and set `VITE_API_URL` if the API is not running at `http://localhost:5000`.

4. Start both development servers:

   ```sh
   npm run dev
   ```

   The frontend is at `http://localhost:5173`; the API health endpoint is `http://localhost:5000/api/health`.

If you need the servers separately, run `npm run dev:backend` and `npm run dev:frontend` in two terminals.

## MongoDB Atlas setup

1. Create a MongoDB Atlas account and a free-tier cluster.
2. Create a database user with a strong password. Use a narrowly scoped database user for this application.
3. Configure Network Access for the backend host. For local development, allow your current public IP; for deployment, use a supported static egress IP or the hosting provider's documented network setup. Avoid leaving unrestricted access enabled as a permanent setting.
4. Select **Connect → Drivers** and copy the Node.js connection URI. Replace the password placeholder and specify a database name.
5. Put the URI in `MONGODB_URI` in `backend/.env`; do not put it in the frontend or commit it.
6. Start the API. It connects on startup and logs a success message or a useful startup error. Mongoose creates collections when the application first writes data; manual collection setup is not needed.

## Scripts

- `npm run dev` — run frontend and backend in development mode.
- `npm run build` — build the frontend for production.
- `npm start` — start the backend (requires its environment variables and MongoDB access).

## Verification

- `npm run build` builds the frontend.
- `GET http://localhost:5000/api/health` checks that the API responds.
- With Atlas configured, manually verify two accounts, duplicate registration, profile privacy, follow/unfollow, post visibility and CRUD, likes/comments/saves, message request accept/reject, blocks, unread/read state, and responsive mobile navigation. The database workflows still need to be exercised against a configured Atlas database.

## Deployment plan

- Deploy `frontend/` to Vercel with the project root set to `frontend` and `VITE_API_URL` pointing to the backend URL. `frontend/vercel.json` rewrites client routes to `index.html`.
- Deploy `backend/` to Render with the root directory set to `backend`; use `npm install` to install dependencies and `npm start` to run. Configure `MONGODB_URI`, a cryptographically random `JWT_SECRET`, `CLIENT_URL` set to the deployed frontend origin, and `NODE_ENV=production`. Render supplies `PORT`; the server listens on it.
- Configure Atlas network access so the deployed backend can reach the database without leaving the database open to the entire internet.
- Configure credentials only in each provider's environment settings. HTTPS, cross-origin cookie settings, and Socket.IO origin configuration must match the deployed frontend before authentication or real-time features are enabled.

No deployment has been performed or verified yet. Do not push or deploy until you are ready to publish the repository.

## Security notes

The API applies Helmet, an explicit credentialed CORS origin, JSON body limits, a general API rate limit, and stricter authentication and report rate limits. Passwords are bcrypt hashed. Sessions use an HttpOnly cookie; mutations require the configured frontend Origin. Profile and post visibility, follow/block rules, message-request permissions, and Socket.IO room membership are checked on the server. Startup requires a MongoDB URI and a JWT secret of at least 32 characters. Production use still requires HTTPS and environment-specific cookie/CORS verification. File upload validation is not implemented.

## Roadmap

1. Configure Atlas, run the documented two-account workflow, and fix integration issues.
2. Add automated workflow tests and review access-control edge cases.
3. Add media uploads after Cloudinary is configured.
4. Add a moderation dashboard and complete deployment/demo verification.

## Known limitations

No MongoDB-backed workflows have been exercised yet because Atlas configuration is not present. Media uploads, account deletion/data export, browser push, E2EE, groups/calls, and admin report review remain unimplemented. Reports are persisted, but there is no moderation dashboard yet. Cloudinary configuration will be added when media uploads are implemented. A 3–5 minute demo, final deployment, and official submission remain to be completed.
