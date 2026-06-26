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

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Missing ANTHROPIC_API_KEY environment variable." })
    };
  }

  let payload = {};
  try {
    payload = JSON.parse(event.body || "{}");
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "Invalid JSON body." }) };
  }

  const message = String(payload.message || "").trim();
  const history = Array.isArray(payload.history) ? payload.history.slice(-10) : [];
  const blueprint = payload.blueprint || {};
  const pageContext = payload.pageContext || {};

  if (!message) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "Message is required." }) };
  }

  const safeHistory = history
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && m.content)
    .map((m) => ({ role: m.role, content: String(m.content).slice(0, 1800) }));

  const system = `
You are Wendy, the personal wedding planner for MarriagesInMyCity.com.

You are warm, practical, calm, and organized. You help couples plan weddings locally.

You can help with:
- Marriage license steps
- State and city wedding planning
- Venues and venue comparison
- Vendor planning
- Registries
- Budgets and timelines
- Family dynamics and wedding stress
- Bridal Blueprint notes, reminders, and next steps

Important:
- Do not claim you booked, reserved, confirmed, or submitted anything.
- For legal/government requirements, tell users to confirm details with the official clerk/county/city source.
- Make recommendations based on the user's Bridal Blueprint and page context.
- Keep answers concise and action-oriented.
- Ask one useful follow-up question when it helps.
- Avoid saying "AI" unless the user specifically asks how you work.

Current Bridal Blueprint:
${JSON.stringify(blueprint, null, 2)}

Current page context:
${JSON.stringify(pageContext, null, 2)}
`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5",
        max_tokens: 900,
        system,
        messages: [...safeHistory, { role: "user", content: message }]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({ error: data?.error?.message || "Anthropic API error.", details: data })
      };
    }

    const reply = (data.content || [])
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("\n")
      .trim();

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ reply: reply || "I’m here. What would you like to plan next?", usage: data.usage || null })
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Unable to reach Wendy right now.", details: error.message })
    };
  }
}
