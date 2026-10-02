# Gather — real-time communication app

Gather is a dark, responsive meeting-room prototype with controls for camera and microphone access, screen capture, meeting chat, local file selection, and a canvas whiteboard.

## Run locally

Requires Node.js 22 or newer.

```bash
npm install
npm start
```

Open http://localhost:3000. Camera and screen capture require browser permission and a secure context (localhost is supported).

## Authentication

The sign-in dialog uses the existing Express `/api/login` and `/api/me` endpoints. The backend's seeded demo accounts use password `demo123` (for example, `gagan`). Guests can also continue without signing in.

## Prototype scope

The meeting participants and example messages are sample content. Chat messages, whiteboard strokes, and selected files are held in the current browser session; file downloads work for files selected in that browser. Camera and screen share capture local media, but this prototype does not include a WebRTC peer connection or a signaling service, so media and collaboration are not sent to other participants. The existing SQLite backend is retained for its account and session endpoints.
