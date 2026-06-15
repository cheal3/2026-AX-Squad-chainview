const BACKEND_ORIGIN = "http://chainview.kro.kr:8080";
const PROXY_PREFIX = "/chainview-api";

export default {
  async fetch(request) {
    const origin = request.headers.get("Origin") ?? "";

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(origin),
      });
    }

    const requestUrl = new URL(request.url);
    const backendUrl = new URL(BACKEND_ORIGIN);
    backendUrl.pathname = requestUrl.pathname.startsWith(PROXY_PREFIX)
      ? requestUrl.pathname.slice(PROXY_PREFIX.length) || "/"
      : requestUrl.pathname;
    backendUrl.search = requestUrl.search;

    const headers = new Headers(request.headers);
    headers.delete("Origin");

    const backendResponse = await fetch(backendUrl, {
      method: request.method,
      headers,
      body:
        request.method === "GET" || request.method === "HEAD"
          ? undefined
          : request.body,
      redirect: "manual",
    });

    const responseHeaders = new Headers(backendResponse.headers);
    Object.entries(corsHeaders(origin)).forEach(([key, value]) => {
      responseHeaders.set(key, value);
    });
    rewriteLocationHeader(responseHeaders, requestUrl.origin);
    rewriteCookieHeaders(responseHeaders);

    return new Response(backendResponse.body, {
      status: backendResponse.status,
      statusText: backendResponse.statusText,
      headers: responseHeaders,
    });
  },
};

function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Headers":
      "Content-Type, X-CSRF-TOKEN, Accept, Authorization",
    "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    Vary: "Origin",
  };
}

function rewriteLocationHeader(headers, proxyOrigin) {
  const location = headers.get("Location");
  if (!location) {
    return;
  }

  headers.set("Location", location.replace(BACKEND_ORIGIN, proxyOrigin));
}

function rewriteCookieHeaders(headers) {
  const getSetCookie = headers.getSetCookie?.bind(headers);
  const cookies = getSetCookie ? getSetCookie() : [];

  if (!cookies.length) {
    const cookie = headers.get("Set-Cookie");
    if (cookie) {
      headers.set("Set-Cookie", withCrossSiteCookieAttrs(cookie));
    }
    return;
  }

  headers.delete("Set-Cookie");
  cookies.forEach((cookie) => {
    headers.append("Set-Cookie", withCrossSiteCookieAttrs(cookie));
  });
}

function withCrossSiteCookieAttrs(cookie) {
  return cookie
    .replace(/;\s*Domain=[^;]*/gi, "")
    .replace(/;\s*SameSite=[^;]*/gi, "")
    .replace(/;\s*Secure/gi, "")
    .concat("; SameSite=None; Secure");
}
