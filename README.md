# Stock Dashboard

A full-stack stock dashboard with:

- A Node.js and Express backend that proxies quote requests to Twelve Data.
- An Angular frontend for entering comma-separated symbols.
- Grouped bar charts for previous close, open, and current price.
- A table sorted by profit with day high, day low, volume, profit, and percentage gain/loss.
- Trend colors for each symbol: green, blue, or red.
- Local storage persistence for the latest symbol list.
- New York market-hours protection so the backend does not call Twelve Data while the market is closed.

## Project Structure

```text
stock-dashboard/
├── src/                    # Node.js API
│   ├── app.js              # Express app and API routes
│   └── server.js           # API process entry point
├── test/                   # Backend tests
├── frontend/               # Angular application
│   └── src/app/dashboard/  # Dashboard screen and chart/table UI
├── .env.example            # Backend configuration template
└── package.json            # Backend scripts and dependencies
```

## Prerequisites

- Node.js 22 or later. Node.js 26 is also supported.
- npm 10 or later.
- A Twelve Data API key from <https://twelvedata.com/>.

Check the installed versions:

```powershell
node --version
npm --version
```

## Backend Setup

Open a terminal at the repository root:

```powershell
Set-Location C:\projects\stock-dashboard
npm install
Copy-Item .env.example .env
```

Open `.env` and set your Twelve Data key:

```dotenv
PORT=3000
TWELVE_DATA_API_KEY=your_twelve_data_api_key
```

Keep `.env` private. It is ignored by Git and must not be committed.

### Start the Backend

```powershell
npm run app
```

The API listens at `http://localhost:3000`.

For automatic restart during backend development:

```powershell
npm run dev
```

### Backend Endpoints

Health check:

```http
GET http://localhost:3000/api/health
```

Stock quotes:

```http
GET http://localhost:3000/api/quotes?symbols=AAPL,MSFT,GOOGL
```

The `symbols` query parameter accepts comma-separated ticker symbols. If omitted, the backend uses `AAPL,MSFT,GOOGL,AMZN`.

The quotes endpoint only calls Twelve Data Monday-Friday, 9:30 AM-4:00 PM Eastern Time. Outside those hours it returns:

```json
{
  "marketClosed": true,
  "message": "The New York Stock Exchange is closed. Quotes are available Monday through Friday, 9:30 AM to 4:00 PM Eastern Time."
}
```

The current implementation checks weekday and time, but does not account for exchange holidays.

### Backend Tests

```powershell
node --check src/app.js
npm test
```

## Frontend Setup

Open a second terminal at the frontend folder:

```powershell
Set-Location C:\projects\stock-dashboard\frontend
npm install
```

### Start the Frontend

```powershell
npm start -- --host 0.0.0.0 --port 4200
```

Open the dashboard at `http://localhost:4200/dashboard`. The root route redirects to `/dashboard`.

The backend and frontend must run at the same time. Start the backend first, then start the frontend in a second terminal.

### Frontend Structure

The Angular application uses standalone components and the Angular router:

```text
frontend/
├── src/
│   ├── main.ts                         # Angular bootstrap entry point
│   ├── styles.css                      # Global page styles and fonts
│   └── app/
│       ├── app.ts                       # Application shell
│       ├── app.config.ts                # Router and HttpClient providers
│       ├── app.routes.ts                # Route definitions
│       └── dashboard/
│           ├── dashboard.ts             # Dashboard state and API calls
│           ├── dashboard.html           # Input, chart, status note, and table
│           └── dashboard.css            # Dashboard-specific responsive styles
├── angular.json                         # Angular CLI configuration
└── package.json                         # Frontend scripts and dependencies
```

The application shell renders a `router-outlet`. The `/` route redirects to `/dashboard`, where the dashboard component is loaded.

### Frontend Request Flow

1. The dashboard initializes the symbols input from browser local storage.
2. If no stored value exists, it uses `AAPL, MSFT, GOOGL, AMZN`.
3. Typing in the input saves the latest non-empty value under the `stock-dashboard-symbols` local-storage key.
4. Selecting **Fetch prices** or pressing Enter normalizes the symbols to uppercase and removes empty values.
5. Angular sends a request to `http://localhost:3000/api/quotes?symbols=...`.
6. The backend checks New York market hours before calling Twelve Data.
7. The response is converted into numeric quote records for the chart and table.
8. Rows and chart groups are sorted by profit, calculated as current price minus previous close.

### Frontend States

The dashboard displays different states during the request lifecycle:

- Initial state: shows the symbol form and an empty-state message.
- Loading state: disables the fetch button and displays a loading message.
- Success state: displays the chart and quote table.
- Empty input: asks the user to enter at least one comma-separated symbol.
- API error: displays the backend error message.
- Closed market: displays the market-closed message returned by the backend.

### Chart and Table Details

The chart renders three bars for each symbol:

- Previous close
- Open price
- Current price

The chart uses a responsive CSS grid. Symbol groups wrap into additional rows on smaller screens while keeping the three bars together.

The table is horizontally scrollable on narrow screens and includes:

- Symbol
- Previous close
- Open
- Day high
- Day low
- Current price
- Volume
- Profit
- Percentage gain/loss

Profit is calculated as `current price - previous close`. Percentage gain/loss is calculated as `(profit / previous close) * 100`.

### Frontend Development Commands

Run the development server with automatic rebuilds:

```powershell
npm start -- --host 0.0.0.0 --port 4200
```

Create a production build:

```powershell
npm run build
```

Run the Angular test suite:

```powershell
npm test
```

Run Angular CLI commands through the local project installation:

```powershell
npm run ng -- generate component component-name
npm run ng -- generate service services/quote
```

After changing frontend source files, the development server rebuilds automatically. After changing the backend `.env` file, restart the backend process.

### Use the Dashboard

1. Enter symbols separated by commas, for example `AAPL, MSFT, GOOGL, AMZN`.
2. Select **Fetch prices** or press Enter.
3. Review the grouped bars for previous close, open, and current price.
4. Review the table, sorted by profit from highest to lowest.
5. The table includes previous close, open, day high, day low, current price, volume, profit, and percentage gain/loss.
6. The latest non-empty symbol list is saved in browser local storage and restored on the next visit.

### Trend Status Colors

- **Green**: open and current price are above previous close.
- **Blue**: current price is below open but above previous close.
- **Red**: current price is below previous close.

### Frontend Build and Tests

```powershell
npm run build
npm test
```

Production output is written to `frontend/dist/frontend`.

## Complete Local Run

Use two PowerShell terminals.

Terminal 1, backend:

```powershell
Set-Location C:\projects\stock-dashboard
npm run app
```

Terminal 2, frontend:

```powershell
Set-Location C:\projects\stock-dashboard\frontend
npm start -- --host 0.0.0.0 --port 4200
```

Then open `http://localhost:4200/dashboard`.

## Troubleshooting

### The page says the market is closed

This is expected outside Monday-Friday, 9:30 AM-4:00 PM Eastern Time. The backend intentionally avoids spending Twelve Data API requests while the market is closed.

### The page cannot connect to the API

Confirm that the backend is running at `http://localhost:3000` and the frontend is running at `http://localhost:4200`.

### The API key is missing

Confirm `.env` exists in the repository root and contains:

```dotenv
TWELVE_DATA_API_KEY=your_twelve_data_api_key
```

Restart the backend after changing `.env`.

### Dependencies are incomplete

Run `npm install` in the relevant folder:

```powershell
# Backend
Set-Location C:\projects\stock-dashboard
npm install

# Frontend
Set-Location C:\projects\stock-dashboard\frontend
npm install
```

## Frontend Screenshot

The frontend screen is the `/dashboard` view with the symbol input, fetch button, market-status message, chart, trend note, and quote table.

The screenshot supplied during development was available in the conversation but was not available as a workspace image file to embed in Markdown. To add it to the repository, save it as:

```text
docs/screenshots/frontend-dashboard.png
```

Then add this Markdown:

```markdown
![Stock dashboard frontend](docs/screenshots/frontend-dashboard.png)
```
