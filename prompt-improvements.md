# Prompt Improvements for `post.js`

Replace the current prompt in `generatePost()` with a prompt builder that changes based on `topic.type`.

```js
function buildPrompt(topic, imageHtml) {
  const amazonBox = `
<div style="background:#fff8e6;border:2px solid #FF9900;border-radius:8px;padding:1.5rem;text-align:center;margin:2rem 0;">
  <p style="font-weight:bold;margin-bottom:12px;">Check Latest Price on Amazon India</p>
  <a href="https://www.amazon.in/s?k=${encodeURIComponent(topic.product)}&tag=maruthiteja-21"
     target="_blank"
     rel="noopener noreferrer"
     style="background:#FF9900;color:#000;padding:10px 24px;border-radius:6px;text-decoration:none;font-weight:bold;display:inline-block;">
     👉 View on Amazon
  </a>
</div>`;

  if (topic.type === "review") {
    return `
You are writing an expert SEO-friendly review for Indian buyers.

Topic: ${topic.product}
Primary keyword: ${topic.keywords[0]}
Secondary keyword: ${topic.keywords[1] || ""}
Price: ${topic.price}

Rules:
- Write naturally and avoid generic filler.
- Mention real-world use cases for Indian buyers.
- Mention price and whether it is worth buying.
- Include the year 2026 in the intro and conclusion.
- Use short paragraphs.
- Use only HTML.
- Do NOT mention you are an AI.

Structure:
<h2>Quick Verdict</h2>
2 short sentences with star rating.

${imageHtml}

<h2>Key Specifications</h2>
Use an HTML table.

<h2>Design and Build Quality</h2>

<h2>Performance</h2>

<h2>Battery Life / Features</h2>

<h2>Pros and Cons</h2>
Use bullet points.

<h2>Who Should Buy ${topic.product}?</h2>

<h2>Final Verdict</h2>
Recommend whether it is worth buying in India in 2026.

${amazonBox}
`;
  }

  if (topic.type === "best-of") {
    return `
You are writing a high-converting buying guide for Indian buyers.

Topic: ${topic.product}
Primary keyword: ${topic.keywords[0]}
Price Range: ${topic.price}

Rules:
- Create a useful article that can rank on Google.
- Mention only products available in India.
- Include 5 products.
- Mention approximate prices.
- Use only HTML.
- Include a comparison table.
- Mention best overall, best budget and best premium.
- Keep the tone practical and easy to read.

Structure:
<h2>Best ${topic.product} in India (2026)</h2>
Short introduction.

<h2>Quick Comparison Table</h2>
Use an HTML table with Product, Price, Best For and Rating.

Then for each of the 5 products:
<h3>1. Product Name</h3>
- Short description
- Key features
- Pros
- Cons
- Best for whom

<h2>Buying Guide</h2>
Explain what buyers should look for before purchasing.

<h2>Final Recommendation</h2>
Mention best overall, best budget and best premium.

${amazonBox}
`;
  }

  return `
You are writing a comparison article for Indian buyers.

Topic: ${topic.product}
Primary keyword: ${topic.keywords[0]}

Rules:
- Compare both products honestly.
- Use specific differences.
- Mention which one is better for different users.
- Use only HTML.

Structure:
<h2>${topic.product}: Quick Comparison</h2>
Use an HTML table comparing price, design, battery, features and value.

${imageHtml}

<h2>Design and Comfort</h2>

<h2>Performance and Features</h2>

<h2>Battery and Charging</h2>

<h2>Which One Should You Buy?</h2>
Recommend one for budget buyers and one for premium buyers.

<h2>Final Verdict</h2>

${amazonBox}
`;
}
```

Then replace this:

```js
const prompt = `Write a short, punchy product review...`;
const text = await callClaude(prompt, 1200);
```

With:

```js
const prompt = buildPrompt(topic, imageHtml);
const maxTokens = topic.type === "best-of" ? 2200 : 1600;
const text = await callClaude(prompt, maxTokens);
```

# Additional Improvements

## Add internal links at the end of each post

```js
content += `
<hr>
<h3>Related Articles</h3>
<ul>
  <li><a href="/category/headphones/">More Headphone Reviews</a></li>
  <li><a href="/category/${topic.category.toLowerCase().replace(/\s+/g, "-")}/">More in ${topic.category}</a></li>
</ul>`;
```

## Add FAQ schema inside the article

Append this before publishing:

```js
content += `
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "Is ${topic.product} worth buying in 2026?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes, ${topic.product} is a good option for Indian buyers based on price and features."
      }
    }
  ]
}
</script>`;
```

## Improve meta title generation

```js
if (topic.type === "review") {
  meta.title = `${topic.product} Review India 2026: Worth Buying?`;
}

if (topic.type === "best-of") {
  meta.title = `Best ${topic.product} in India 2026`;
}

if (topic.type === "comparison") {
  meta.title = `${topic.product} Comparison 2026`;
}
```

## Better slug format

```js
function buildSeoSlug(topic) {
  return `${topic.product} ${topic.type} india 2026`
    .toLowerCase()
    .replace(/₹/g, "rs")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}
```
