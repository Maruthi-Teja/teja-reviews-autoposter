# Temporary Testing Change

To allow GitHub Actions testing without failing on an existing slug, temporarily replace this block in `publishToWordPress()`:

```js
const slug = buildSeoSlug(topic);
if (await slugExistsInWordPress(auth, slug)) {
  throw new Error(`Duplicate slug /${slug}/ exists!`);
}
```

With:

```js
let slug = buildSeoSlug(topic);

// TEMPORARY: allow testing even if slug already exists
if (await slugExistsInWordPress(auth, slug)) {
  console.log(`⚠️ Duplicate slug found for ${slug}, adding test suffix`);
  slug = `${slug}-test-${Date.now().toString().slice(-4)}`;
}
```

This keeps the publish working while testing and creates URLs like:

```text
/wireless-charging-desk-mat-review-india-2026-test-4821/
```

After testing is complete, you can restore the original duplicate protection logic.