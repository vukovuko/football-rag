# Football Data Analytics Platform

A comprehensive data analytics platform built on [StatsBomb Open Data](https://github.com/statsbomb/open-data), featuring normalized PostgreSQL database design and a modern React frontend.

![StatsBomb Logo](backend/football-open/img/SB%20-%20Icon%20Lockup%20-%20Colour%20positive.png)

## Data Attribution

This project uses **StatsBomb Open Data**. As per their requirements:

> *"If you publish, share or distribute any research, analysis or insights based on this data, please state the data source as StatsBomb and use our logo."*

All analysis, visualizations, and insights derived from this platform should credit StatsBomb as the data source.

## Project Overview

- **Backend**: Node.js + TypeScript + Drizzle ORM
- **Frontend**: React + TanStack Router + TanStack Query
- **Database**: PostgreSQL with normalized schema design
- **Data**: Competitions, Matches, Lineups, Events, 360 Frames

### Database Design Highlights

- Zero data loss with hybrid storage (normalized + `JSONB` backup)
- Composite primary keys where needed (e.g., `seasons` table)
- Proper foreign key constraints with lookup tables
- ~12M events loaded with full relationship tracking

## Development Setup

### Prerequisites

- Node.js 24+
- Docker & Docker Compose

### Quick Start

```bash
# 1. Clone and setup
git clone https://github.com/vukovuko/football-rag.git
cd football-data
npm run setup

# 2. Start PostgreSQL
docker-compose up -d

# 3. Initialize database
npm run db:init

# 4. (Optional) Load all data - takes 2-4 hours
npm run etl:all

# 5. Start dev servers
npm run dev
```

**Backend**: http://localhost:3000  
**Frontend**: http://localhost:5173

## Known Data Limitations

### Players Without Country Data
Some players in the lineup data do not have country information and were skipped during ETL:
- Player IDs: 26647, 397900, 397843, 397844, 398858, 398868, 398869

### Corrupt 360 Frames Files
3 out of 326 360 tracking files are corrupt and were skipped:
- `3835338.json` - Invalid JSON syntax
- `3835342.json` - Malformed array (line 171856)
- `3845506.json` - Malformed object (line 92794)

**Success Rate**: 99.1% of 360 data loaded successfully.

## Documentation

Detailed documentation available in the project:
- `backend/EVENTS_ETL_PLAN.md` - Events ETL strategy

## Available Scripts

```bash
# Setup
npm run setup            # Install all dependencies (root + backend + frontend)

# Development
npm run dev              # Run both backend + frontend
npm run dev:backend      # Run backend only
npm run dev:frontend     # Run frontend only

# Database
npm run db:init          # Run migrations + seed lookup tables
npm run etl:all          # Load ALL data (2-4 hours)

# Build
npm run build            # Build backend + frontend for production
```

### Individual ETL Scripts (from backend/)
```bash
npm run etl:matches      # Load matches + teams + stadiums
npm run etl:competitions # Load competitions + seasons
npm run etl:lineups      # Load players + lineups
npm run etl:360          # Load 360 tracking data
npm run etl:events       # Load all events (2-3 hours)
```

## License

This project uses StatsBomb Open Data, which is available under their [Open Data License](backend/football-open/LICENSE.pdf)

