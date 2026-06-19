(() => {
  const $ = (sel) => document.querySelector(sel);

  const siteEl = $("#site");
  const urlEl = $("#url");
  const downloadBtn = $("#downloadBtn");
  const clearBtn = $("#clearBtn");
  const statusEl = $("#status");

  const API_ENDPOINT = "/api/download"; // optional: only works if you add a backend later

  const sites = {
    youtube: "YouTube",
    tiktok: "TikTok",
    instagram: "Instagram",
    facebook: "Facebook",
    x: "X (Twitter)",
    other: "Other",
  };

  function setStatus(msg, kind = "info") {
    statusEl.textContent = msg;
    statusEl.style.color =
      kind === "error" ? "var(--danger)" :
      kind === "success" ? "rgba(122,167,255,.95)" :
      "var(--muted)";
  }

  function isLikelyUrl(u) {
    try {
      const parsed = new URL(u);
      return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
      return false;
    }
  }

  function sanitizeForQuery(u) {
    // Keep it simple: we only pass to a backend later
    return u.trim();
  }

  function parseSiteFromUrl(url) {
    const u = url.toLowerCase();
    if (u.includes("youtube.com") || u.includes("youtu.be")) return "youtube";
    if (u.includes("tiktok.com")) return "tiktok";
    if (u.includes("instagram.com")) return "instagram";
    if (u.includes("facebook.com")) return "facebook";
    if (u.includes("twitter.com") || u.includes("x.com")) return "x";
    return "other";
  }

  function getPayload() {
    const url = sanitizeForQuery(urlEl.value);
    const selected = siteEl.value;
    const site = selected === "other" ? parseSiteFromUrl(url) : selected;
    return { url, site };
  }

  async function handleDownload() {
    const url = urlEl.value.trim();
    if (!url) {
      setStatus("Paste a video URL first.", "error");
      return;
    }
    if (!isLikelyUrl(url)) {
      setStatus("That doesn’t look like a valid http/https URL.", "error");
      return;
    }

    const { site } = getPayload();
    const siteName = sites[site] || "Selected site";
    const { url: safeUrl } = getPayload();

    setStatus(`Validated: ${siteName}. Preparing download...`, "info");

    // Static-only behavior:
    // We can't directly download from those sites via browser. We either:
    // 1) Call an optional backend endpoint, or
    // 2) Show instructions to connect one.
    try {
      const res = await fetch(API_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: safeUrl, site }),
      });

      if (!res.ok) {
        throw new Error(`Backend returned HTTP ${res.status}`);
      }

      // Expected response shapes (your backend can choose one):
      // { downloadUrl: "https://..." }
      // or { fileUrl: "https://..." }
      const data = await res.json();
      const downloadUrl = data.downloadUrl || data.fileUrl;

      if (!downloadUrl) {
        throw new Error("Backend did not return downloadUrl/fileUrl");
      }

      setStatus("Download link received. Starting download...", "success");

      // Trigger download by navigating to the URL (works when backend sets correct headers)
      window.location.href = downloadUrl;
    } catch (err) {
      console.warn(err);
      setStatus(
        "Static UI mode: real downloading needs a server-side downloader.\n" +
        "Add a backend endpoint at /api/download that returns { downloadUrl }. " +
        `For now, your validated URL was: ${safeUrl}`,
        "error"
      );
    }
  }

  downloadBtn.addEventListener("click", handleDownload);

  clearBtn.addEventListener("click", () => {
    urlEl.value = "";
    siteEl.value = "other";
    setStatus("", "info");
    urlEl.focus();
  });

  urlEl.addEventListener("input", () => {
    // If user switches site selector to "Other", we can auto-detect lightly
    if (siteEl.value !== "other") return;
    const url = urlEl.value.trim();
    if (!url || !isLikelyUrl(url)) return;
    const detected = parseSiteFromUrl(url);
    // Don't force-change if user already typed; keep "Other" but show a message via status
    setStatus(`Detected: ${sites[detected] || "Other"} (select a specific site if needed).`, "info");
  });
})();
