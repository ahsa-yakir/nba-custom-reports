# NBA Analytics App

A full-stack application for generating custom NBA reports with real-time data analysis.

## 🏗️ Project Structure

```
nba-analytics-app/
├── frontend/          # React application
│   ├── src/
│   │   ├── components/
│   │   ├── services/
│   │   └── utils/
│   └── package.json
├── backend/           # Express API server
│   ├── src/
│   │   ├── routes/
│   │   ├── config/
│   │   └── utils/
│   ├── migrations/
│   └── package.json
└── package.json       # Root package.json
```

## 🚀 Quick Start

1. **Install all dependencies:**
   ```bash
   npm run install:all
   ```

2. **Set up environment variables:**
   ```bash
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env
   ```

3. **Start development servers:**
   ```bash
   npm run dev
   ```

4. **Access the application:**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001

## 📋 Available Scripts

- `npm run dev` - Start both frontend and backend
- `npm run dev:frontend` - Start only React app
- `npm run dev:backend` - Start only Express server
- `npm run build` - Build frontend for production
- `npm run install:all` - Install dependencies for all packages

## 🗄️ Database Setup

1. Create PostgreSQL database
2. Run migrations: `cd backend && npm run migrate`
3. Seed data: `cd backend && npm run seed`

## 🔧 Environment Variables

### Backend (.env)
```
DATABASE_URL=postgresql://username:password@localhost:5432/nba_analytics
PORT=3001
NODE_ENV=development
```

### Frontend (.env)
```
REACT_APP_API_URL=http://localhost:3001
```

## 🏀 Features

- Custom NBA report generation
- Real-time player and team statistics
- Advanced filtering and sorting
- Interactive data visualization
- Responsive design

## 🛠️ Tech Stack

**Frontend:**
- React 19
- Tailwind CSS
- Lucide React Icons
- Recharts
- Axios

**Backend:**
- Node.js
- Express
- PostgreSQL
- CORS

## 📝 API Endpoints

- `GET /health` - Health check
- `GET /api/reports/test` - Database connection test
- `GET /api/reports/teams` - Get all teams
- `POST /api/reports/generate` - Generate custom report

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.
