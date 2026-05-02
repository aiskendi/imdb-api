const DEFAULT_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "Cache-Control": "no-cache",
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

async function apiRequestRawHtmlWithRetry(url, maxRetries = 1) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const html = await apiRequestRawHtml(url);
      if (html && html.includes("__NEXT_DATA__")) {
        return html;
      }
    } catch (error) {
      if (attempt === maxRetries) throw error;
    }
  }
  return await apiRequestRawHtml(url);
}

export default apiRequestRawHtml;
export { apiRequestRawHtml, apiRequestJson, apiRequestRawHtmlWithRetry };
