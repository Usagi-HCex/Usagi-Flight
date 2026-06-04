const BOOKMARK_COOKIE_NAME = "flight_d1_bookmark";
const LEGACY_BOOKMARK_COOKIE_NAME = "d1_bookmark";
const BOOKMARK_MAX_AGE_SECONDS = 60 * 60 * 24; // 24 hours

function getCookieValue(request, name) {
  const cookieHeader = request.headers.get("Cookie") || "";
  const cookies = cookieHeader.split(";").map((item) => item.trim());

  for (const cookie of cookies) {
    const [key, ...rest] = cookie.split("=");

    if (key === name) {
      return decodeURIComponent(rest.join("="));
    }
  }

  return "";
}

function extractBookmark(rawBookmark) {
  if (!rawBookmark) {
    return "";
  }

  if (typeof rawBookmark === "string") {
    return rawBookmark;
  }

  if (typeof rawBookmark === "object" && typeof rawBookmark.bookmark === "string") {
    return rawBookmark.bookmark;
  }

  return "";
}

function shouldResetSession(request) {
  const url = new URL(request.url);
  return url.searchParams.get("reset_d1_session") === "1";
}

function buildBookmarkCookie(request, bookmark) {
  const url = new URL(request.url);

  const parts = [
    `${BOOKMARK_COOKIE_NAME}=${encodeURIComponent(bookmark)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${BOOKMARK_MAX_AGE_SECONDS}`
  ];

  if (url.protocol === "https:") {
    parts.push("Secure");
  }

  return parts.join("; ");
}

function buildExpiredCookie(request, name) {
  const url = new URL(request.url);

  const parts = [
    `${name}=`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=0"
  ];

  if (url.protocol === "https:") {
    parts.push("Secure");
  }

  return parts.join("; ");
}

export function createD1Session(context, mode = "default") {
  const request = context.request;
  const resetSession = shouldResetSession(request);

  let sessionStart;

  if (mode === "primary") {
    sessionStart = "first-primary";
  } else if (resetSession) {
    sessionStart = "first-unconstrained";
  } else {
    sessionStart =
      getCookieValue(request, BOOKMARK_COOKIE_NAME) ||
      "first-unconstrained";
  }

  const session = context.env.DB.withSession(sessionStart);

  return {
    session,
    sessionStart,
    resetSession,

    applyBookmark(response) {
      const bookmark = extractBookmark(session.getBookmark());

      if (bookmark) {
        response.headers.set("x-d1-bookmark", bookmark);
        response.headers.append(
          "Set-Cookie",
          buildBookmarkCookie(request, bookmark)
        );
      }

      if (resetSession) {
        response.headers.append(
          "Set-Cookie",
          buildExpiredCookie(request, LEGACY_BOOKMARK_COOKIE_NAME)
        );
      }

      return response;
    }
  };
}

export function jsonWithSession(data, status = 200, d1SessionContext) {
  const response = new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=UTF-8",
      "cache-control": "no-store"
    }
  });

  return d1SessionContext.applyBookmark(response);
}