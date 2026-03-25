// ============================================
// Teja Reviews — Claude → WordPress Auto Poster
// Site: tejareviews.in
// Affiliate: maruthiteja-21
// ============================================

const WORDPRESS_URL = "https://tejareviews.in";
const WP_USERNAME   = "maruthiteja456@gmail.com";
const WP_APP_PASS   = process.env.WP_APP_PASSWORD;   // set in .env or GitHub secret
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;  // set in .env or GitHub secret

const AFFILIATE_TAG = "maruthiteja-21";

// ── Topic queue — add new topics here daily or via Google Sheet ──
const TOPICS = [
  {
    product: "OnePlus Nord Buds 4 Pro",
    price:   "₹3,999",
    category: "Tech Reviews",
    keywords: ["OnePlus Nord Buds 4 Pro review", "best earbuds under 4000 India", "OnePlus ANC earbuds 2026"]
  },
  {
    product: "boAt Rockerz 550 Bluetooth Headphones",
    price:   "₹1,499",
    category: "Tech Reviews",
    keywords: ["boAt Rockerz 550 review", "best headphones under 1500 India", "boAt wireless headphones"]
  },
  {
    product: "Redmi Note 14 Pro",
    price:   "₹25,999",
    category: "Tech Reviews",
    keywords: ["Redmi Note 14 Pro review India", "best phone under 26000", "Redmi Note 14 Pro camera"]
  }
];

// ── Pick today's topic (rotates daily by date) ──
function getTodaysTopic() {
  const dayIndex = Math.floor(Date.now() / 86400000) % TOPICS.length;
  return TOPICS[dayIndex];
}

// ── Generate post with Claude API ──
async function generatePost(topic) {
  console.log(`\n📝 Generating post for: ${topic.product}...`);

  const prompt = `You are a tech reviewer writing for an Indian audience on tejareviews.in.

Write a detailed, SEO-optimised blog post reviewing the ${topic.product} priced at ${topic.price} in India.

Structure the post EXACTLY like this (use HTML tags):
1. Opening paragraph — hook the reader with a bold claim or question
2. <h2>Quick Verdict</h2> — 2-3 sentence summary with star rating
3. <h2>Key Specifications</h2> — bullet list of specs
4. <h2>What We Love</h2> — 3 detailed pros with sub-headings
5. <h2>Things to Consider</h2> — 2 honest cons
6. <h2>Who Should Buy the ${topic.product}?</h2> — bullet list of ideal buyers
7. <h2>Final Verdict — Should You Buy?</h2> — strong conclusion
8. End with this exact HTML buy button:
<div style="text-align:center;margin:2rem 0;">
<a href="https://www.amazon.in/s?k=${encodeURIComponent(topic.product)}&tag=${AFFILIATE_TAG}" 
   target="_blank" 
   rel="noopener noreferrer"
   style="background:#FF9900;color:#000;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;font-size:16px;">
   👉 Buy ${topic.product} on Amazon India — Best Price
</a>
</div>
9. End with affiliate disclaimer paragraph in italics

Target keywords to naturally include: ${topic.keywords.join(", ")}

Write in a friendly, honest tone. Indian audience. Mention Indian prices in ₹. 
Minimum 700 words. Do not include the title in the content.`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_KEY,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      messages: [{ role: "user", content: prompt }]
    })
  });

  const data = await response.json();
  if (!response.ok) throw new Error(`Claude API error: ${JSON.stringify(data)}`);

  const content = data.content[0].text;
  console.log(`✅ Post generated — ${content.length} characters`);
  return content;
}

// ── Generate SEO meta with Claude ──
async function generateMeta(topic) {
  console.log(`\n🔍 Generating SEO meta...`);

  const prompt = `Generate SEO metadata for a blog post about ${topic.product} (${topic.price}) for Indian buyers.

Respond ONLY with valid JSON, no markdown, no backticks:
{
  "title": "post title under 60 chars with primary keyword",
  "slug": "url-friendly-slug-with-keyword",
  "metaDescription": "meta description under 155 chars with keyword and CTA",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"]
}`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_KEY,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 300,
      messages: [{ role: "user", content: prompt }]
    })
  });

  const data = await response.json();
  const raw  = data.content[0].text.trim();

  try {
    const meta = JSON.parse(raw);
    console.log(`✅ Meta generated — Title: ${meta.title}`);
    return meta;
  } catch {
    // fallback if JSON parse fails
    return {
      title: `${topic.product} Review India ${new Date().getFullYear()}`,
      slug:  topic.product.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""),
      metaDescription: `${topic.product} review — Is it worth buying at ${topic.price} in India? Full specs, pros, cons & verdict.`,
      tags: topic.keywords
    };
  }
}

// ── Get WordPress category ID ──
async function getCategoryId(categoryName) {
  const auth = Buffer.from(`${WP_USERNAME}:${WP_APP_PASS}`).toString("base64");
  const res  = await fetch(`${WORDPRESS_URL}/wp-json/wp/v2/categories?search=${encodeURIComponent(categoryName)}`, {
    headers: { "Authorization": `Basic ${auth}` }
  });
  const cats = await res.json();
  if (cats.length > 0) return cats[0].id;

  // Create category if it doesn't exist
  const createRes = await fetch(`${WORDPRESS_URL}/wp-json/wp/v2/categories`, {
    method: "POST",
    headers: { "Authorization": `Basic ${auth}`, "Content-Type": "application/json" },
    body: JSON.stringify({ name: categoryName, slug: categoryName.toLowerCase().replace(/\s+/g, "-") })
  });
  const newCat = await createRes.json();
  return newCat.id;
}

// ── Publish post to WordPress ──
async function publishToWordPress(topic, content, meta) {
  console.log(`\n🚀 Publishing to tejareviews.in...`);

  const auth       = Buffer.from(`${WP_USERNAME}:${WP_APP_PASS}`).toString("base64");
  const categoryId = await getCategoryId(topic.category);

  // Create tags
  const tagIds = [];
  for (const tag of meta.tags) {
    try {
      const tagRes = await fetch(`${WORDPRESS_URL}/wp-json/wp/v2/tags`, {
        method: "POST",
        headers: { "Authorization": `Basic ${auth}`, "Content-Type": "application/json" },
        body: JSON.stringify({ name: tag, slug: tag.toLowerCase().replace(/\s+/g, "-") })
      });
      const tagData = await tagRes.json();
      if (tagData.id) tagIds.push(tagData.id);
    } catch { /* tag might already exist */ }
  }

  const postBody = {
    title:      meta.title,
    content:    content,
    slug:       meta.slug,
    status:     "publish",           // change to "draft" to review before publishing
    categories: [categoryId],
    tags:       tagIds,
    meta: {
      rank_math_description: meta.metaDescription,
      rank_math_focus_keyword: topic.keywords[0]
    }
  };

  const response = await fetch(`${WORDPRESS_URL}/wp-json/wp/v2/posts`, {
    method: "POST",
    headers: {
      "Authorization":  `Basic ${auth}`,
      "Content-Type":   "application/json"
    },
    body: JSON.stringify(postBody)
  });

  const post = await response.json();
  if (!response.ok) throw new Error(`WordPress API error: ${JSON.stringify(post)}`);

  console.log(`\n🎉 POST PUBLISHED SUCCESSFULLY!`);
  console.log(`📌 Title: ${post.title.rendered}`);
  console.log(`🔗 URL:   ${post.link}`);
  console.log(`📂 Category: ${topic.category}`);
  console.log(`🏷️  Tags: ${meta.tags.join(", ")}`);
  return post;
}

// ── Main runner ──
async function main() {
  console.log("🤖 Teja Reviews — Claude Auto Poster");
  console.log("=====================================");

  if (!ANTHROPIC_KEY) throw new Error("Missing ANTHROPIC_API_KEY");
  if (!WP_APP_PASS)   throw new Error("Missing WP_APP_PASSWORD");

  const topic   = getTodaysTopic();
  console.log(`📦 Today's topic: ${topic.product} (${topic.price})`);

  const [content, meta] = await Promise.all([
    generatePost(topic),
    generateMeta(topic)
  ]);

  await publishToWordPress(topic, content, meta);
}

main().catch(err => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});