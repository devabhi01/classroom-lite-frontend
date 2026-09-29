# TDP Classroom Lite - Frontend MVP

A lightweight, modern, and classroom-focused virtual classroom web application built with React 19, Vite, TypeScript, Tailwind CSS, shadcn/ui patterns, Socket.IO, WebRTC, and PDF.js.

Designed specifically for seamless online teaching and collaborative learning without unnecessary LMS clutter or complex overhead.

---

## 🚀 Tech Stack

- **Framework**: [React 19](https://react.dev/) + [Vite](https://vitejs.dev/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) + Custom shadcn/ui components
- **Routing**: [React Router v7](https://reactrouter.com/)
- **Networking / REST**: [Axios](https://axios-http.com/) with request/response interceptors
- **Real-Time Communication**: [Socket.IO Client](https://socket.io/docs/v4/client-api/)
- **Peer-to-Peer Streaming**: Browser WebRTC APIs (`RTCPeerConnection`, `getDisplayMedia`)
- **Interactive Whiteboard**: HTML5 Canvas API with vector drawing & pointer events
- **Document Presentation**: [PDF.js (`pdfjs-dist`)](https://mozilla.github.io/pdf.js/) Canvas renderer
- **Icons**: [Lucide React](https://lucide.dev/)

---

## 📁 Project Architecture & Folder Structure

```
Frontend/
├── public/
├── src/
│   ├── components/
│   │   ├── auth/
│   │   │   └── AuthCard.tsx
│   │   ├── classroom/
│   │   │   ├── ClassroomControls.tsx   # Bottom workspace mode & screen share controls
│   │   │   ├── ClassroomHeader.tsx     # Classroom title, code, participant count & leave/end
│   │   │   ├── JoinRequests.tsx        # Host approval/rejection panel for pending students
│   │   │   ├── ParticipantPanel.tsx    # Live participant list with Host/Student badges
│   │   │   ├── PdfToolbar.tsx          # PDF file selector, page navigation, and zoom
│   │   │   ├── PdfViewer.tsx           # PDF.js canvas renderer with synchronized slides
│   │   │   ├── ScreenShare.tsx         # WebRTC HTML5 Video screen share display
│   │   │   ├── Whiteboard.tsx          # Real-time collaborative HTML5 Canvas
│   │   │   └── WhiteboardToolbar.tsx   # Pen, eraser, color palette, stroke width, and clear
│   │   ├── layout/
│   │   │   ├── Footer.tsx              # Minimal application footer
│   │   │   ├── Layout.tsx              # Standard page wrapper with header & footer
│   │   │   └── Navbar.tsx              # Responsive navigation bar with mobile drawer
│   │   └── ui/
│   │       ├── Avatar.tsx              # User avatar with initial fallbacks
│   │       ├── Badge.tsx               # Status badges
│   │       ├── Button.tsx              # CVA-styled accessible button
│   │       ├── Card.tsx                # Card container components
│   │       ├── Dialog.tsx              # Accessible modal dialog
│   │       ├── Input.tsx               # Form input with validation error display
│   │       ├── Logo.tsx                # TDP Classroom Lite brand logo
│   │       ├── Tabs.tsx                # Tab navigation primitives
│   │       └── Toast.tsx               # Reactive toast notification manager
│   ├── context/
│   │   └── AuthContext.tsx             # JWT authentication state & session provider
│   ├── hooks/
│   │   ├── useAuth.ts                  # Auth context consumer
│   │   ├── useClassroom.ts             # Classroom socket lifecycle, rooms, and participant state
│   │   ├── usePdf.ts                   # PDF.js document loader and slide synchronization
│   │   ├── useWebRTC.ts                # WebRTC screen sharing signaling & peer connections
│   │   └── useWhiteboard.ts            # HTML5 Canvas pointer events and drawing operations
│   ├── lib/
│   │   ├── api.ts                      # Axios instance with Bearer interceptors & error handler
│   │   ├── socket.ts                   # Socket.IO client configured for /classroom namespace
│   │   └── utils.ts                    # Utility functions (cn, clipboard, initials)
│   ├── pages/
│   │   ├── Classroom.tsx               # Dedicated full-screen classroom application
│   │   ├── CreateClassroom.tsx         # Classroom generation form & code sharing
│   │   ├── Dashboard.tsx               # Quick actions & recent classrooms overview
│   │   ├── Home.tsx                    # Landing page
│   │   ├── JoinClassroom.tsx           # Classroom code entry & host approval waiting screen
│   │   ├── Login.tsx                   # Email/Password authentication
│   │   ├── Profile.tsx                 # User profile & logout
│   │   └── Signup.tsx                  # Registration form with validation
│   ├── routes/
│   │   └── AppRoutes.tsx               # Public, protected, and full-screen application routes
│   ├── types/
│   │   ├── auth.ts                     # User & Auth DTO interfaces
│   │   ├── classroom.ts                # Classroom models & workspace tabs
│   │   ├── participant.ts              # Participant roles & join requests
│   │   ├── pdf.ts                      # PDF presentation metadata & socket payloads
│   │   └── whiteboard.ts               # Canvas draw & erase operation data types
│   ├── App.css
│   ├── App.tsx                         # Root app wrapper with providers
│   ├── index.css                       # Tailwind layers and theme tokens
│   └── main.tsx                        # React DOM entry point
├── .env.example
├── .env
├── index.html
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── vite.config.ts
```

---

## ⚙️ Environment Variables

Create a `.env` file in the root directory based on `.env.example`:

```bash
cp .env.example .env
```

Configuration variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_URL` | Base URL of the NestJS backend application | `http://localhost:3000` |

---

## 🛠️ Installation & Development

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Development Server
```bash
npm run dev
```
The application will run locally at `http://localhost:5173`.

### 3. Build for Production
```bash
npm run build
```
Generates production-optimized assets in the `dist/` directory.

### 4. Preview Production Build
```bash
npm run preview
```

---

## 🌐 Application Routes

| Route | Protection | Purpose |
|-------|------------|---------|
| `/` | Public | Landing page with "Teach. Share. Learn." hero and feature highlights |
| `/login` | Public Only | Email & Password sign-in |
| `/signup` | Public Only | Registration with Name, Email, Password, and Confirmation |
| `/dashboard` | Protected | User dashboard showing quick actions and recent classrooms |
| `/create-classroom` | Protected | Create a new classroom room and receive a shareable 6-digit code |
| `/join-classroom` | Protected | Enter code and wait for host admission approval |
| `/classroom/:code` | Protected | Main real-time classroom workspace (Whiteboard, PDF, Screen Share) |
| `/profile` | Protected | User account details and session logout |

---

## 🔐 Authentication & API Integration

### Token Storage & Lifecycle
- Tokens are stored in browser `localStorage` under `tdp_classroom_token`.
- User profile info is stored under `tdp_classroom_user`.
- Passwords are never persisted.
- If a session expires or a `401 Unauthorized` response is returned, the app automatically triggers a clean logout and redirects the user to `/login`.

### REST Endpoints Integrated
- `POST /auth/signup` - Register a new teacher or student account
- `POST /auth/login` - Sign in and receive JWT token
- `POST /classrooms` - Create a classroom (Host)
- `GET /classrooms/:code` - Fetch classroom metadata, participants, and status
- `POST /classrooms/:code/join` - Request to join a classroom (Student)
- `POST /classrooms/:code/requests/:userId/accept` - Host accepts student join request
- `POST /classrooms/:code/requests/:userId/reject` - Host rejects student join request
- `POST /classrooms/:code/end` - Host terminates the classroom session

---

## ⚡ Socket.IO Integration (`/classroom` Namespace)

The frontend connects to the Socket.IO server at `${VITE_API_URL}/classroom`, passing the JWT token in `auth.token`:

```typescript
io(`${VITE_API_URL}/classroom`, {
  auth: { token: `Bearer ${token}` },
  transports: ['websocket', 'polling']
});
```

### Supported Socket Events

#### Room & Participant Management
| Event Name | Direction | Payload | Description |
|------------|-----------|---------|-------------|
| `classroom:join` | Client ➔ Server | `{ classroomCode }` | Join the classroom room |
| `classroom:leave` | Client ➔ Server | `{ classroomCode }` | Leave the classroom room |
| `classroom:sync` | Client ➔ Server | `{ classroomCode }` | Request full classroom state sync |
| `classroom:state` | Server ➔ Client | Full state object | Synchronize classroom, participants, tabs, PDF, and whiteboard |
| `classroom:user-joined` | Server ➔ Client | `{ participant }` | A new user joined the classroom |
| `classroom:user-left` | Server ➔ Client | `{ userId }` | A user exited the classroom |
| `classroom:participant-updated` | Server ➔ Client | `{ participant }` | Participant role/status updated |
| `classroom:request:new` | Server ➔ Client | `{ request }` | Host receives incoming student join request |
| `classroom:request:accepted` | Server ➔ Client | `{ userId }` | Student notified their request was accepted |
| `classroom:request:rejected` | Server ➔ Client | `{ userId }` | Student notified their request was rejected |
| `classroom:ended` | Server ➔ Client | `{ classroomCode }` | Host terminated the session; participants redirected |
| `classroom:tab-change` | Bidirectional | `{ tab }` | Host switches workspace mode (whiteboard, pdf, screenshare) |

---

## 🎨 Whiteboard Implementation

- **Technology**: Native HTML5 Canvas API.
- **Input Handling**: Pointer events (`pointerdown`, `pointermove`, `pointerup`, `pointercancel`) for unified touch, mouse, and stylus support.
- **Efficiency**: No screenshot or image binary transmission. Only normalized vector drawing operations are emitted:
  - **Draw**: `{ x1, y1, x2, y2, color, width }`
  - **Erase**: `{ x1, y1, x2, y2, width }` (using `destination-out` composite operation)
  - **Clear**: Empties canvas and clears operation history.
- **Responsiveness**: Coordinates are normalized to `[0..1]`, allowing drawing lines to scale accurately across desktop, tablet, and mobile screens regardless of device aspect ratio or pixel ratio.
- **State Reconstruction**: On room entry, the whiteboard replays all previous operations from `classroom:state` or `whiteboard:state`.

---

## 📄 PDF Presentation Flow

- **Technology**: `pdfjs-dist` rendering directly onto an HTML5 canvas.
- **Host Controls**: Host selects a local PDF file via the browser file input. An object URL is created, the total page count is determined, and metadata is broadcast via `pdf:share`.
- **Student Follow**: Students receive `pdf:shared`, and when the host navigates between slides, `pdf:page-changed` events ensure all student views update synchronously to the exact same page.
- **Zoom & Navigation**: Features Previous, Next, Page Counter (`Page X of Y`), Zoom In (+), Zoom Out (-), Zoom Reset, and Close PDF.

---

## 🖥️ WebRTC Screen Sharing Implementation

- **Technology**: Native browser WebRTC (`navigator.mediaDevices.getDisplayMedia` and `RTCPeerConnection`).
- **Zero Video Relay on Backend**: Video and audio streams travel strictly peer-to-peer. The NestJS backend acts purely as a signaling server.
- **Signaling Flow**:
  1. Host initiates screen sharing via `getDisplayMedia()`.
  2. Host creates an offer via `createOffer()` and emits `webrtc:offer` through Socket.IO.
  3. Student creates an answer via `createAnswer()` and returns `webrtc:answer`.
  4. Both peers exchange ICE candidates over `webrtc:ice-candidate`.
  5. The remote media stream attaches directly to a `<video>` element in the main workspace with fullscreen capability.
  6. When the host stops screen sharing, all tracks are closed and a `screenshare:stopped` signal notifies all clients.

---

## 🧪 Testing Instructions

1. **Start the Frontend**:
   ```bash
   npm run dev
   ```
2. **Access the Application**:
   Navigate to `http://localhost:5173`.
3. **Register/Login**:
   - Create a host account at `/signup`.
   - Log in at `/login`.
4. **Create Classroom**:
   - Navigate to `/create-classroom`.
   - Enter a name (e.g. `Physics 101`) and click **Create Classroom**.
   - Note down the generated 6-character code (e.g. `TDP8K2`).
   - Click **Enter Classroom**.
5. **Simulate a Student in an Incognito / Second Browser Window**:
   - Register a student account or log in with another user.
   - Click **Join Classroom** (`/join-classroom`).
   - Enter code `TDP8K2` and click **Request to Join**.
   - On the Host's screen, the pending join request appears in the left panel.
   - Host clicks **Accept**; the student window automatically navigates into the classroom.
6. **Test Collaborative Whiteboard**:
   - Select pen or eraser and draw; changes synchronize across windows.
7. **Test PDF Presentation**:
   - Switch tab to **PDF Presentation**.
   - Host selects a sample PDF file.
   - Host navigates pages; student view stays in sync.
8. **Test WebRTC Screen Sharing**:
   - Host clicks **Share Screen**.
   - Select window/tab/screen; student view receives live video stream.
