const DEFAULT_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) ApleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "Cache-Control": "no-cache",
  Pragma: "no-cache",
  "Sec-Ch-Ua":
    '"Chromium";v="126", "Google Chrome";v="126", "Not-A.Brand";v="8"',
  "Sec-Ch-Ua-Mobile": "?0",
  "Sec-Ch-Ua-Platform": '"Windows"',
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "none",
  "Sec-Fetch-User": "?1",
  "Upgrade-Insecure-Requests": "1",
};

async function apiRequestRawHtml(url) {
  let response = await fetch(url, {
    headers: DEFAULT_HEADERS,
    redirect: "follow",
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} fetching ${url}`);
  }

  let text = await response.text();
  return text;
}

async function apiRequestJson(url) {
  let response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
      Accept: "application/json, text/plain, */*",
      "Accept-Language": "en-US,en;q=0.9",
    },
  });

  let json = await response.json();
  return json;
}

// Cloudflare Workers compatible delay
function delay(ms) {
  return new Promise((resolve) => {
    const start = Date.now();
    while (Date.now() - start < ms) {
      // busy wait - not ideal but works in Workers
    }
    resolve();
  });
}

// Retry with fallback
async function apiRequestRawHtmlWithRetry(url, maxRetries = 2) {
  let lastError = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const html = await apiRequestRawHtml(url);

      if (html && html.includes("__NEXT_DATA__")) {
        return html;
      }

      // Got HTML but no __NEXT_DATA__, try different headers
      if (attempt < maxRetries) {
        const altResponse = await fetch(url, {
          headers: {
            ...DEFAULT_HEADERS,
            "User-Agent":
              "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) ApleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0 Safari/537.36",
            Cookie: "",
          },
          redirect: "follow",
        });

        const altHtml = await altResponse.text();
        if (altHtml && altHtml.includes("__NEXT_DATA__")) {
          return altHtml;
        }
      }
    } catch (error) {
      lastError = error;
    }
  }

  // Return whatever we got even without __NEXT_DATA__
  try {
    const html = await apiRequestRawHtml(url);
    return html;
  } catch (e) {
    throw lastError || e;
  }
}

export {
  apiRequestRawHtml,
  apiRequestJson,
  apiRequestRawHtmlWithRetry,
};
