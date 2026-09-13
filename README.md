# Stock Dashboard API

A small Node.js and Express API for the stock dashboard.

## Setup

```powershell
npm install
Copy-Item .env.example .env
```

## Run

```powershell
npm run dev
```

The API runs on `http://localhost:3000` by default.

## Endpoint

`GET /api/health` returns the service status and a timestamp.

## Test

```powershell
npm test
```
