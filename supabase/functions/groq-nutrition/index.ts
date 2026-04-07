import "@supabase/functions-js/edge-runtime.d.ts";

const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");

const SYSTEM_PROMPT = `You are a nutrition calculator. The user will describe a meal. Return a JSON array of food items with estimated macros.

Rules:
- Return ONLY valid JSON, no extra text
- Each item: { "name": string, "calories": number, "protein": number, "carbs": number, "fat": number, "serving": string }
- "serving" is a short human-readable quantity for ONE entry (e.g. "1 cup", "6 oz", "1 medium", "2 slices", "1 can")
- Macros should reflect exactly the quantity described by the user (not just 1 serving)
- If user says a quantity (e.g. "two beers"), create that many entries or one entry with the total
- Use realistic estimates based on standard serving sizes
- Round all numbers to whole integers

Example input: "cheeseburger, fries, and two Guinness"
Example output:
[
  { "name": "Cheeseburger", "calories": 550, "protein": 35, "carbs": 40, "fat": 28, "serving": "1 burger" },
  { "name": "French Fries", "calories": 365, "protein": 4, "carbs": 48, "fat": 17, "serving": "medium" },
  { "name": "Guinness (x2)", "calories": 250, "protein": 2, "carbs": 20, "fat": 0, "serving": "2 cans" }
]`;

Deno.serve(async (req) => {
  // Handle CORS for browser requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey",
      },
    });
  }

  try {
    const { meal } = await req.json();

    if (!meal || typeof meal !== "string") {
      return new Response(JSON.stringify({ error: "Send { meal: 'description' }" }), {
        status: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: meal },
        ],
        temperature: 0.1,
        max_tokens: 1024,
      }),
    });

    if (!groqRes.ok) {
      const err = await groqRes.text();
      return new Response(JSON.stringify({ error: "Groq API error", detail: err }), {
        status: 502,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    const groqData = await groqRes.json();
    const raw = groqData.choices?.[0]?.message?.content || "[]";

    // Extract JSON from response (Groq sometimes wraps in markdown code blocks)
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    const items = jsonMatch ? JSON.parse(jsonMatch[0]) : [];

    return new Response(JSON.stringify({ items }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }
});
