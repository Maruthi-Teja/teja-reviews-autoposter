import fetch from "node-fetch";
import fs from "fs";

// ============================================
// Teja Reviews — Monthly Content Calendar (Phase 4B)
// Runs on 1st of each month via GitHub Actions
// Generates 90 topics → saves to topics.json
// post.js reads topics.json if it exists
// ============================================

const GEMINI_KEY = process.env.GEMINI_API_KEY;
const TOPICS_FILE = "./topics.json";
const SEO_YEAR    = 2026;

const API_TIMEOUT_MS = 60000;

async function fetchWithTimeout(url, options = {}, timeoutMs = API_TIMEOUT_MS) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return res;
  } catch (err) {
    clearTimeout(id);
    if (err.name === "AbortError") throw new Error(`Timeout after ${timeoutMs}ms`);
    throw err;
  }
}

async function callGemini(prompt, maxTokens = 3000) {
  const res = await fetchWithTimeout(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${GEMINI_KEY}`,
    {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        contents:         [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: maxTokens, temperature: 0.8 }
      })
    },
    API_TIMEOUT_MS
  );
  const data = await res.json();
  if (!res.ok) throw new Error(`Gemini error: ${JSON.stringify(data)}`);
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

function getNextMonthInfo() {
  const now  = new Date();
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return {
    year:  next.getFullYear(),
    month: next.getMonth() + 1,
    name:  next.toLocaleString("en-IN", { month: "long" }),
    season: getIndianSeason(next.getMonth() + 1)
  };
}

function getIndianSeason(month) {
  if ([3, 4, 5].includes(month)) return "Summer (hot, humid — focus on cooling, hydration, outdoor gear)";
  if ([6, 7, 8, 9].includes(month)) return "Monsoon (rain season — focus on indoor, waterproof, home products)";
  if ([10, 11].includes(month)) return "Post-monsoon/Festive (Navratri, Diwali, Dussehra — gifting season)";
  if ([12, 1, 2].includes(month)) return "Winter (focus on warmth, indoor wellness, year-end deals)";
  return "Spring transition";
}

function getUpcomingFestivals(month) {
  const festivals = {
    1:  "Makar Sankranti, Republic Day sales",
    2:  "Valentine's Day, Budget season",
    3:  "Holi, women's day gifting",
    4:  "IPL season, summer sales",
    5:  "Mother's Day, summer deals",
    6:  "Father's Day, monsoon preps",
    7:  "Monsoon sales, Amazon Prime Day",
    8:  "Independence Day sales, Rakshabandhan",
    9:  "Onam, Amazon Great Indian Festival",
    10: "Navratri, Dussehra, Diwali sales",
    11: "Diwali, Bhai Dooj, Children's Day",
    12: "Christmas, New Year, year-end sales"
  };
  return festivals[month] || "General shopping season";
}

async function main() {
  console.log("📅 Teja Reviews — Monthly Content Calendar Generator");
  console.log("======================================================");

  if (!GEMINI_KEY) throw new Error("Missing GEMINI_API_KEY");

  const nextMonth = getNextMonthInfo();
  console.log(`📆 Generating topics for: ${nextMonth.name} ${nextMonth.year}`);
  console.log(`🌦️  Season: ${nextMonth.season}`);
  console.log(`🎉 Festivals: ${getUpcomingFestivals(nextMonth.month)}`);

  const prompt = `You are a content strategist for Teja Reviews (tejareviews.in), an Indian affiliate review blog.

Generate exactly 90 product topics for ${nextMonth.name} ${nextMonth.year}.

CONTEXT:
- Season: ${nextMonth.season}
- Upcoming events: ${getUpcomingFestivals(nextMonth.month)}
- Target: Indian buyers, Amazon India affiliate links
- Mix: 50% electronics/tech, 30% health/wellness/beauty, 20% home/lifestyle
- Avoid: smartphones and laptops (low Amazon commission 0.5%)
- Focus on: ₹500–₹15,000 price range products with high search volume

Return ONLY a valid JSON array of 90 objects. No preamble, no explanation, no code fences. Each object:
{
  "product": "Product Name",
  "price": "₹XXX–₹X,XXX",
  "category": "Category Name",
  "imageQuery": "3-4 word pexels search term",
  "keywords": ["primary keyword india", "secondary keyword 2026", "tertiary keyword"]
}

Mix these categories across the 90 topics:
- Tech & Audio (earbuds, speakers, headphones)
- Wearable Tech (smartwatches, fitness bands)
- Mobile Accessories (power banks, chargers, cases)
- Smart Home Tech (smart bulbs, plugs, security)
- Tech & Gaming (headsets, keyboards, controllers)
- Fitness & Wellness (yoga, protein, supplements)
- Beauty & Skincare (serums, masks, tools)
- Home & Kitchen (appliances, cookware, storage)
- Personal Care (grooming, dental, hair care)
- Lifestyle (bottles, bags, stationery)`;

  console.log("\n📡 Calling Gemini to generate 90 topics…");
  const raw = await callGemini(prompt, 4000);

  // Extract JSON from response
  let topics;
  try {
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error("No JSON array found in response");
    topics = JSON.parse(jsonMatch[0]);
  } catch (err) {
    console.error("❌ Failed to parse Gemini JSON:", err.message);
    console.error("Raw response (first 500 chars):", raw.slice(0, 500));
    process.exit(1);
  }

  if (!Array.isArray(topics) || topics.length < 10) {
    throw new Error(`Unexpected topics count: ${topics?.length}`);
  }

  // Validate and clean each topic
  const cleaned = topics.map(t => ({
    product:    (t.product    || "").trim(),
    price:      (t.price      || "₹500–₹5,000").trim(),
    category:   (t.category   || "Tech & Electronics").trim(),
    imageQuery: (t.imageQuery || "product review india").trim(),
    keywords:   Array.isArray(t.keywords) ? t.keywords.slice(0, 3).map(k => (k || "").trim()) : []
  })).filter(t => t.product.length > 0);

  const output = {
    generatedFor: `${nextMonth.name} ${nextMonth.year}`,
    generatedAt:  new Date().toISOString(),
    season:       nextMonth.season,
    festivals:    getUpcomingFestivals(nextMonth.month),
    count:        cleaned.length,
    topics:       cleaned
  };

  fs.writeFileSync(TOPICS_FILE, JSON.stringify(output, null, 2));

  console.log(`\n✅ Generated ${cleaned.length} topics for ${nextMonth.name} ${nextMonth.year}`);
  console.log(`💾 Saved to ${TOPICS_FILE}`);
  console.log(`\nSample topics:`);
  cleaned.slice(0, 5).forEach((t, i) => console.log(`  ${i+1}. ${t.product} (${t.price}) — ${t.category}`));
}

main().catch(err => {
  console.error("❌ Monthly topics failed:", err.message);
  process.exit(1);
});
