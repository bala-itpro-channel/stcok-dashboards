import "dotenv/config";
import cors from "cors";
import express from "express";
import helmet from "helmet";

const DEFAULT_SYMBOLS = "AAPL,MSFT,GOOGL,AMZN";
const app = express();

function isNewYorkMarketOpen() {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
      .formatToParts(new Date())
      .map(({ type, value }) => [type, value]),
  );
  const weekday = ["Mon", "Tue", "Wed", "Thu", "Fri"].includes(parts.weekday);
  const minutes = Number(parts.hour) * 60 + Number(parts.minute);

  return weekday && minutes >= 9 * 60 + 30 && minutes < 16 * 60;
}

app.use(helmet());
app.use(cors());
app.use(express.json());

app.get("/api/health", (_request, response) => {
  response.json({
    status: "ok",
    service: "stock-dashboard-api",
    timestamp: new Date().toISOString(),
  });
});

app.get("/api/quotes", async (request, response) => {
  const apiKey = process.env.TWELVE_DATA_API_KEY;
  const requestedSymbols = request.query.symbols;
  const symbols = String(
    requestedSymbols === undefined ? DEFAULT_SYMBOLS : requestedSymbols,
  )
    .split(",")
    .map((symbol) => symbol.trim().toUpperCase())
    .filter(Boolean);

  if (!apiKey) {
    return response.status(500).json({
      error: "TWELVE_DATA_API_KEY is not configured",
    });
  }

  if (symbols.length === 0) {
    return response.status(400).json({
      error: "At least one stock symbol is required",
    });
  }

  console.log(
    "isNewYorkMarketOpen:",
    isNewYorkMarketOpen(),
    "symbols:",
    symbols,
  );

  if (!isNewYorkMarketOpen()) {
    return response.status(400).json({
      error:
        "The New York Stock Exchange is closed. Quotes are available Monday through Friday, 9:30 AM to 4:00 PM Eastern Time.",
    });
    // return response.status(200).json({
    //   marketClosed: true,
    //   message:
    //     "The New York Stock Exchange is closed. Quotes are available Monday through Friday, 9:30 AM to 4:00 PM Eastern Time.",
    // });
  }

  const params = new URLSearchParams({
    symbol: symbols.join(","),
    apikey: apiKey,
  });

  try {
    const apiResponse = await fetch(
      `https://api.twelvedata.com/quote?${params.toString()}`,
    );
    const data = await apiResponse.json();

    if (!apiResponse.ok || data.status === "error") {
      return response.status(apiResponse.ok ? 502 : apiResponse.status).json({
        error: data.message || "Twelve Data request failed",
      });
    }

    return response.json(data);
  } catch (error) {
    return response.status(502).json({
      error: "Unable to fetch stock quotes",
      details: error.message,
    });
  }
});

app.use((_request, response) => {
  response.status(404).json({ error: "Route not found" });
});

export default app;
