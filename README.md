# NeeLine — Number Line Visualizer

> **An algorithmic, horizontal deep-time number line visualizer built for historical researchers, scholars, and curious minds.**  
> *Developed in Collaboration with Academia | Devnetra Consultancy*

---

## 🌟 Overview

**NeeLine** is a modern, data-driven horizontal number line canvas engineered to visualize deep-time chronology with mathematical precision. Spanning from ancient antiquity (deep BCE) to the modern era and future milestones, NeeLine replaces fragmented vertical lists with a continuous, fluid temporal coordinate plane.

---

## ✨ Features

- **Continuous Deep-Time Coordinate Engine**: Map events seamlessly across BCE (negative numbers) and CE (positive numbers) with smooth mathematical panning, continuous mousewheel zooming, and pinch gestures.
- **Smart Multi-Tier Layout Engine**: Automatically stacks event label cards into non-overlapping tiers. When events pack densely, they collapse into glowing interactive beacon nodes with rich hover spotlight cards.
- **Synchronized Luminous & Obsidian Design**: Enjoy a radiant, colorful museum-grade Light Theme and a deep cosmic Obsidian Theme, with canvas background, spine, and ticks custom-configured per timeline.
- **Elapsed Time Gap Badges**: Visual indicator pills between consecutive milestones that calculate elapsed historical spans (`k yrs`, `M yrs`) with toggleable borders.
- **Publication-Ready Export**:
  - **2x Retina PNG**: Ultra-crisp graphic export for academic essays, research slides, and papers.
  - **Tabular TXT & JSON**: One-click export and high-speed batch JSON import.
- **Instant Guest Sandbox & Google OAuth**: Immediate zero-barrier guest access or authenticated cloud persistence via Google OAuth.

---

## 🛠 Tech Stack

- **Framework**: [Next.js 15 (App Router)](https://nextjs.org/)
- **UI Library**: [React 19](https://react.dev/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Language**: [TypeScript 5](https://www.typescriptlang.org/)
- **Database & ORM**: [PostgreSQL](https://www.postgresql.org/) & [Prisma 7](https://www.prisma.io/) with `@prisma/adapter-pg`
- **Authentication**: [Auth.js / NextAuth v5](https://authjs.dev/)
- **Icons & Typography**: [Lucide React](https://lucide.dev/), Fraunces, Inter, JetBrains Mono

---

## 🚀 Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL database (e.g. Neon, Supabase, or local Postgres)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/DevnetraConsultancy/NeeLine.git
   cd NeeLine
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables (`.env`):
   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/neeline"
   AUTH_SECRET="your-secure-random-secret"
   GOOGLE_CLIENT_ID="your-google-oauth-client-id"
   GOOGLE_CLIENT_SECRET="your-google-oauth-client-secret"
   ```

4. Run database migrations:
   ```bash
   npx prisma db push
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🏛 Keyboard & Gesture Controls

| Action | Control |
|---|---|
| **Fit All Events** | Press `0` or click **Fit** |
| **Pan Axis** | Drag canvas / 1-finger drag |
| **Zoom In / Out** | Scroll wheel, `+` / `-`, or 2-finger pinch |
| **Add Milestone** | Click directly on the spine axis or press `+` |
| **Inspect Event** | Click any milestone card or node dot |

---

## 📜 License & Collaboration

Developed in Collaboration with Academia by **Devnetra Consultancy**.  
Contact: [devnetraconsultancy@gmail.com](mailto:devnetraconsultancy@gmail.com) | Instagram: [@scien_nee](https://www.instagram.com/scien_nee/)
