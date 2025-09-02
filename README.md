# NBA Data and Analytics Application

A full-stack NBA analytics platform with real-time data pipeline and custom report generation.

## 🏀 Features

- **Real-time NBA Data Pipeline**: Automated extraction of games, player stats, team data, and career statistics from NBA API
- **Advanced Analytics**: Traditional and advanced basketball metrics with historical data
- **Custom Reports**: Generate detailed analytics and insights with filtering and visualization
- **Live Dashboard**: React-based interface with interactive charts and responsive design

## 🚀 Quick Start

**Prerequisites:** Docker Desktop

```bash
# 1. Start database
docker compose up -d postgres

# 2. Setup database schema  
docker compose --profile setup run --rm backend-setup

# 3. Load NBA data (teams, players, recent games)
docker compose --profile etl run --rm etl python nba_pipeline.py setup
docker compose --profile etl run --rm etl python nba_pipeline.py load 2025-01-15

# 4. Start application
docker compose up backend frontend
```

**Access:** Frontend at http://localhost:3000, API at http://localhost:3001

## 📊 ETL Pipeline Commands

```bash
# Load specific date
docker compose --profile etl run --rm etl python nba_pipeline.py load 2025-01-15

# Load date range  
docker compose --profile etl run --rm etl python nba_pipeline.py load 2025-01-10 to 2025-01-15

# Load career statistics
docker compose --profile etl run --rm etl python nba_pipeline.py load-career-active
```

## 🛠️ Tech Stack

**Data Pipeline:** Python, NBA API, PostgreSQL, Advanced statistical parsing  
**Backend:** Node.js, Express, JWT Authentication  
**Frontend:** React, Tailwind CSS, Recharts visualization  
**Infrastructure:** Docker, Hot reloading development environment

## 📁 Project Structure

```
├── data-pipeline/     # Python NBA data extraction and processing
├── backend/          # Express API with authentication
├── frontend/         # React dashboard and analytics UI
└── docker-compose.yml
```

## ⚙️ Environment Setup

Copy `.env.example` files in each directory and configure:
- Backend: Database connection, JWT secrets
- Frontend: API URL configuration  
- ETL: NBA API and database settings

## 🎯 Data Coverage

- **30 NBA Teams**: Complete roster and team statistics
- **450+ Active Players**: Career stats, advanced metrics, rankings
- **Game Data**: Traditional box scores, advanced analytics, play-by-play
- **Historical Data**: Multi-season career totals and comparative rankings

---