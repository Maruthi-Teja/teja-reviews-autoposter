import fetch from "node-fetch";
import fs from "fs";

// ============================================
// Teja Reviews — Gemini Auto Poster v4
// Site: tejareviews.in | Affiliate: maruthiteja-21
// Features: Gemini AI + Pexels images + Rank Math SEO
// ============================================

const WORDPRESS_URL    = "https://tejareviews.in";
const WP_USERNAME      = "maruthiteja456@gmail.com";
const WP_APP_PASS      = process.env.WP_APP_PASSWORD || process.env.WP_PASS;
const GEMINI_KEY       = process.env.GEMINI_API_KEY;
const PEXELS_API_KEY   = process.env.PEXELS_API_KEY;
const AFFILIATE_TAG    = "maruthiteja-21";
const HISTORY_FILE     = "./posted.json";
const SEO_YEAR         = 2026;

// Timeout & Retry settings
const API_TIMEOUT_MS        = 60000;  // 60 seconds
const FETCH_TIMEOUT_MS      = 20000;  // 20 seconds
const GEMINI_RETRIES        = 5;
const GEMINI_INITIAL_DELAY  = 5000;   // 5 seconds

// ============================================
// 33 TRENDING PRODUCTS (2026)
// ============================================
const TOPICS = [
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

// ============================================
// HELPERS
// ============================================

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
// FETCH WITH TIMEOUT
// ============================================
async function fetchWithTimeout(url, options = {}, timeoutMs = API_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === "AbortError") {
      throw new Error(`Request timeout after ${timeoutMs}ms`);
    }
    throw error;
  }
}

async function slugExistsInWordPress(auth, slug) {
  try {
    console.log(`🔍 Checking if slug already exists: /${slug}/`);
    const res = await fetchWithTimeout(
      `${WORDPRESS_URL}/wp-json/wp/v2/posts?slug=${encodeURIComponent(slug)}&per_page=1`,
      { headers: { "Authorization": `Basic ${auth}` } },
      20000
    );

    if (!res.ok) {
      console.log(`⚠️  WordPress API error ${res.status}`);
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
    console.log(`⚠️  Slug check failed: ${err.message}`);
    return false;
  }
}

async function retry(fn, retries = 3, label = "operation", delayMs = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i === retries - 1) throw err;
      const delay = delayMs * (2 ** i);
      console.log(`⚠️  ${label} failed (attempt ${i + 1}/${retries}) — retrying in ${Math.round(delay / 1000)}s`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

// ============================================
// GEMINI API (replaces callClaude)
// ============================================
async function callClaude(systemPrompt, userPrompt, maxTokens = 2500) {
  console.log(`📡 Calling Gemini API (gemini-1.5-flash)...`);

  for (let attempt = 1; attempt <= GEMINI_RETRIES; attempt++) {
    try {
      const response = await fetchWithTimeout(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${GEMINI_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: `${systemPrompt}\n\n${userPrompt}`
              }]
            }],
            generationConfig: {
              maxOutputTokens: maxTokens,
              temperature: 0.7
            }
          })
        },
        API_TIMEOUT_MS
      );

      const data = await response.json();

      // Handle quota/rate limit errors
      if (response.status === 429) {
        throw new Error("Gemini rate limit hit");
      }

      if (
        response.ok &&
        data.candidates?.[0]?.content?.parts?.[0]?.text
      ) {
        const text = data.candidates[0].content.parts[0].text;
        console.log(`✅ Gemini succeeded. Characters: ${text.length}`);
        return text;
      }

      throw new Error(`Gemini Error: ${JSON.stringify(data)}`);

    } catch (err) {
      const isLastRetry = attempt === GEMINI_RETRIES;
      if (isLastRetry) {
        console.log(`❌ Gemini failed after ${GEMINI_RETRIES} retries`);
        throw err;
      }

      const waitTime = GEMINI_INITIAL_DELAY * (2 ** (attempt - 1));
      console.log(`⚠️  Gemini failed (attempt ${attempt}/${GEMINI_RETRIES}) — retrying in ${Math.round(waitTime / 1000)}s`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }

  throw new Error("Gemini API retries exhausted");
}

// ============================================
// PEXELS IMAGE FETCH
// ============================================
async function fetchImageFromPexels(imageQuery) {
  if (!PEXELS_API_KEY) return null;

  console.log(`🖼️  Fetching from Pexels: "${imageQuery}"...`);
  try {
    const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(imageQuery)}&per_page=5`;
    const res = await fetchWithTimeout(url, {
      headers: { Authorization: PEXELS_API_KEY }
    }, FETCH_TIMEOUT_MS);

    if (res.status === 401) {
      console.log("⚠️  Pexels 401 Unauthorized");
      return null;
    }
    if (!res.ok) return null;

    const data = await res.json();
    if (data.photos && data.photos.length > 0) {
      const best = data.photos.sort((a, b) => b.width - a.width)[0];
      const imageUrl = best.src.large2x || best.src.large || best.src.medium;
      if (imageUrl) {
        console.log(`✅ Pexels found image`);
        return imageUrl;
      }
    }
  } catch (err) {
    console.log(`⚠️  Pexels error: ${err.message}`);
  }
  return null;
}

async function fetchImage(imageQuery) {
  if (!imageQuery) {
    imageQuery = "tech product review";
  }

  const attempts = [
    imageQuery,
    `${imageQuery} product`,
    `${imageQuery} review`,
    "tech gadget product"
  ];

  if (PEXELS_API_KEY) {
    for (const q of attempts) {
      const imageUrl = await fetchImageFromPexels(q);
      if (imageUrl) return imageUrl;
    }
  }

  console.log(`🖼️  Using Unsplash fallback`);
  return `https://source.unsplash.com/featured/1200x600/?${encodeURIComponent(imageQuery)}`;
}

async function uploadImageToWP(auth, imageUrl, altText) {
  try {
    console.log(`📤 Uploading image...`);
    const imgRes = await fetchWithTimeout(imageUrl, {}, FETCH_TIMEOUT_MS);
    if (!imgRes.ok) throw new Error(`Image download failed`);

    const arrayBuf = await imgRes.arrayBuffer();
    const imgBuffer = Buffer.from(arrayBuf);

    const uploadRes = await retry(() =>
      fetchWithTimeout(`${WORDPRESS_URL}/wp-json/wp/v2/media`, {
        method: "POST",
        headers: {
          "Authorization":       `Basic ${auth}`,
          "Content-Disposition": `attachment; filename="featured-image.jpg"`,
          "Content-Type":        "image/jpeg"
        },
        body: imgBuffer
      }, 20000)
    , 2, "WordPress media upload", 2000);

    if (!uploadRes.ok) throw new Error(`Media upload failed`);

    const media = await uploadRes.json();
    if (media.id) {
      console.log(`✅ Image uploaded — ID: ${media.id}`);
      return { id: media.id, url: media.source_url };
    }
  } catch (e) {
    console.log(`⚠️  Image upload skipped: ${e.message}`);
  }
  return null;
}

// ============================================
// CONTENT GENERATION
// ============================================
async function generatePost(topic, imageUrl) {
  console.log(`\n📝 Generating content for: ${topic.product}...`);

  const systemPrompt = `You are an expert SEO content writer for Teja Reviews (tejareviews.in).
Your goal is to write a high-converting, helpful product review for Indian buyers in 2026.

RULES:
- Use Indian English and reference Indian context (weather, homes, offices).
- Tone: Professional yet conversational (fan-first).
- Format: Strictly use HTML (h2, h3, p, ul, li). No markdown. No backticks. No code fences.
- Length: 900–1200 words.
- Comparison: Compare value with other popular products in India.
- Structure:
  1. Quick Verdict (with rating out of 5)
  2. Key Specifications (HTML Table)
  3. Design & Build Quality
  4. Performance & Daily Usage
  5. Pros and Cons (two separate ul lists)
  6. Who Should Buy? (Perfect For / Skip If)
  7. Final Verdict (mention Amazon India availability)
- Start directly from <h2>Quick Verdict</h2>. Do not add any preamble.`;

  const userPrompt = `Write a full product review for the following:

Product: ${topic.product}
Primary Keyword: ${topic.keywords[0]}
Secondary Keyword: ${topic.keywords[1] || ""}
Price Range: ${topic.price}
Year: ${SEO_YEAR}
Amazon Affiliate Tag: ${AFFILIATE_TAG}`;

  const rawContent = await callClaude(systemPrompt, userPrompt, 2500);

  // Strip any accidental markdown fences Gemini may add
  const cleanContent = rawContent
    .replace(/```html/gi, "")
    .replace(/```/g, "")
    .trim();

  const imageHtml = imageUrl ? `
<figure style="margin:2rem 0;text-align:center;">
  <img src="${imageUrl}" alt="${topic.product} Review India ${SEO_YEAR}" style="width:100%;max-width:800px;border-radius:12px;box-shadow:0 4px 15px rgba(0,0,0,0.1);" loading="lazy" />
  <figcaption style="font-size:13px;color:#666;margin-top:10px;">${topic.product} — Available in India for ${topic.price}</figcaption>
</figure>` : "";

  const shopButtons = `
<div style="display:flex;gap:12px;flex-wrap:wrap;margin:2rem 0;justify-content:center;">
  <a href="https://www.amazon.in/s?k=${encodeURIComponent(topic.product)}&tag=${AFFILIATE_TAG}" target="_blank" rel="noopener noreferrer" style="background:#FF9900;color:#000;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:15px;">🛒 View on Amazon India</a>
  <a href="https://www.flipkart.com/search?q=${encodeURIComponent(topic.product)}" target="_blank" rel="noopener noreferrer" style="background:#2874F0;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:15px;">🛍️ Check Flipkart Price</a>
</div>`;

  // Inject image after first H2, shop buttons after second H2
  let finalHtml = cleanContent
    .replace("</h2>", `</h2>${imageHtml}`)
    .replace("</h2>", `</h2>${shopButtons}`);

  // Footer
  finalHtml += `
<hr style="margin:3rem 0;">
<div style="background:#f9f9f9;padding:20px;border-radius:10px;">
  <h3 style="margin-top:0;">Related Buying Guides</h3>
  <ul>
    <li><a href="/category/${topic.category.toLowerCase().replace(/\s+/g, "-")}/">Best ${topic.category} Products in India</a></li>
    <li><a href="/">Latest Reviews on Teja Reviews</a></li>
  </ul>
</div>

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "${topic.product}",
  "description": "Expert review of ${topic.product} for Indian consumers in ${SEO_YEAR}.",
  "brand": { "@type": "Brand", "name": "Teja Reviews" },
  "offers": {
    "@type": "Offer",
    "priceCurrency": "INR",
    "price": "${topic.price.split("–")[0].replace(/[^0-9]/g, "")}",
    "availability": "https://schema.org/InStock"
  }
}
</script>`;

  console.log(`✅ Content generated — ${finalHtml.length} chars`);
  return finalHtml;
}

// ============================================
// META GENERATION
// ============================================
async function generateMeta(topic) {
  return {
    title: `${topic.product} Review India ${SEO_YEAR}: Worth Buying?`,
    slug: buildSeoSlug(topic.product),
    metaDescription: `${topic.product} review India ${SEO_YEAR}. Check price, features, pros, cons and whether it is worth buying in India.`,
    focusKeyword: topic.keywords[0],
    tags: [topic.keywords[0], topic.keywords[1] || topic.product]
  };
}

// ============================================
// WORDPRESS HELPERS
// ============================================
async function getCategoryId(auth, name) {
  const res = await fetchWithTimeout(
    `${WORDPRESS_URL}/wp-json/wp/v2/categories?search=${encodeURIComponent(name)}`,
    { headers: { "Authorization": `Basic ${auth}` } },
    15000
  );
  const cats = await res.json();
  if (cats.length > 0) return parseInt(cats[0].id, 10);

  const cr = await fetchWithTimeout(
    `${WORDPRESS_URL}/wp-json/wp/v2/categories`,
    {
      method:  "POST",
      headers: { "Authorization": `Basic ${auth}`, "Content-Type": "application/json" },
      body:    JSON.stringify({ name, slug: name.toLowerCase().replace(/\s+/g, "-") })
    },
    15000
  );
return parseInt((await cr.json()).id, 10);
}

async function getTagIds(auth, tags) {
  const promises = tags.slice(0, 3).map(async (tag) => {
    try {
      const r = await fetchWithTimeout(
        `${WORDPRESS_URL}/wp-json/wp/v2/tags`,
        {
          method:  "POST",
          headers: { "Authorization": `Basic ${auth}`, "Content-Type": "application/json" },
          body:    JSON.stringify({ name: tag })
        },
        15000
      );
      const t = await r.json();
      if (t.id) return t.id;
      if (t.code === "term_exists") return t.data.term_id;
    } catch {
      return null;
    }
  });

  const ids = await Promise.all(promises);
  return ids.filter(id => id !== null);
}

// ============================================
// PUBLISH TO WORDPRESS
// ============================================
async function publishToWordPress(topic, content, meta, featuredImageId) {
  console.log(`\n🚀 Publishing to tejareviews.in...`);
  const auth = Buffer.from(`${WP_USERNAME}:${WP_APP_PASS}`).toString("base64");

  let slug = buildSeoSlug(topic.product);

  if (await slugExistsInWordPress(auth, slug)) {
    console.log(`⚠️  Duplicate slug found for ${slug}, adding suffix`);
    slug = `${slug}-${Date.now().toString().slice(-4)}`;
  }

  const categoryId = await getCategoryId(auth, topic.category);
  console.log(`🔍 Category ID: ${categoryId} (type: ${typeof categoryId})`);
  const tagIds = await getTagIds(auth, meta.tags);
  const postTitle = ensureTitleHasYear(meta.title);

  const postPayload = {
    title:      postTitle,
    content:    content,
    slug:       slug,
    status:     "publish",
    categories: [categoryId],
    tags:       tagIds,
    meta: {
      rank_math_title:         postTitle,
      rank_math_description:   meta.metaDescription,
      rank_math_focus_keyword: meta.focusKeyword,
      rank_math_robots:        ["index", "follow"]
    }
  };

  if (featuredImageId) {
    postPayload.featured_media = featuredImageId;
  }

  const res = await retry(() =>
    fetchWithTimeout(`${WORDPRESS_URL}/wp-json/wp/v2/posts`, {
      method:  "POST",
      headers: { "Authorization": `Basic ${auth}`, "Content-Type": "application/json" },
      body:    JSON.stringify(postPayload)
    }, 20000)
  , 2, "WordPress post publish", 3000);

  const post = await res.json();
  if (!res.ok) throw new Error(`WordPress error: ${JSON.stringify(post)}`);

  console.log(`\n🎉 PUBLISHED!`);
  console.log(`📌 ${post.title.rendered}`);
  console.log(`🔗 ${WORDPRESS_URL}/${post.slug}/`);

  return post;
}

// ============================================
// MAIN
// ============================================
async function main() {
  console.log("🚀 Starting Teja Reviews — Gemini Auto Poster v4");
  console.log("=================================================");

  // Pre-flight checks
  if (!GEMINI_KEY) {
    throw new Error("Missing GEMINI_API_KEY environment variable");
  }
  if (!WP_APP_PASS) {
    throw new Error("Missing WP_APP_PASSWORD environment variable");
  }

  const topic = getTodaysTopic();
  console.log(`📦 Targeted Product: ${topic.product}`);

  if (isAlreadyPosted(topic.product)) {
    console.log("⚠️  Product already posted. Skipping to prevent duplicate content.");
    return;
  }

  try {
    const imageUrl = await fetchImage(topic.imageQuery);
    const auth = Buffer.from(`${WP_USERNAME}:${WP_APP_PASS}`).toString("base64");

    console.log("⚡ Running parallel tasks: AI content + meta + image upload...");

    const [content, meta, uploadedImg] = await Promise.all([
      generatePost(topic, imageUrl),
      generateMeta(topic),
      uploadImageToWP(auth, imageUrl, topic.product)
    ]);

    const result = await publishToWordPress(topic, content, meta, uploadedImg?.id);

    markPosted(topic.product);

    console.log("\n=================================================");
    console.log(`✅ SUCCESS: ${topic.product} is live!`);
    console.log(`🔗 URL: ${WORDPRESS_URL}/${result.slug}/`);
    console.log("=================================================\n");

  } catch (err) {
    console.error("\n❌ CRITICAL ERROR:");
    console.error(`Message: ${err.message}`);
    process.exit(1);
  }
}

main();
