import http from "http";
import { getConfig } from "./config";
import { handleEngineRequest } from "./adapterController";
import type { EngineRequest, EngineResponse } from "./types";

function readRequestBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        // 1MB limit
        reject(new Error("Request body too large"));
      }
    });
    req.on("end", () => resolve(body));
    req.on("error", (err) => reject(err));
  });
}

const config = getConfig();

const CORS_HEADERS: http.OutgoingHttpHeaders = {
  // Allow Viewer on 4002 (and 4001/8080 if needed).
  // For development, we can use "*" or reflect the origin.
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const server = http.createServer(async (req, res) => {
  const url = req.url || "/";
  const method = req.method || "GET";

  // CORS preflight для /engine
  if (method === "OPTIONS" && url.startsWith("/engine")) {
    res.writeHead(204, CORS_HEADERS);
    res.end();
    return;
  }

  if (method === "POST" && url.startsWith("/engine")) {
    try {
      const rawBody = await readRequestBody(req);
      let parsed: unknown;
      try {
        parsed = rawBody ? JSON.parse(rawBody) : {};
      } catch (err) {
        const response: EngineResponse = {
          type: "error",
          requestType: "parse",
          message: "Invalid JSON payload.",
          error: {
            code: "invalid-json",
            details: String(err),
          },
        };
        res.writeHead(400, {
          "Content-Type": "application/json",
          ...CORS_HEADERS,
        });
        res.end(JSON.stringify(response));
        return;
      }

      const engineRequest = parsed as EngineRequest;
      const engineResponse = await handleEngineRequest(engineRequest);

      res.writeHead(200, {
        "Content-Type": "application/json",
        ...CORS_HEADERS,
      });
      res.end(JSON.stringify(engineResponse));
    } catch (err) {
      const response: EngineResponse = {
        type: "error",
        requestType: "parse",
        message: "Unhandled adapter error.",
        error: {
          code: "adapter-unhandled-error",
          details: String(err),
        },
      };
      res.writeHead(500, {
        "Content-Type": "application/json",
        ...CORS_HEADERS,
      });
      res.end(JSON.stringify(response));
    }
    return;
  }

  if (method === "GET" && url === "/health") {
    res.writeHead(200, {
      "Content-Type": "text/plain",
      ...CORS_HEADERS,
    });
    res.end("ok");
    return;
  }

  res.writeHead(404, {
    "Content-Type": "text/plain",
    ...CORS_HEADERS,
  });
  res.end("Not found");
});

server.listen(config.port, () => {
  // eslint-disable-next-line no-console
  console.log(
    `[EngineAdapter] Listening on http://localhost:${config.port}/engine`,
  );
});
