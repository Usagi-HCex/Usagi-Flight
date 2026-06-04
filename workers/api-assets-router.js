import {
  onRequestGet as getFlights,
  onRequestPost as createFlight
} from "../functions/api/flights.js";
import {
  onRequestGet as getFlight,
  onRequestPut as updateFlight,
  onRequestDelete as deleteFlight
} from "../functions/api/flight.js";
import { onRequestGet as exportFlights } from "../functions/api/export_flights.js";
import { onRequestGet as getFlightMapSummary } from "../functions/api/flight_map_summary.js";
import { onRequestPost as importFlights } from "../functions/api/import_flights.js";

const API_ROUTES = new Map([
  ["GET /api/flights", getFlights],
  ["POST /api/flights", createFlight],
  ["GET /api/flight", getFlight],
  ["PUT /api/flight", updateFlight],
  ["DELETE /api/flight", deleteFlight],
  ["GET /api/export_flights", exportFlights],
  ["GET /api/flight_map_summary", getFlightMapSummary],
  ["POST /api/import_flights", importFlights]
]);

function normalizePath(pathname) {
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.replace(/\/+$/, "");
  }
  return pathname;
}

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=UTF-8",
      "cache-control": "no-store",
      ...headers
    }
  });
}

function createPagesContext(request, env, ctx) {
  return {
    request,
    env,
    params: {},
    data: {},
    waitUntil: ctx.waitUntil.bind(ctx),
    passThroughOnException: () => {
      if (typeof ctx.passThroughOnException === "function") {
        ctx.passThroughOnException();
      }
    }
  };
}

function allowedMethods(pathname) {
  const methods = [];

  for (const key of API_ROUTES.keys()) {
    const [method, routePath] = key.split(" ");
    if (routePath === pathname) methods.push(method);
  }

  return methods;
}

async function handleApiRequest(request, env, ctx) {
  const url = new URL(request.url);
  const pathname = normalizePath(url.pathname);

  if (request.method === "OPTIONS") {
    const methods = allowedMethods(pathname);
    return new Response(null, {
      status: methods.length ? 204 : 404,
      headers: {
        allow: methods.join(", ")
      }
    });
  }

  const handler = API_ROUTES.get(`${request.method} ${pathname}`);
  if (!handler) {
    const methods = allowedMethods(pathname);
    if (methods.length) {
      return json(
        { ok: false, error: "Method not allowed" },
        405,
        { allow: methods.join(", ") }
      );
    }

    return json({ ok: false, error: "API route not found" }, 404);
  }

  return handler(createPagesContext(request, env, ctx));
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === "/api" || url.pathname.startsWith("/api/")) {
      return handleApiRequest(request, env, ctx);
    }

    if (typeof env?.ASSETS?.fetch !== "function") {
      return new Response("Workers ASSETS binding is not configured.", {
        status: 500,
        headers: {
          "content-type": "text/plain; charset=UTF-8",
          "cache-control": "no-store"
        }
      });
    }

    return env.ASSETS.fetch(request);
  }
};
