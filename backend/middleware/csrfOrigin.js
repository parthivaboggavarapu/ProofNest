const AppError = require("../utils/AppError");

const STATE_CHANGING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const FETCH_METADATA_HEADERS = [
  "sec-fetch-site",
  "sec-fetch-mode",
  "sec-fetch-dest",
];

const isTrustedOrigin = (origin, trustedOrigin) => {
  if (
    typeof origin !== "string" ||
    origin.trim() === "" ||
    origin !== origin.trim() ||
    origin === "null"
  ) {
    return false;
  }

  try {
    const parsedOrigin = new URL(origin);
    const validProtocol =
      parsedOrigin.protocol === "http:" || parsedOrigin.protocol === "https:";
    const isOriginOnly =
      parsedOrigin.username === "" &&
      parsedOrigin.password === "" &&
      (parsedOrigin.pathname === "/" || parsedOrigin.pathname === "") &&
      parsedOrigin.search === "" &&
      parsedOrigin.hash === "";
    return validProtocol && isOriginOnly && parsedOrigin.origin === trustedOrigin;
  } catch {
    return false;
  }
};

const isOriginlessNonBrowserRequest = (req, sessionCookieName) => {
  if (hasSessionCookie(req, sessionCookieName)) {
    return false;
  }

  if (FETCH_METADATA_HEADERS.some((header) => req.get(header) !== undefined)) {
    return false;
  }

  const contentType = (req.get("content-type") || "").split(";")[0].trim();
  return contentType.toLowerCase() === "application/json";
};

const hasSessionCookie = (req, sessionCookieName) => {
  const cookieHeader = req.get("cookie");
  if (!cookieHeader) {
    return false;
  }

  return cookieHeader.split(";").some((cookie) => {
    const separator = cookie.indexOf("=");
    return (
      separator !== -1 &&
      cookie.slice(0, separator).trim() === sessionCookieName
    );
  });
};

const createCsrfOriginGuard = (
  trustedOrigin,
  sessionCookieName = "proofnest.sid"
) => (req, res, next) => {
  if (!STATE_CHANGING_METHODS.has(req.method)) {
    return next();
  }

  const origin = req.get("origin");
  if (origin !== undefined) {
    if (isTrustedOrigin(origin, trustedOrigin)) {
      return next();
    }
    return next(
      new AppError("Request origin is not allowed", 403, "CSRF_ORIGIN_FORBIDDEN")
    );
  }

  if (isOriginlessNonBrowserRequest(req, sessionCookieName)) {
    return next();
  }
  return next(
    new AppError(
      "Origin is required for browser state-changing requests",
      403,
      "CSRF_ORIGIN_REQUIRED"
    )
  );
};

module.exports = { createCsrfOriginGuard, isTrustedOrigin };
