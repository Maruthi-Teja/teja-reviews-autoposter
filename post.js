import fetch from "node-fetch";

// ============================================
// Teja Reviews — Claude Auto Poster v2
// Site: tejareviews.in | Affiliate: maruthiteja-21
// Features: AI content + images + Rank Math SEO
// ============================================

const WORDPRESS_URL = "https://tejareviews.in";
const WP_USERNAME   = "maruthiteja456@gmail.com";
const WP_APP_PASS   = process.env.WP_APP_PASSWORD || process.env.WP_PASS;
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
const PEXELS_API_KEY = process.env.PEXELS_API_KEY;
const AFFILIATE_TAG = "maruthiteja-21";

// ── Add more topics here — script rotates daily ──
const TOPICS = [
  {
    product:      "OnePlus Nord Buds 4 Pro",
    price:        "₹3,999",
    category:     "Tech Reviews",
    imageQuery:   "wireless earbuds headphones",
    keywords:     ["OnePlus Nord Buds 4 Pro review India", "best earbuds under 4000", "OnePlus ANC earbuds 2026"]
  },
  {
    product:      "boAt Rockerz 550 Bluetooth Headphones",
    price:        "₹1,499",
    category:     "Tech Reviews",
    imageQuery:   "bluetooth headphones music",
    keywords:     ["boAt Rockerz 550 review", "best headphones under 1500 India", "boAt wireless headphones"]
  },
  {
    product:      "Redmi Note 14 Pro",
    price:        "₹25,999",
    category:     "Tech Reviews",
    imageQuery:   "smartphone android mobile phone",
    keywords:     ["Redmi Note 14 Pro review India", "best phone under 26000", "Redmi Note 14 Pro camera"]
  },
  {
    product:      "Realme Watch 3 Pro",
    price:        "₹4,999",
    category:     "Tech Reviews",
    imageQuery:   "smartwatch fitness tracker",
    keywords:     ["Realme Watch 3 Pro review India", "best smartwatch under 5000", "Realme smartwatch 2026"]
  },
  {
    product:      "Mi Smart Band 8",
    price:        "₹2,499",
    category:     "Tech Reviews",
    imageQuery:   "fitness band smartband wearable",
    keywords:     ["Mi Smart Band 8 review India", "best fitness band under 3000", "Xiaomi band 8 review"]
  }
];

function getTodaysTopic() {
  const dayIndex = Math.floor(Date.now() / 86400000) % TOPICS.length;
  return TOPICS[dayIndex];
}

// ── Claude API helper ──
async function callClaude(prompt, maxTokens = 2000) {
  const maxRetries = 4;
  const baseDelayMs = 2500;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type":      "application/json",
        "x-api-key":         ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model:      "claude-sonnet-4-20250514",
        max_tokens: maxTokens,
        messages:   [{ role: "user", content: prompt }]
      })
    });

    const data = await response.json();
    if (response.ok) {
      if (!data.content || !data.content[0]) throw new Error(`Unexpected Claude response: ${JSON.stringify(data)}`);
      return data.content[0].text;
    }

    const isOverloaded = response.status === 529 || data?.error?.type === "overloaded_error";
    const canRetry = isOverloaded && attempt < maxRetries;
    if (!canRetry) throw new Error(`Claude API error ${response.status}: ${JSON.stringify(data)}`);

    const delay = baseDelayMs * 2 ** (attempt - 1) + Math.floor(Math.random() * 800);
    console.log(`⚠️  Claude overloaded (attempt ${attempt}/${maxRetries}) — retrying in ${Math.round(delay / 1000)}s...`);
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  throw new Error("Claude API retries exhausted");
}

// ── Fetch free image from Unsplash ──
async function fetchImage(topic) {
  const productQuery = `${topic.product} product`;
  const fallbackQuery = topic.imageQuery || topic.product;

  if (PEXELS_API_KEY) {
    try {
      console.log(`🖼️  Fetching product image from Pexels for: "${productQuery}"...`);
      const pexelsRes = await fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(productQuery)}&per_page=1&orientation=landscape`, {
        headers: { Authorization: PEXELS_API_KEY }
      });
      const pexelsData = await pexelsRes.json();
      const pexelsImage = pexelsData?.photos?.[0]?.src?.landscape || pexelsData?.photos?.[0]?.src?.large2x;
      if (pexelsRes.ok && pexelsImage) {
        console.log(`✅ Product image fetched from Pexels`);
        return pexelsImage;
      }
      console.log("⚠️  Pexels returned no matching product image — falling back");
    } catch {
      console.log("⚠️  Pexels fetch failed — falling back");
    }
  }

  try {
    console.log(`🖼️  Fetching fallback image for: "${fallbackQuery}"...`);
    // Uses Unsplash Source — free, no API key needed
    const imageUrl = `https://source.unsplash.com/featured/1200x600/?${encodeURIComponent(fallbackQuery)}`;
    // Verify image loads
    const res = await fetch(imageUrl, { method: "HEAD" });
    if (res.ok || res.status === 301 || res.redirected) {
      console.log(`✅ Image fetched`);
      return imageUrl;
    }
  } catch {
    console.log("⚠️  Image fetch failed — using placeholder");
  }
  return `https://placehold.co/1200x600/1a1a2e/ffffff?text=${encodeURIComponent(topic.product)}`;
}

// ── Upload image to WordPress media library ──
async function uploadImageToWP(auth, imageUrl, altText) {
  try {
    console.log(`📤 Uploading image to WordPress...`);
    const imgRes  = await fetch(imageUrl);
    const imgBuffer = await imgRes.buffer();

    const uploadRes = await fetch(`${WORDPRESS_URL}/wp-json/wp/v2/media`, {
      method: "POST",
      headers: {
        "Authorization":       `Basic ${auth}`,
        "Content-Disposition": `attachment; filename="featured-image.jpg"`,
        "Content-Type":        "image/jpeg"
      },
      body: imgBuffer
    });

    const media = await uploadRes.json();
    if (media.id) {
      console.log(`✅ Image uploaded — ID: ${media.id}`);
      return { id: media.id, url: media.source_url };
    }
  } catch (e) {
    console.log(`⚠️  Image upload failed: ${e.message}`);
  }
  return null;
}

// ── Generate post content with Claude ──
async function generatePost(topic, imageUrl) {
  console.log(`\n📝 Generating post for: ${topic.product}...`);

  const imageHtml = imageUrl
    ? `<figure style="margin:2rem 0;text-align:center;">
        <img src="${imageUrl}" alt="${topic.product} Review India" style="width:100%;max-width:800px;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,0.1);" />
        <figcaption style="font-size:14px;color:#666;margin-top:8px;">${topic.product} — Available on Amazon India at ${topic.price}</figcaption>
       </figure>`
    : "";

  const prompt = `You are a tech reviewer writing for an Indian audience on tejareviews.in.

Write a detailed SEO-optimised blog post reviewing the ${topic.product} priced at ${topic.price} in India.

Use this EXACT HTML structure with proper styling:

${imageHtml}

Then these sections:

<div style="background:#f0f7ff;border-left:4px solid #0070f3;padding:16px 20px;border-radius:0 8px 8px 0;margin:1.5rem 0;">
<strong>⚡ Quick Summary:</strong> [2 sentence verdict with star rating ⭐⭐⭐⭐]
</div>

<h2>Quick Verdict</h2>
[3 sentence verdict paragraph]

<h2>Key Specifications</h2>
<table style="width:100%;border-collapse:collapse;margin:1rem 0;">
<tr style="background:#f5f5f5;"><th style="padding:10px;border:1px solid #ddd;text-align:left;">Feature</th><th style="padding:10px;border:1px solid #ddd;text-align:left;">Details</th></tr>
[6-8 spec rows with: <tr><td style="padding:10px;border:1px solid #ddd;"><strong>Spec name</strong></td><td style="padding:10px;border:1px solid #ddd;">Value</td></tr>]
</table>

<h2>What We Love ❤️</h2>
[3 pros, each with an <h3> heading and a full paragraph]

<h2>Things to Consider ⚠️</h2>
[2 honest cons with <h3> headings]

<h2>Who Should Buy the ${topic.product}?</h2>
<ul style="line-height:2;">
[5 bullet points of ideal buyer types]
</ul>

<h2>Final Verdict — Should You Buy?</h2>
[Strong 2-paragraph conclusion with clear recommendation]

<div style="background:#fff8e6;border:2px solid #FF9900;border-radius:12px;padding:24px;text-align:center;margin:2rem 0;">
<p style="font-size:18px;font-weight:bold;margin-bottom:12px;">Ready to Buy ${topic.product}?</p>
<p style="color:#555;margin-bottom:16px;">Get it at the best price on Amazon India 🛒</p>
<a href="https://www.amazon.in/s?k=${encodeURIComponent(topic.product)}&tag=${AFFILIATE_TAG}" 
   target="_blank" rel="noopener noreferrer"
   style="background:#FF9900;color:#000;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:18px;display:inline-block;">
   👉 Check Price on Amazon India
</a>
<p style="font-size:12px;color:#999;margin-top:12px;">Price may vary. Click to see latest price.</p>
</div>

<hr style="margin:2rem 0;border:none;border-top:1px solid #eee;">
<p style="font-size:13px;color:#888;font-style:italic;">
<strong>Affiliate Disclosure:</strong> Teja Reviews is a participant in the Amazon Associates Programme. 
If you purchase through our links, we earn a small commission at no extra cost to you. 
This helps us keep publishing honest, unbiased reviews. Thank you for your support! 🙏
</p>

Target keywords to naturally use: ${topic.keywords.join(", ")}
Friendly honest tone. Indian audience. All prices in ₹. Minimum 800 words. Do NOT include the post title in the content.`;

  const text = await callClaude(prompt, 2500);
  console.log(`✅ Post generated — ${text.length} chars`);
  return text;
}

// ── Generate SEO meta with Claude ──
async function generateMeta(topic) {
  console.log(`🔍 Generating SEO meta...`);
  const prompt = `Generate SEO metadata for a blog post about ${topic.product} (${topic.price}) for Indian buyers on tejareviews.in.
Return ONLY raw JSON no markdown no backticks:
{"title":"60 char max SEO title with keyword","slug":"url-slug-with-primary-keyword","metaDescription":"155 char max with keyword and CTA for Indians","focusKeyword":"primary keyword phrase","tags":["tag1","tag2","tag3","tag4","tag5"]}`;

  const raw = await callClaude(prompt, 400);
  try {
    const meta = JSON.parse(raw.replace(/```json|```/g, "").trim());
    console.log(`✅ Meta — "${meta.title}"`);
    return meta;
  } catch {
    console.log("⚠️ Meta fallback");
    return {
      title:          `${topic.product} Review India ${new Date().getFullYear()} — Worth Buying?`,
      slug:           topic.product.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""),
      metaDescription:`${topic.product} review — worth ${topic.price} in India? Full specs, pros, cons & buying verdict.`,
      focusKeyword:   topic.keywords[0],
      tags:           topic.keywords
    };
  }
}

// ── Get or create WordPress category ──
async function getCategoryId(auth, name) {
  const res  = await fetch(`${WORDPRESS_URL}/wp-json/wp/v2/categories?search=${encodeURIComponent(name)}`, {
    headers: { "Authorization": `Basic ${auth}` }
  });
  const cats = await res.json();
  if (cats.length > 0) return cats[0].id;
  const cr = await fetch(`${WORDPRESS_URL}/wp-json/wp/v2/categories`, {
    method:  "POST",
    headers: { "Authorization": `Basic ${auth}`, "Content-Type": "application/json" },
    body:    JSON.stringify({ name, slug: name.toLowerCase().replace(/\s+/g, "-") })
  });
  return (await cr.json()).id;
}

// ── Create or get tag IDs ──
async function getTagIds(auth, tags) {
  const ids = [];
  for (const tag of tags.slice(0, 5)) {
    try {
      const r = await fetch(`${WORDPRESS_URL}/wp-json/wp/v2/tags`, {
        method:  "POST",
        headers: { "Authorization": `Basic ${auth}`, "Content-Type": "application/json" },
        body:    JSON.stringify({ name: tag })
      });
      const t = await r.json();
      if (t.id) ids.push(t.id);
      else if (t.code === "term_exists") ids.push(t.data.term_id);
    } catch {}
  }
  return ids;
}

// ── Publish to WordPress with Rank Math SEO ──
async function publishToWordPress(topic, content, meta, featuredImageId) {
  console.log(`\n🚀 Publishing to tejareviews.in...`);
  const auth       = Buffer.from(`${WP_USERNAME}:${WP_APP_PASS}`).toString("base64");
  const categoryId = await getCategoryId(auth, topic.category);
  const tagIds     = await getTagIds(auth, meta.tags);
  const shouldAutoPublish = process.env.AUTO_PUBLISH === "true";
  const postStatus = shouldAutoPublish ? "publish" : "draft";

  const postPayload = {
    title:          meta.title,
    content:        content,
    slug:           meta.slug,
    // Safety default: keep posts as drafts unless AUTO_PUBLISH=true is intentionally set.
    status:         postStatus,
    categories:     [categoryId],
    tags:           tagIds,
    // Rank Math SEO fields
    meta: {
      rank_math_title:             meta.title,
      rank_math_description:       meta.metaDescription,
      rank_math_focus_keyword:     meta.focusKeyword || topic.keywords[0],
      rank_math_robots:            ["index", "follow"],
      rank_math_og_title:          meta.title,
      rank_math_og_description:    meta.metaDescription,
      rank_math_twitter_title:     meta.title,
      rank_math_twitter_description: meta.metaDescription,
    }
  };

  // Attach featured image if uploaded
  if (featuredImageId) {
    postPayload.featured_media = featuredImageId;
  }

  const res  = await fetch(`${WORDPRESS_URL}/wp-json/wp/v2/posts`, {
    method:  "POST",
    headers: { "Authorization": `Basic ${auth}`, "Content-Type": "application/json" },
    body:    JSON.stringify(postPayload)
  });

  const post = await res.json();
  if (!res.ok) throw new Error(`WordPress error: ${JSON.stringify(post)}`);

  console.log(`\n🎉 ${postStatus.toUpperCase()} CREATED SUCCESSFULLY!`);
  console.log(`📌 Title:        ${post.title.rendered}`);
  console.log(`🔗 Slug:         /${post.slug}/`);
  console.log(`🖼️  Featured img: ${featuredImageId ? "✅ Set" : "❌ Not set"}`);
  console.log(`🔍 Rank Math:    ✅ SEO fields set`);
  console.log(`✏️  Edit URL:     ${WORDPRESS_URL}/wp-admin/post.php?post=${post.id}&action=edit`);
  if (postStatus === "draft") {
    console.log(`\n👆 Review in WordPress → click Publish when ready!`);
  } else {
    console.log(`\n✅ Post was auto-published because AUTO_PUBLISH=true.`);
  }
  return post;
}

// ── Main ──
async function main() {
  console.log("🤖 Teja Reviews — Claude Auto Poster v2");
  console.log("=========================================");
  if (!ANTHROPIC_KEY) throw new Error("Set ANTHROPIC_API_KEY environment variable");
  if (!WP_APP_PASS)   throw new Error("Set WP_APP_PASSWORD (or WP_PASS) environment variable");

  const topic = getTodaysTopic();
  console.log(`📦 Today: ${topic.product} (${topic.price})`);

  // Step 1 — Fetch image
  const imageUrl = await fetchImage(topic);

  // Step 2 — Generate content + meta in parallel
  const [content, meta] = await Promise.all([
    generatePost(topic, imageUrl),
    generateMeta(topic)
  ]);

  // Step 3 — Upload image to WordPress
  const auth       = Buffer.from(`${WP_USERNAME}:${WP_APP_PASS}`).toString("base64");
  const uploadedImg = await uploadImageToWP(auth, imageUrl, topic.product);

  // Step 4 — Publish
  await publishToWordPress(topic, content, meta, uploadedImg?.id);
}

main().catch(err => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
