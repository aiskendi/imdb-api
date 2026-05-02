import config from "../../config.js";

async function cache(c, next) {
  const key = c.req.url;
  const cacheStore = await caches.default;
  const response = await cacheStore.match(key);

  function getCacheTTL() {
    try {
      let url = key.toString().toLowerCase();
      if (url.includes("/reviews")) return 60 * 60 * 24;
      if (url.includes("/title")) return 60 * 24;
      if (url.includes("/search")) return 60 * 24 * 2;
    } catch (_) {}
    return 86400;
  }

  if (!response) {
    await next();

    if (c.res.status === 200 && !config.cacheDisabled) {
      // Check if response contains error before caching
      try {
        const clonedRes = c.res.clone();
        const body = await clonedRes.json();

        // Don't cache errors or partial data
        if (body.error || body._partial) {
          return;
        }
      } catch (_) {
        // Not JSON or parse failed - skip check
      }

      c.res.headers.append(
        "Cache-Control",
        `public, max-age=${getCacheTTL()}`
      );
      await cacheStore.put(key, c.res.clone());
    }
    return;
  } else {
    for (let [k, value] of response.headers.entries()) {
      c.res.headers.set(k, value);
    }
    return c.json(await response.json());
  }
}

export { cache };
