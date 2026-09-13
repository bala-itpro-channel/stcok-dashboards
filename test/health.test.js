import assert from "node:assert/strict";
import test from "node:test";
import app from "../src/app.js";

test("health endpoint returns an operational response", async () => {
  const server = app.listen(0);
  const { port } = server.address();

  try {
    const response = await fetch(`http://localhost:${port}/api/health`);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.status, "ok");
    assert.equal(body.service, "stock-dashboard-api");
    assert.ok(body.timestamp);
  } finally {
    server.close();
  }
});

test("quotes endpoint rejects an empty symbols query", async () => {
  const server = app.listen(0);
  const { port } = server.address();

  try {
    const response = await fetch(
      `http://localhost:${port}/api/quotes?symbols=`,
    );
    const body = await response.json();

    assert.equal(response.status, 400);
    assert.equal(body.error, "At least one stock symbol is required");
  } finally {
    server.close();
  }
});
