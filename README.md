# Clothing ERP — Frontend (React + Vite)

The React frontend for the Clothing ERP system. Provides a fully role-based UI for POS, inventory, production, purchasing, and a multi-department procurement workflow with real-time WebSocket notifications.

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Project Setup](#project-setup)
  - [1. Clone the Repository](#1-clone-the-repository)
  - [2. Install Dependencies](#2-install-dependencies)
  - [3. Configure API Base URL](#3-configure-api-base-url)
  - [4. Start the Dev Server](#4-start-the-dev-server)
- [Environment Overview](#environment-overview)
- [Project Structure](#project-structure)
- [Key Features](#key-features)
- [Role-Based Access (RBAC)](#role-based-access-rbac)
- [WebSocket Notifications](#websocket-notifications)
- [Building for Production](#building-for-production)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Language | TypeScript |
| Framework | React 19 + Vite 8 |
| Routing | React Router v7 |
| State / Data | TanStack Query v5 |
| Forms | Formik + Yup |
| Real-time | STOMP.js + SockJS |
| HTTP | Axios |
| Styling | Bootstrap 5 + SASS |
| Charts | ApexCharts |
| PDF Export | jsPDF + jsPDF-AutoTable |
| Package Manager | Yarn 4 |

---

## Prerequisites

| Tool | Version | Notes |
|---|---|---|
| Node.js | 18+ | [Download](https://nodejs.org/) |
| Yarn | 4.x | `corepack enable && corepack prepare yarn@4.12.0 --activate` |
| Backend | Running on port 8089 | See the [Backend README](../Spring_Boot_/README.md) |

---

## Project Setup

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd Clothing-ERP-New-System-Front-end
```

---

### 2. Install Dependencies

```bash
yarn install
```

---

### 3. Configure API Base URL

The frontend communicates with the backend via Axios. The base URL is configured in:

```
src/lib/axios.ts
```

Open it and verify the `baseURL` points to your running backend:

```ts
const api = axios.create({
  baseURL: 'http://localhost:8089',
});
```

Change the URL if your backend is running on a different host or port.

---

### 4. Start the Dev Server

```bash
yarn dev
```

The app will be available at: **`http://localhost:8082`**

> The dev server runs on port **8082** (configured in `package.json`).

---

## Environment Overview

| Setting | Value |
|---|---|
| Frontend URL | `http://localhost:8082` |
| Backend API | `http://localhost:8089` |
| WebSocket | `ws://localhost:8089/ws` |

---

## Project Structure

```
src/
├── api/                    # All API call functions + TypeScript types
│   ├── auth.api.ts         # Login / logout
│   ├── inquiry.api.ts      # Procurement workflow
│   ├── notifications.api.ts
│   ├── products.api.ts
│   ├── users.api.ts
│   └── ...
├── components/
│   ├── bootstrap/          # Bootstrap-based UI components
│   ├── common/             # Shared components (DataTable, NotificationBell, etc.)
│   └── icon/               # Material icon wrappers
├── constants/
│   └── permissions.ts      # All permission key constants (RBAC)
├── contexts/
│   ├── authContext.tsx     # Auth state (user, token, permissions, departments)
│   └── themeContext.tsx    # Dark mode / fullscreen state
├── hooks/                  # Custom React hooks
│   ├── useNotifications.ts # WebSocket + REST notification hook
│   ├── usePermission.ts    # RBAC permission check hook
│   └── useProducts.ts
├── layout/                 # App shell (Header, Aside, Page wrappers)
├── pages/
│   └── presentation/
│       ├── auth/           # Login page
│       ├── purchasing/     # PurchaseInquiriesPage, PurchaseOrdersPage, GRN
│       ├── inventory/
│       ├── production/
│       ├── pos/
│       └── user-management/
├── routes/
│   ├── contentRoutes.tsx   # Page route definitions
│   └── headerRoutes.tsx
├── menu.ts                 # Navigation menu structure + permissions
└── utils/
    └── permissions.ts      # StoredAuthUser type, permission helpers
```

---

## Key Features

### 🔐 Authentication
- JWT-based login stored in `localStorage`
- Automatic token injection via Axios interceptor
- 401 auto-logout

### 📋 Procurement Workflow (9-step State Machine)
Navigate to **Purchasing → Purchase Inquiries**:
1. SL Operations creates a draft inquiry (with optional line items linked to products)
2. Procurement sends it to GF Office → **email is sent automatically**
3. GF Office confirms → Procurement records it
4. SL Operations re-confirms
5. Finance approves → PO is official
6. Procurement sends PO to GF → **email is sent**
7. GF sends back Proforma Invoice → Procurement uploads it
8. Finance processes payment & uploads TT receipt → **email is sent**
9. Procurement finalizes the PO

### 🔔 Real-time Notifications
- Bell icon in the top-right header shows a live unread badge
- Powered by WebSocket (STOMP/SockJS) — no polling needed
- Each department (`SL_OPERATIONS`, `PROCUREMENT`, `FINANCE`) only sees their own notifications
- Falls back to 30-second polling if WebSocket is disconnected

### 🏪 Point of Sale (POS)
- Cashier shift management (open/close shifts)
- Cart management, product search, variants
- Invoice generation and payment processing

### 📦 Inventory Management
- Real-time stock levels
- Material movements
- Low stock reporting

### 🏭 Production
- Work order management
- Production stage tracking
- Quality checks

---

## Role-Based Access (RBAC)

Access is controlled by **permissions** stored in the JWT token.

Permission constants are defined in [`src/constants/permissions.ts`](src/constants/permissions.ts).

Use the `usePermission` hook in any component:

```tsx
import { usePermission } from '../../../hooks/usePermission';

const { hasPermission } = usePermission();

if (hasPermission('procurement-inquiry-create')) {
  // show create button
}
```

Permissions are also enforced server-side on every API endpoint.

### Department-Based Filtering (Procurement)

Users can belong to multiple departments (`SL_OPERATIONS`, `PROCUREMENT`, `FINANCE`). Departments are stored in `localStorage` after login and read from `AuthContext`. The `NotificationBell` and procurement action menus are filtered by department automatically.

---

## WebSocket Notifications

The `useNotifications` hook (used inside `NotificationBell`) connects to the backend WebSocket on mount:

```ts
// Connects to:
new SockJS('http://localhost:8089/ws')

// Subscribes to department topics:
/topic/notifications/PROCUREMENT
/topic/notifications/FINANCE
/topic/notifications/SL_OPERATIONS
```

The hook automatically invalidates the `notifications` TanStack Query cache when a push is received, causing the bell badge to update instantly.

> **Vite fix:** `global: 'window'` is set in `vite.config.mts` to polyfill `sockjs-client`'s use of Node's `global` variable in the browser.

---

## Building for Production

```bash
yarn build
```

Output is written to the `dist/` folder. Serve it with any static file host (Nginx, Netlify, Vercel, etc.).

Ensure the backend `CORS` configuration allows requests from your production domain.

---

## Available Scripts

| Command | Description |
|---|---|
| `yarn dev` | Start development server on port 8082 |
| `yarn build` | Build for production |
| `yarn preview` | Preview production build locally |
| `yarn lint` | Run ESLint |
| `yarn lint:fix` | Auto-fix ESLint errors |
