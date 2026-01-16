# 🌵 Gavé Agrotecnología

> Regenerative Agriculture Investment Platform for Sustainable Agave Cultivation in Mexico

[![Live Demo](https://dashboard.gaveagro.com)

## 🌱 Overview

Gavé Agrotecnología is a comprehensive AgTech platform that bridges the gap between private investors and regenerative agave farming in Oaxaca, Mexico. The platform provides real-time satellite monitoring, investment tracking, carbon capture metrics, and transparent cultivation management.

### Problem We Solve

Traditional agricultural investments lack transparency and real-time monitoring capabilities. Gavé Agrotecnología addresses this by providing:

- **Real-time satellite data** for vegetation health monitoring
- **Transparent investment tracking** with ROI projections
- **Environmental impact metrics** including carbon capture calculations
- **Direct connection** between investors and cultivation plots

## ✨ Key Features

| Feature | Description |
|---------|-------------|
| 📊 **Investment Simulator** | Project ROI based on species, plant count, establishment year, and market prices |
| 🛰️ **Satellite Monitoring** | Real-time NDVI/EVI/NDWI indices via Agromonitoring API |
| 🗺️ **Interactive Plot Maps** | Detailed cultivation site visualization with Mapbox GL |
| 📸 **Drone Photography** | Time-series photo documentation of plot development |
| 🌍 **Carbon Tracking** | Monitor CO₂ capture per investment and plant |
| 🌐 **Bilingual Interface** | Full Spanish/English language support |
| 👨‍💼 **Admin Dashboard** | User verification, investment approvals, species management |
| 🌤️ **Weather Integration** | Real-time and forecast weather data for each plot |

## 🖥️ Live Demo

https://dashboard.gaveagro.com

Use demo mode to explore the platform without authentication.

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (React)                         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐   │
│  │Dashboard │ │  Plots   │ │Simulator │ │ Admin Dashboard  │   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Supabase Backend                             │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐   │
│  │PostgreSQL│ │   Auth   │ │ Storage  │ │  Edge Functions  │   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    External APIs                                │
│  ┌──────────────┐ ┌──────────┐ ┌──────────┐ ┌────────────┐     │
│  │Agromonitoring│ │  Mapbox  │ │  Cecil   │ │   Resend   │     │
│  │  (Satellite) │ │ (Maps)   │ │(Weather) │ │  (Email)   │     │
│  └──────────────┘ └──────────┘ └──────────┘ └────────────┘     │
└─────────────────────────────────────────────────────────────────┘
```

## 🛠️ Technology Stack

### Frontend
- **React 18** - Modern UI library with hooks
- **TypeScript** - Type-safe development
- **Vite** - Fast build tooling
- **Tailwind CSS** - Utility-first styling
- **Shadcn UI** - Accessible component primitives
- **TanStack Query** - Async state management
- **Recharts** - Data visualization

### Backend
- **Supabase** - PostgreSQL database, authentication, storage
- **Edge Functions** - Serverless API endpoints (Deno)
- **Row Level Security** - Fine-grained access control

### Integrations
- **Agromonitoring API** - Satellite imagery and vegetation indices
- **Mapbox GL JS** - Interactive mapping
- **Cecil API** - Weather data and forecasts
- **Resend** - Transactional emails

## 📊 Database Schema

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   profiles   │     │  investments │     │    plots     │
├──────────────┤     ├──────────────┤     ├──────────────┤
│ user_id (FK) │◄────│ user_id      │     │ id           │
│ email        │     │ plot_id (FK) │────►│ name         │
│ name         │     │ species_id   │     │ location     │
│ role         │     │ plant_count  │     │ coordinates  │
│ balance      │     │ total_amount │     │ area         │
└──────────────┘     └──────────────┘     └──────────────┘
                            │
                            ▼
                     ┌──────────────┐
                     │plant_species │
                     ├──────────────┤
                     │ name         │
                     │ maturation   │
                     │ carbon_capture│
                     └──────────────┘
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm or bun
- Supabase account
- API keys for Mapbox and Agromonitoring

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/agave-growth-dashboard.git

# Navigate to project directory
cd agave-growth-dashboard

# Install dependencies
npm install

# Start development server
npm run dev
```

### Environment Variables

Additional secrets are configured in Supabase Edge Functions:
- `AGROMONITORING_API_KEY`
- `MAPBOX_PUBLIC_TOKEN`
- `CECIL_API_KEY`

## 📁 Project Structure

```
src/
├── components/
│   ├── monitoring/      # Satellite & weather monitoring
│   ├── simulator/       # Investment calculator
│   ├── admin/           # Admin management panels
│   ├── layout/          # App shell & navigation
│   └── ui/              # Shadcn UI components
├── contexts/
│   ├── AuthContext.tsx  # Authentication state
│   ├── DemoContext.tsx  # Demo mode handling
│   └── LanguageContext.tsx # i18n
├── pages/
│   ├── Dashboard.tsx    # Main investor view
│   ├── Plots.tsx        # Plot details & photos
│   ├── Simulator.tsx    # ROI calculator
│   └── Admin.tsx        # Admin panel
├── lib/
│   └── agromonitoring.ts # Satellite API client
└── integrations/
    └── supabase/        # Database client & types
```

## 📬 Contact

**Gavé Agrotecnología**
- Website: https://www.gaveagro.com
- Email: hola@gaveagro.com

---

<p align="center">
  <sub>Built with ❤️ for sustainable agriculture in Oaxaca, Mexico</sub>
</p>
