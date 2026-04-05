import fetch from "node-fetch";
import fs from "fs";

// ============================================
// Teja Reviews — Claude Auto Poster v2 (FIXED)
// Site: tejareviews.in | Affiliate: maruthiteja-21
// Features: AI content + images + Rank Math SEO + Duplicate Prevention
// ============================================

const WORDPRESS_URL    = "https://tejareviews.in";
const WP_USERNAME      = "maruthiteja456@gmail.com";
const WP_APP_PASS      = process.env.WP_APP_PASSWORD || process.env.WP_PASS;
const ANTHROPIC_KEY    = process.env.ANTHROPIC_API_KEY;
const PEXELS_API_KEY   = process.env.PEXELS_API_KEY;
const AFFILIATE_TAG    = "maruthiteja-21";
const HISTORY_FILE     = "./posted.json";
const SEO_YEAR         = 2026;

// ============================================
// 33 TRENDING PRODUCTS (2026) — HIGH PRIORITY
// ============================================
const TOPICS = [
  // High Volume + Moderate Competition (50K+/mo searches)
  {
    product:      "Yoga Mats",
    price:        "₹500–₹3,000",
    category:     "Fitness & Wellness",
    imageQuery:   "yoga mat studio high quality",
    keywords:     ["yoga mat review India", "best yoga mat under 3000", "yoga mat thick eco-friendly"]
  },
  {
    product:      "Acne Patches",
    price:        "₹299–₹999",
    category:     "Beauty & Skincare",
    imageQuery:   "acne patches skincare treatment close up",
    keywords:     ["acne patches India review", "best acne patches for cystic acne", "pimple patches 2026"]
  },
  {
    product:      "Protein Powder",
    price:        "₹800–₹2,500",
    category:     "Nutrition & Fitness",
    imageQuery:   "protein powder whey isolate container",
    keywords:     ["best protein powder India", "whey protein powder under 2000", "protein powder review 2026"]
  },
  {
    product:      "Vitamin C Serum",
    price:        "₹599–₹3,500",
    category:     "Beauty & Skincare",
    imageQuery:   "vitamin c serum amber bottle skincare",
    keywords:     ["vitamin c serum India review", "best vitamin c serum for skin", "vitamin c serum benefits"]
  },
  {
    product:      "Bluetooth Headphones",
    price:        "₹1,500–₹10,000",
    category:     "Tech & Audio",
    imageQuery:   "wireless bluetooth headphones over ear black",
    keywords:     ["best bluetooth headphones India", "bluetooth headphones under 5000", "noise cancelling headphones"]
  },
  {
    product:      "Reusable Water Bottles",
    price:        "₹400–₹2,000",
    category:     "Lifestyle & Wellness",
    imageQuery:   "insulated reusable water bottle steel",
    keywords:     ["best water bottle India", "insulated water bottle under 2000", "eco-friendly water bottle"]
  },
  {
    product:      "Wi-Fi Doorbell Cameras",
    price:        "₹2,999–₹8,999",
    category:     "Smart Home Tech",
    imageQuery:   "smart wifi doorbell camera security",
    keywords:     ["doorbell camera India review", "smart doorbell camera under 5000", "wifi doorbell security"]
  },
  {
    product:      "Scalp Massagers",
    price:        "₹500–₹2,500",
    category:     "Wellness & Beauty",
    imageQuery:   "electric scalp massager head relaxation",
    keywords:     ["scalp massager review India", "best scalp massager for hair growth", "electric scalp massager"]
  },
  {
    product:      "Under-Eye Patches",
    price:        "₹199–₹1,500",
    category:     "Beauty & Skincare",
    imageQuery:   "under eye patches skincare puffiness",
    keywords:     ["under eye patches India", "best eye patches for dark circles", "eye patches review"]
  },
  {
    product:      "Home Décor Items",
    price:        "₹299–₹5,000",
    category:     "Home & Living",
    imageQuery:   "modern home decor wall art pillow",
    keywords:     ["home decor ideas India", "affordable home decor 2026", "home decor products online"]
  },

  // Medium Volume (20K–50K/mo) — Strong Seasonality
  {
    product:      "Blush Makeup",
    price:        "₹599–₹2,000",
    category:     "Beauty & Cosmetics",
    imageQuery:   "liquid blush makeup cream tones",
    keywords:     ["blush makeup India review", "best blush for Indian skin tone", "liquid blush 2026"]
  },
  {
    product:      "Wrap Skirts",
    price:        "₹799–₹3,000",
    category:     "Women's Fashion",
    imageQuery:   "wrap skirt boho style fashion casual",
    keywords:     ["wrap skirt India online", "boho wrap skirt review", "best wrap skirt brands India"]
  },
  {
    product:      "Insulated Tumblers",
    price:        "₹1,200–₹3,500",
    category:     "Home & Kitchen",
    imageQuery:   "insulated tumbler travel coffee cup stainless",
    keywords:     ["insulated tumbler India review", "best coffee tumbler under 3000", "vacuum tumbler 2026"]
  },
  {
    product:      "Teeth Whitening Strips",
    price:        "₹399–₹2,000",
    category:     "Personal Care",
    imageQuery:   "teeth whitening strips dental care smile",
    keywords:     ["teeth whitening strips India", "best whitening strips safe", "teeth whitening review"]
  },
  {
    product:      "Pet Supplies",
    price:        "₹299–₹3,000",
    category:     "Pets",
    imageQuery:   "premium pet supplies toys treats food",
    keywords:     ["pet supplies India online", "best pet food brands India", "dog treats review"]
  },

  // Niche/Emerging (5K–20K/mo) — HIGH MARGIN POTENTIAL
  {
    product:      "Gaming Headsets",
    price:        "₹1,999–₹8,000",
    category:     "Tech & Gaming",
    imageQuery:   "gaming headset immersive sound rgb lights",
    keywords:     ["gaming headset India review", "best gaming headset under 5000", "gaming headphones 2026"]
  },
  {
    product:      "Ashwagandha Tea",
    price:        "₹299–₹1,200",
    category:     "Health & Wellness",
    imageQuery:   "ashwagandha tea herbal wellness drink",
    keywords:     ["ashwagandha tea India review", "best ashwagandha tea brand", "adaptogen tea benefits"]
  },
  {
    product:      "Sauna Blankets",
    price:        "₹8,000–₹25,000",
    category:     "Home Wellness",
    imageQuery:   "infrared sauna blanket relaxation wellness",
    keywords:     ["sauna blanket India review", "infrared sauna blanket benefits", "sauna blanket 2026"]
  },
  {
    product:      "Niacinamide Body Lotion",
    price:        "₹399–₹1,500",
    category:     "Beauty & Skincare",
    imageQuery:   "niacinamide body lotion moisturizer bottle",
    keywords:     ["niacinamide lotion review", "best body lotion with niacinamide", "niacinamide skincare India"]
  },
  {
    product:      "Lash Cleansing Shampoo",
    price:        "₹499–₹1,200",
    category:     "Beauty & Haircare",
    imageQuery:   "lash extension cleansing shampoo foam",
    keywords:     ["lash shampoo India review", "lash extension cleanser", "eyelash cleansing products"]
  },

  // Viral/Trending Niches (< 5K/mo but RISING) — First-Mover Advantage
  {
    product:      "LEGO Sets",
    price:        "₹1,500–₹15,000",
    category:     "Toys & Hobbies",
    imageQuery:   "lego sets building kits adult collection",
    keywords:     ["LEGO sets India price", "best LEGO sets to buy", "LEGO collection 2026"]
  },
  {
    product:      "Foldable Chairs",
    price:        "₹1,500–₹8,000",
    category:     "Outdoor & Patio",
    imageQuery:   "foldable camping chair portable lightweight",
    keywords:     ["foldable chair India review", "camping chair portable", "travel chair 2026"]
  },
  {
    product:      "Camping Hammocks",
    price:        "₹1,200–₹5,000",
    category:     "Outdoor & Recreation",
    imageQuery:   "camping hammock portable outdoor travel",
    keywords:     ["camping hammock India review", "best hammock for camping", "portable hammock 2026"]
  },
  {
    product:      "Eyebrow Lamination Kits",
    price:        "₹799–₹3,000",
    category:     "Beauty & DIY",
    imageQuery:   "eyebrow lamination kit diy home",
    keywords:     ["eyebrow lamination kit India", "DIY brow lamination", "eyebrow kit review"]
  },
  {
    product:      "Weighted Sleep Sacks",
    price:        "₹2,000–₹6,000",
    category:     "Kids & Baby",
    imageQuery:   "weighted sleep sack baby infant comfort",
    keywords:     ["weighted sleep sack review", "baby sleep sack India", "infant sleep aid"]
  },
  {
    product:      "Bamboo Baby Pajamas",
    price:        "₹599–₹1,500",
    category:     "Kids & Baby",
    imageQuery:   "bamboo baby pajamas soft eco-friendly",
    keywords:     ["bamboo baby pajamas India", "organic baby clothes", "eco-friendly baby wear"]
  },
  {
    product:      "Wireless Charging Desk Mat",
    price:        "₹1,299–₹5,000",
    category:     "Office Tech",
    imageQuery:   "wireless charging desk mat workspace",
    keywords:     ["wireless charging pad India", "desk mat with charger", "office tech gadgets"]
  },
  {
    product:      "Embroidered Apparel",
    price:        "₹799–₹5,000",
    category:     "Fashion & Accessories",
    imageQuery:   "embroidered clothing custom tshirt design",
    keywords:     ["embroidered tshirt India", "custom embroidered apparel", "personalized clothing"]
  },
  {
    product:      "Sustainable Kitchen Ware",
    price:        "₹199–₹2,000",
    category:     "Home & Kitchen",
    imageQuery:   "eco-friendly kitchen glass straw reusable",
    keywords:     ["sustainable kitchen products India", "eco-friendly kitchenware", "glass straws review"]
  },
  {
    product:      "Disposable Period Underwear",
    price:        "₹899–₹2,500",
    category:     "Feminine Care",
    imageQuery:   "period underwear menstrual care wellness",
    keywords:     ["period underwear India review", "menstrual underwear brands", "period care products"]
  },

  // Additional High-Opportunity Niches
  {
    product:      "Portable Ice Makers",
    price:        "₹3,000–₹10,000",
    category:     "Kitchen & Appliances",
    imageQuery:   "portable ice maker machine automatic",
    keywords:     ["portable ice maker India review", "best ice maker for home", "portable ice machine"]
  },
  {
    product:      "Smart Light Bulbs",
    price:        "₹799–₹2,500",
    category:     "Smart Home Tech",
    imageQuery:   "smart light bulb wifi rgb color",
    keywords:     ["smart light bulbs India", "wifi light bulb review", "smart lighting 2026"]
  },
  {
    product:      "Weighted Blankets",
    price:        "₹2,500–₹8,000",
    category:     "Sleep & Wellness",
    imageQuery:   "weighted blanket sleep comfort cozy bed",
    keywords:     ["weighted blanket India review", "best weighted blanket for sleep", "gravity blanket"]
  }
];

function getTodaysTopic() {
  const dayIndex = Math.floor(Date.now() / 86400000) % TOPICS.length;
  return TOPICS[dayIndex];
}

function isAlreadyPosted(product) {
  if (!fs.existsSync(HISTORY_FILE)) return false;

  try {
    const data = JSON.parse(fs.readFileSync(HISTORY_FILE, "utf-8"));
    return Array.isArray(data) && data.includes(product);
  } catch {
    return false;
  }
}

function markPosted(product) {
  let data = [];
  if (fs.existsSync(HISTORY_FILE)) {
    try {
      data = JSON.parse(fs.readFileSync(HISTORY_FILE, "utf-8"));
    } catch {
      data = [];
    }
  }

  const unique = [...new Set([...(Array.isArray(data) ? data : []), product])];
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(unique, null, 2));
}

function buildSeoSlug(product) {
  return `${product} review india ${SEO_YEAR}`
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function ensureTitleHasYear(title) {
  const cleanTitle = (title || "").trim();
  if (!cleanTitle) return "";
  if (cleanTitle.includes(String(SEO_YEAR))) return cleanTitle;
  return `${cleanTitle} (${SEO_YEAR})`;
}

// ============================================
// FIX #1: CHECK IF SLUG EXISTS IN WORDPRESS
// ============================================
async function slugExistsInWordPress(auth, slug) {
  try {
    console.log(`🔍 Checking if slug already exists: /${slug}/`);
    const res = await fetch(`${WORDPRESS_URL}/wp-json/wp/v2/posts?slug=${encodeURIComponent(slug)}&per_page=1`, {
      headers: { "Authorization": `Basic ${auth}` }
    });
    
    if (!res.ok) {
      console.log(`⚠️  WordPress API error ${res.status} — skipping slug check`);
      return false;
    }

    const posts = await res.json();
    if (Array.isArray(posts) && posts.length > 0) {
      console.log(`⚠️  Slug already exists! Post ID: ${posts[0].id}`);
      return true;
    }
    console.log(`✅ Slug is unique`);
    return false;
  } catch (err) {
    console.log(`⚠️  Slug check failed: ${err.message} — continuing anyway`);
    return false;
  }
}

async function retry(fn, retries = 3, label = "operation") {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i === retries - 1) throw err;
      const delay = 1000 * 2 ** i;
      console.log(`⚠️  ${label} failed (attempt ${i + 1}/${retries}) — retrying in ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
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

// ============================================
// FIX #2: IMPROVED PEXELS IMAGE FETCH
// ============================================
async function fetchImageFromPexels(imageQuery) {
  if (!PEXELS_API_KEY) return null;

  console.log(`🖼️  Fetching from Pexels: "${imageQuery}"...`);
  try {
    const orientations = ["landscape", ""];
    for (const orientation of orientations) {
      const url = orientation
        ? `https://api.pexels.com/v1/search?query=${encodeURIComponent(imageQuery)}&per_page=5&orientation=${orientation}`
        : `https://api.pexels.com/v1/search?query=${encodeURIComponent(imageQuery)}&per_page=5`;

      const res = await fetch(url, {
        headers: { Authorization: PEXELS_API_KEY }
      });

      if (res.status === 401) {
        console.log("⚠️  Pexels 401 Unauthorized — check PEXELS_API_KEY");
        return null;
      }
      if (!res.ok) continue;

      const data = await res.json();
      if (data.photos && data.photos.length > 0) {
        const best = data.photos.sort((a, b) => b.width - a.width)[0];
        const imageUrl = best.src.large2x || best.src.large || best.src.medium;
        if (imageUrl) {
          console.log(`✅ Pexels found: ${imageUrl}`);
          return imageUrl;
        }
      }
    }
    console.log("⚠️  Pexels: no results");
  } catch (err) {
    console.log(`⚠️  Pexels error: ${err.message}`);
  }
  return null;
}

// ============================================
// FIX #3: PROPER IMAGE FETCH WITH imageQuery
// ============================================
async function fetchImage(imageQuery) {
  if (!imageQuery) {
    console.log("⚠️  No imageQuery provided — using fallback");
    imageQuery = "tech product review";
  }

  const attempts = [
    imageQuery,              // Primary: use the passed imageQuery string directly
    `${imageQuery} product`,
    `${imageQuery} review`,
    "tech gadget product"
  ];

  if (PEXELS_API_KEY) {
    for (const q of attempts) {
      const imageUrl = await fetchImageFromPexels(q);
      if (imageUrl) return imageUrl;
    }
    console.log("⚠️  Pexels exhausted — falling back to Unsplash");
  } else {
    console.log("⚠️  PEXELS_API_KEY not set — using Unsplash fallback");
  }

  console.log(`🖼️  Fetching from Unsplash: "${imageQuery}"...`);
  const unsplashUrl = `https://source.unsplash.com/featured/1200x600/?${encodeURIComponent(imageQuery)}`;

  try {
    const res = await fetch(unsplashUrl, { method: "HEAD", redirect: "follow" });
    if (res.ok || res.status === 301 || res.redirected) {
      console.log(`✅ Unsplash available`);
      return unsplashUrl;
    }
  } catch (err) {
    console.log(`⚠️  Unsplash error: ${err.message}`);
  }

  console.log("⚠️  Using placeholder image");
  return `https://placehold.co/1200x600/1a1a2e/ffffff?text=${encodeURIComponent(imageQuery)}`;
}

async function uploadImageToWP(auth, imageUrl, altText) {
  try {
    console.log(`📤 Uploading image to WordPress...`);
    const imgRes  = await fetch(imageUrl);
    if (!imgRes.ok) throw new Error(`Image download failed with ${imgRes.status}`);
    const arrayBuf = await imgRes.arrayBuffer();
    const imgBuffer = Buffer.from(arrayBuf);

    const uploadRes = await retry(() => fetch(`${WORDPRESS_URL}/wp-json/wp/v2/media`, {
      method: "POST",
      headers: {
        "Authorization":       `Basic ${auth}`,
        "Content-Disposition": `attachment; filename="featured-image.jpg"`,
        "Content-Type":        "image/jpeg"
      },
      body: imgBuffer
    }), 3, "WordPress media upload");

    if (!uploadRes.ok) throw new Error(`Media upload failed with ${uploadRes.status}`);

    const media = await uploadRes.json();
    if (media.id) {
      await retry(() => fetch(`${WORDPRESS_URL}/wp-json/wp/v2/media/${media.id}`, {
        method: "POST",
        headers: {
          "Authorization": `Basic ${auth}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          alt_text: altText,
          title: altText
        })
      }), 3, "WordPress media metadata update");

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

  const prompt = `You are a REAL Indian tech reviewer writing for an Indian audience on tejareviews.in.

IMPORTANT:
- Add 1 personal experience section (for example: "After using this for 7 days...")
- Add 1 meaningful comparison with a competitor in the same price segment
- Add realistic pros/cons only (avoid generic points)
- Avoid robotic tone and write in conversational human style
- Mention price comparison context and "best price currently" where relevant
- Mention Amazon trust and delivery reliability naturally
- Add LSI keywords naturally

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
  const toc = `
<div style="border:1px solid #ddd;padding:15px;border-radius:8px;margin:20px 0;">
<strong>📑 Table of Contents</strong>
<ul>
<li><a href="#verdict">Quick Verdict</a></li>
<li><a href="#specs">Specifications</a></li>
<li><a href="#pros">What We Love</a></li>
<li><a href="#cons">Things to Consider</a></li>
<li><a href="#final">Final Verdict</a></li>
</ul>
</div>`;
  const internalLinks = `
<div style="background:#f9f9f9;padding:15px;border-radius:8px;margin:20px 0;">
<p><strong>📚 More Reviews:</strong> Check out our <a href="https://tejareviews.in/category/tech-reviews/">latest tech reviews</a> for more product comparisons!</p>
</div>
`;

  const enhancedContent = `${toc}\n${text}\n${internalLinks}`;
  console.log(`✅ Post generated — ${enhancedContent.length} chars`);
  return enhancedContent;
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
    meta.title = ensureTitleHasYear(meta.title);
    console.log(`✅ Meta — "${meta.title}"`);
    return meta;
  } catch {
    console.log("⚠️ Meta fallback");
    return {
      title:          `${topic.product} Review India ${SEO_YEAR} — Worth Buying?`,
      slug:           buildSeoSlug(topic.product),
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

// ============================================
// FIX #1 INTEGRATION: CHECK SLUG BEFORE PUBLISH
// ============================================
async function publishToWordPress(topic, content, meta, featuredImageId) {
  console.log(`\n🚀 Publishing to tejareviews.in...`);
  const auth       = Buffer.from(`${WP_USERNAME}:${WP_APP_PASS}`).toString("base64");
  
  // Check if slug already exists (FIX #1)
  const slug = buildSeoSlug(topic.product);
  if (await slugExistsInWordPress(auth, slug)) {
    throw new Error(`Slug /${slug}/ already exists in WordPress! Skipping to prevent duplicate.`);
  }

  const categoryId = await getCategoryId(auth, topic.category);
  const tagIds     = await getTagIds(auth, meta.tags);
  const postStatus = "publish";
  const postTitle = ensureTitleHasYear(meta.title) || `${topic.product} Review India ${SEO_YEAR} — Worth Buying?`;

  const postPayload = {
    title:          postTitle,
    content:        content,
    slug:           slug,
    status:         postStatus,
    categories:     [categoryId],
    tags:           tagIds,
    // Rank Math SEO fields
    meta: {
      rank_math_title:             postTitle,
      rank_math_description:       meta.metaDescription,
      rank_math_focus_keyword:     meta.focusKeyword || topic.keywords[0],
      rank_math_robots:            ["index", "follow"],
      rank_math_og_title:          postTitle,
      rank_math_og_description:    meta.metaDescription,
      rank_math_twitter_title:     postTitle,
      rank_math_twitter_description: meta.metaDescription,
    }
  };

  // Attach featured image if uploaded
  if (featuredImageId) {
    postPayload.featured_media = featuredImageId;
  }

  const res  = await retry(() => fetch(`${WORDPRESS_URL}/wp-json/wp/v2/posts`, {
    method:  "POST",
    headers: { "Authorization": `Basic ${auth}`, "Content-Type": "application/json" },
    body:    JSON.stringify(postPayload)
  }), 3, "WordPress post publish");

  const post = await res.json();
  if (!res.ok) throw new Error(`WordPress error: ${JSON.stringify(post)}`);

  console.log(`\n🎉 ${postStatus.toUpperCase()} CREATED SUCCESSFULLY!`);
  console.log(`📌 Title:        ${post.title.rendered}`);
  console.log(`🔗 Slug:         /${post.slug}/`);
  console.log(`🖼️  Featured img: ${featuredImageId ? "✅ Set" : "❌ Not set"}`);
  console.log(`🔍 Rank Math:    ✅ SEO fields set`);
  console.log(`✏️  Edit URL:     ${WORDPRESS_URL}/wp-admin/post.php?post=${post.id}&action=edit`);
  console.log(`\n✅ Post is published directly to WordPress.`);
  return post;
}

// ── Main ──
async function main() {
  console.log("🤖 Teja Reviews — Claude Auto Poster v2 (FIXED)");
  console.log("=====================================================");
  if (!ANTHROPIC_KEY) throw new Error("Set ANTHROPIC_API_KEY environment variable");
  if (!WP_APP_PASS)   throw new Error("Set WP_APP_PASSWORD (or WP_PASS) environment variable");

  const topic = getTodaysTopic();
  console.log(`📦 Today's topic: ${topic.product} (${topic.price})`);
  
  if (isAlreadyPosted(topic.product)) {
    console.log("⚠️ Already in local history, skipping...");
    return;
  }

  // Step 1 — Fetch image (FIX #3: pass imageQuery string correctly)
  const imageUrl = await fetchImage(topic.imageQuery);

  // Step 2 — Generate content + meta in parallel
  const [content, meta] = await Promise.all([
    generatePost(topic, imageUrl),
    generateMeta(topic)
  ]);

  // Step 3 — Upload image to WordPress
  const auth       = Buffer.from(`${WP_USERNAME}:${WP_APP_PASS}`).toString("base64");
  const uploadedImg = await uploadImageToWP(auth, imageUrl, topic.product);

  // Step 4 — Publish (includes FIX #1 slug check)
  await publishToWordPress(topic, content, meta, uploadedImg?.id);
  markPosted(topic.product);
  
  console.log("\n✅ Complete workflow finished successfully!");
}

main().catch(err => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
