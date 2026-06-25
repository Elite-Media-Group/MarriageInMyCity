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
    return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  let payload = {};
  try {
    payload = JSON.parse(event.body || "{}");
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "Invalid JSON." }) };
  }

  /*
    Production wiring options:

    Option A: Supabase
    - Store user by email
    - Store bridal_blueprint by user_id
    - Store notes, registries, vendors, reminders, conversations

    Option B: Netlify Identity
    - Use Netlify Identity for auth
    - Store blueprint objects in Supabase / Fauna / Neon

    Option C: Magic Link
    - Email one-time link to continue Bridal Blueprint
    - Recommended MVP for low-friction wedding planning
  */

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      ok: true,
      message: "Prototype account accepted. Connect this function to Supabase or your preferred database.",
      received: {
        email: payload?.account?.email || null,
        mode: payload?.mode || null
      }
    })
  };
}
