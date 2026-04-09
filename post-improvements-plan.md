# post.js Improvement Plan

## 1. Add a `type` field to every topic

Example:

```js
{
  product: "Bluetooth Headphones",
  price: "₹1,500–₹10,000",
  category: "Tech & Audio",
  type: "best-of",
  keywords: [
    "best bluetooth headphones under 5000",
    "bluetooth headphones India"
  ]
}
```

Supported values:
- `review`
- `best-of`
- `comparison`

---

## 2. Replace generic topics with branded products where possible

Instead of:

```js
product: "Bluetooth Headphones"
```

Use:

```js
product: "boAt Rockerz 550"
type: "review"
```

Examples:

```js
{
  product: "boAt Rockerz 550",
  price: "₹1,799",
  category: "Headphones",
  type: "review",
  imageQuery: "boAt Rockerz 550 headphones",
  keywords: [
    "boAt Rockerz 550 review India",
    "best headphones under 2000"
  ]
},
{
  product: "Best Bluetooth Headphones Under ₹5000",
  price: "₹2,000–₹5,000",
  category: "Headphones",
  type: "best-of",
  imageQuery: "bluetooth headphones collection",
  keywords: [
    "best bluetooth headphones under 5000",
    "headphones India 2026"
  ]
},
{
  product: "boAt Rockerz 550 vs JBL Tune 510BT",
  price: "₹1,500–₹3,000",
  category: "Headphones",
  type: "comparison",
  imageQuery: "boAt Rockerz 550 vs JBL Tune 510BT",
  keywords: [
    "boAt Rockerz 550 vs JBL Tune 510BT",
    "best headphones under 3000"
  ]
}
```

---

## 3. Replace `generatePost()` with dynamic prompts

```js
function buildPrompt(topic, imageHtml) {
  if (topic.type === "review") {
    return `Write an in-depth product review for ${topic.product} for Indian buyers.

Include:
- Quick Verdict
- Specifications
- Pros and Cons
- Performance
- Battery / Build / Value
- Who Should Buy It
- Final Verdict

Length: 900-1200 words
Target keyword: ${topic.keywords[0]}
Use HTML formatting.
${imageHtml}`;
  }

  if (topic.type === "best-of") {
    return `Write a buying guide article titled \"${topic.product}\".

Include:
- Top 5 products with short review
- Comparison table
- Best overall / Best budget / Best premium
- Buying guide
- Final recommendation

Length: 1200-1800 words
Target keyword: ${topic.keywords[0]}
Use HTML formatting.
${imageHtml}`;
  }

  return `Write a detailed comparison article for ${topic.product}.

Include:
- Side-by-side comparison table
- Design
- Sound / Features / Battery
- Which one is better for whom
- Final Verdict

Length: 1000-1400 words
Target keyword: ${topic.keywords[0]}
Use HTML formatting.
${imageHtml}`;
}
```

Then change:

```js
const prompt = buildPrompt(topic, imageHtml);
const text = await callClaude(prompt, 1800);
```

---

## 4. Fix image caption bug

Replace:

```js
${topic.product} — ₹${topic.price}
```

With:

```js
${topic.product} — ${topic.price}
```

---

## 5. Improve slug generation

Replace:

```js
function buildSeoSlug(product) {
  return `${product} review india 2026`;
}
```

With:

```js
function buildSeoSlug(topic) {
  return `${topic.product} ${topic.type} india 2026`
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}
```

And update calls:

```js
const slug = buildSeoSlug(topic);
```

---

## 6. Replace non-core topics gradually

Keep roughly:
- 70% Tech
- 20% Adjacent lifestyle
- 10% experimental

Suggested additions:
- Power Banks
- Smart Watches
- Mechanical Keyboards
- Laptop Cooling Pads
- Budget Phones
- Portable SSDs
- Dash Cameras
- Gaming Mouse
- Webcam
- Office Chairs
