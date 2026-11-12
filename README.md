# Industry Flow — Frontend

Web app for **Industry Flow**, Emerald's business development and project pipeline platform. It covers projects and opportunities, tasks, team management, partners, documents, an executive dashboard and in-app notifications.

## Tech Stack

- **React 18** + **TypeScript**, built with **Vite**
- **Tailwind CSS** + **shadcn/ui** (Radix UI)
- **TanStack Query** for server state, **Axios** for API calls
- **React Router** for routing
- **Recharts** for charts, **jsPDF** for PDF reports
- Installable as a **PWA**

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- A running [Industry Flow backend](https://github.com/EmeraldITDev/industry-flow-backend)

### Installation

```bash
git clone <repository-url>
cd industry-flow-BD
npm install
```

The backend URL is set in one place: [`src/config/api.ts`](src/config/api.ts). Edit `API_BASE_URL` there to point the app at a different backend (for example `http://localhost:8000`). It is not read from `.env`.

### Run

```bash
npm run dev
```

The app runs at `http://localhost:8080`.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Build for production into `dist/` |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run ESLint |
| `npm run pwa:icons` | Regenerate PWA icons |

## Project Structure

```
src/
├── components/   # UI components (ui/ holds shadcn primitives)
├── context/      # React context providers (auth, notifications)
├── hooks/        # Custom hooks
├── lib/          # Utilities, permissions and calculations
├── pages/        # Route-level pages
├── services/     # API service layer (one file per resource)
├── types/        # Shared TypeScript types
└── App.tsx       # Routes and providers
```

## Deployment

The app is deployed on **Vercel**. `vercel.json` rewrites all non-API routes to `index.html` for client-side routing. The API URL comes from `src/config/api.ts`, so no API environment variable is needed on Vercel.
