The failure is happening because WordPress requests from GitHub Actions are being rejected or timing out. `fetchWithTimeout()` currently sends almost no headers.

In `post.js`, update `fetchWithTimeout()`.

Replace:

```js
const response = await fetch(url, {
  ...options,
  signal: controller.signal,
  timeout: timeoutMs
});
```

with:

```js
const response = await fetch(url, {
  ...options,
  signal: controller.signal,
  headers: {
    "User-Agent": "TejaReviewsBot/1.0",
    "Accept": "application/json",
    ...(options.headers || {})
  }
});
```

Then in `uploadImageToWP()`, replace:

```js
const uploadRes = await retry(() =>
  fetchWithTimeout(`${WORDPRESS_URL}/wp-json/wp/v2/media`, {
```

with:

```js
const uploadRes = await retry(() =>
  fetchWithTimeout(`${WORDPRESS_URL}/wp-json/wp/v2/media`, {
    compress: false,
```

Finally, in every WordPress request, change:

```js
https://tejareviews.in/wp-json/wp/v2/
```

to:

```js
https://www.tejareviews.in/wp-json/wp/v2/
```

So at the top of the file replace:

```js
const WORDPRESS_URL = "https://tejareviews.in";
```

with:

```js
const WORDPRESS_URL = "https://www.tejareviews.in";
```

Your domain likely redirects from non-www to www, and GitHub Actions + node-fetch sometimes fails across that redirect when authentication headers are present.
