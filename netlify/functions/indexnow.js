// netlify/functions/indexnow.js
//
// Reusable IndexNow submission helper for Marriages In My City.
//
// What it does:
//   Accepts a POST with one or more URLs and submits them to the IndexNow API
//   (Bing, Yandex, Seznam, etc.) so search engines are notified of new/updated
//   pages immediately after deployment.
//
// Why this is safe to include in this repo:
//   The IndexNow key is PUBLIC by design - it is served openly at
//   https://marriageinmycity.com/40653ca279e4493baec2a4873bcff038.txt
//   so there is no secret to leak. The key below can be overridden with an
//   INDEXNOW_KEY environment variable if it is ever rotated.
//
// Manual fallback (if this function is not deployed/enabled):
//   curl -X POST https://api.indexnow.org/indexnow \
//     -H "Content-Type: application/json" \
//     -d '{"host":"marriageinmycity.com",
//          "key":"40653ca279e4493baec2a4873bcff038",
//          "keyLocation":"https://marriageinmycity.com/40653ca279e4493baec2a4873bcff038.txt",
//          "urlList":["https://marriageinmycity.com/engagement-planner.html"]}'

const HOST = process.env.INDEXNOW_HOST || "marriageinmycity.com";
const KEY = process.env.INDEXNOW_KEY || "40653ca279e4493baec2a4873bcff038";
const KEY_LOCATION =
  process.env.INDEXNOW_KEY_LOCATION ||
  `https://${HOST}/${KEY}.txt`;

export async function handler(event) {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json"
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Method not allowed. Use POST." })
    };
  }

  let urlList = [];
  try {
    const payload = JSON.parse(event.body || "{}");
    if (Array.isArray(payload.urls)) urlList = payload.urls;
    else if (typeof payload.url === "string") urlList = [payload.url];
  } catch (err) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: "Invalid JSON body." })
    };
  }

  // Only allow URLs that belong to this host, and cap the batch size.
  urlList = urlList
    .filter((u) => typeof u === "string" && u.indexOf(`//${HOST}`) !== -1)
    .slice(0, 10000);

  if (urlList.length === 0) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        error: `No valid URLs for host ${HOST}. Provide { "urls": ["https://${HOST}/page.html"] }.`
      })
    };
  }

  const body = {
    host: HOST,
    key: KEY,
    keyLocation: KEY_LOCATION,
    urlList
  };

  try {
    const res = await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify(body)
    });
    const text = await res.text();
    return {
      statusCode: res.ok ? 200 : 502,
      headers,
      body: JSON.stringify({
        submitted: urlList.length,
        indexNowStatus: res.status,
        indexNowResponse: text || null
      })
    };
  } catch (err) {
    return {
      statusCode: 502,
      headers,
      body: JSON.stringify({
        error: "Failed to reach IndexNow API.",
        detail: String(err && err.message ? err.message : err)
      })
    };
  }
}
