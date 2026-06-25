const MAX_BODY_BYTES = 64 * 1024;

function parseCookies(header) {
  const out = {};
  if (!header) return out;
  header.split(";").forEach((part) => {
    const [k, ...rest] = part.trim().split("=");
    if (k) out[k] = decodeURIComponent(rest.join("="));
  });
  return out;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;

    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new Error("BODY_TOO_LARGE"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });

    req.on("end", () => {
      try {
        const raw = Buffer.concat(chunks).toString("utf8");
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        reject(new Error("INVALID_JSON"));
      }
    });

    req.on("error", reject);
  });
}

function sendJson(res, status, data, extraHeaders = {}) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    ...extraHeaders
  });
  res.end(JSON.stringify(data));
}

function setSessionCookie(res, token, expires) {
  const maxAge = Math.floor((expires.getTime() - Date.now()) / 1000);
  res.setHeader(
    "Set-Cookie",
    `session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`
  );
}

function clearSessionCookie(res) {
  res.setHeader("Set-Cookie", "session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0");
}

function wantsJson(req) {
  const method = req.method || "GET";
  return method === "POST" || method === "PUT" || method === "PATCH" || method === "DELETE";
}

function hasJsonBody(req) {
  const type = String(req.headers["content-type"] || "").toLowerCase();
  return type.includes("application/json");
}

module.exports = {
  parseCookies,
  readBody,
  sendJson,
  setSessionCookie,
  clearSessionCookie,
  wantsJson,
  hasJsonBody
};
