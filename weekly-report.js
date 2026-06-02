import fetch from "node-fetch";
import fs from "fs";

// ============================================
// Teja Reviews — Weekly SEO Report (Phase 4A)
// Runs every Sunday via GitHub Actions
// Analyzes last 7 days → posts private WP draft
// ============================================

const WORDPRESS_URL = "https://tejareviews.in";
const WP_USERNAME   = "maruthiteja456@gmail.com";
const WP_APP_PASS   = process.env.WP_APP_PASSWORD || process.env.WP_PASS;
const GEMINI_KEY    = process.env.GEMINI_API_KEY;
const SEO_YEAR      = 2026;

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

async function callGemini(prompt, maxTokens = 1500) {
  console.log("📡 Calling Gemini for analysis…");
  const res = await fetchWithTimeout(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${GEMINI_KEY}`,
    {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        contents:         [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: maxTokens, temperature: 0.6 }
      })
    },
    API_TIMEOUT_MS
  );
  const data = await res.json();
  if (!res.ok) throw new Error(`Gemini error: ${JSON.stringify(data)}`);
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

async function getRecentPosts(auth) {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const since = sevenDaysAgo.toISOString();

  const res = await fetchWithTimeout(
    `${WORDPRESS_URL}/wp-json/wp/v2/posts?per_page=30&after=${since}&status=publish&_fields=id,title,slug,link,categories,date`,
    { headers: { Authorization: `Basic ${auth}` } }
  );
  if (!res.ok) throw new Error(`WP posts fetch failed: ${res.status}`);
  return res.json();
}

async function getAllPublishedPosts(auth) {
  const res = await fetchWithTimeout(
    `${WORDPRESS_URL}/wp-json/wp/v2/posts?per_page=50&status=publish&orderby=date&order=desc&_fields=id,title,slug,link,date`,
    { headers: { Authorization: `Basic ${auth}` } }
  );
  if (!res.ok) return [];
  return res.json();
}

async function publishReportToWordPress(auth, reportHtml, weekLabel) {
  const title = `Weekly SEO Report — ${weekLabel}`;
  console.log(`📤 Publishing report draft: "${title}"…`);

  const payload = {
    title,
    content: reportHtml,
    status:  "private",
    slug:    `seo-report-${weekLabel.replace(/\s+/g, "-").toLowerCase()}`
  };

  const res = await fetchWithTimeout(
    `${WORDPRESS_URL}/wp-json/wp/v2/posts`,
    {
      method:  "POST",
      headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
      body:    JSON.stringify(payload)
    },
    20000
  );

  const post = await res.json();
  if (!res.ok) throw new Error(`WP publish failed: ${JSON.stringify(post)}`);
  console.log(`✅ Report published (private): ${WORDPRESS_URL}/?p=${post.id}`);
  return post;
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

async function main() {
  console.log("📊 Teja Reviews — Weekly SEO Report");
  console.log("=====================================");

  if (!GEMINI_KEY)  throw new Error("Missing GEMINI_API_KEY");
  if (!WP_APP_PASS) throw new Error("Missing WP_APP_PASSWORD");

  const auth = Buffer.from(`${WP_USERNAME}:${WP_APP_PASS}`).toString("base64");

  const today     = new Date();
  const weekStart = new Date(today); weekStart.setDate(today.getDate() - 7);
  const weekLabel = `${formatDate(weekStart.toISOString())} – ${formatDate(today.toISOString())}`;

  console.log(`📅 Report period: ${weekLabel}`);

  // Fetch data
  const [recentPosts, allPosts] = await Promise.all([
    getRecentPosts(auth),
    getAllPublishedPosts(auth)
  ]);

  console.log(`📝 Posts this week: ${recentPosts.length}`);
  console.log(`📚 Total posts: ${allPosts.length}`);

  // Build post list for Gemini
  const weekPostList = recentPosts.length > 0
    ? recentPosts.map(p => `- "${p.title.rendered}" → /${p.slug}/`).join("\n")
    : "No new posts this week.";

  const allPostList = allPosts.slice(0, 40)
    .map(p => `- "${p.title.rendered}" [${formatDate(p.date)}]`).join("\n");

  // Gemini analysis
  const analysisPrompt = `You are an SEO strategist for Teja Reviews (tejareviews.in), an Indian affiliate review blog.
Analyze the following data and generate a weekly SEO report in clean HTML.

POSTS PUBLISHED THIS WEEK (${weekLabel}):
${weekPostList}

ALL PUBLISHED POSTS (latest 40):
${allPostList}

Generate a weekly SEO report with these exact sections in HTML (no markdown, no code fences):

<h2>📈 This Week's Summary</h2>
- Number of posts published
- Post types breakdown (reviews/buying guides/comparisons)
- Overall content pace assessment

<h2>🔍 Content Quality Observations</h2>
- 3-4 observations about the content mix, title patterns, SEO opportunity

<h2>🔗 Internal Linking Gaps</h2>
- Identify 3-5 posts that should link to each other (be specific with post titles)

<h2>✏️ Title Improvement Suggestions</h2>
- Pick 3 posts from this week and suggest improved, more clickable SEO titles

<h2>💡 Topic Gap Analysis</h2>
- 5 product/topic ideas NOT yet covered that would complement the existing content

<h2>📋 Next Week Recommendations</h2>
- 3 specific action items for next week

Keep each section concise and actionable. Output ONLY the HTML sections above.`;

  const analysisHtml = await callGemini(analysisPrompt, 2000);

  // Build full report
  const reportHtml = `
<div style="font-family:sans-serif;max-width:900px;margin:0 auto;">
  <div style="background:#1a1a2e;color:#fff;padding:24px;border-radius:12px;margin-bottom:24px;">
    <h1 style="margin:0;font-size:24px;">📊 Weekly SEO Report</h1>
    <p style="margin:8px 0 0;opacity:0.8;">${weekLabel} · tejareviews.in · Generated by Gemini</p>
  </div>

  <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:16px;margin-bottom:24px;">
    <strong>Quick Stats:</strong>
    Posts this week: <strong>${recentPosts.length}</strong> &nbsp;|&nbsp;
    Total published: <strong>${allPosts.length}</strong> &nbsp;|&nbsp;
    Target pace: <strong>21/week</strong> (3×/day)
  </div>

  ${analysisHtml.replace(/```html/gi, "").replace(/```/g, "")}

  <hr style="margin:32px 0;">
  <div style="background:#f9fafb;border-radius:8px;padding:16px;font-size:13px;color:#666;">
    <strong>Posts published this week:</strong>
    <ul>
      ${recentPosts.map(p => `<li><a href="${p.link}">${p.title.rendered}</a> — ${formatDate(p.date)}</li>`).join("")}
    </ul>
  </div>
</div>`;

  await publishReportToWordPress(auth, reportHtml, weekLabel);

  console.log("\n✅ Weekly report complete!");
  console.log(`📊 View at: ${WORDPRESS_URL}/wp-admin/edit.php`);
}

main().catch(err => {
  console.error("❌ Report failed:", err.message);
  process.exit(1);
});
