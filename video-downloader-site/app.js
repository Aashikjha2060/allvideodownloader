(() => {
  const $ = (sel) => document.querySelector(sel);

  const siteEl = $("#site");
  const urlEl = $("#url");
  const downloadBtn = $("#downloadBtn");
  const clearBtn = $("#clearBtn");
  const statusEl = $("#status");

  const API_ENDPOINT = "/api/download";

  const badge = (txt) => `<span class="badge">${txt}</span>`;

  function setStatus(kind, html) {
    if (!statusEl) return;
    statusEl.classList.remove("success", "error");
    if (kind === "success") statusEl.classList.add("success");
    if (kind === "error") statusEl.classList.add("error");
    statusEl.innerHTML = html;
  }

  function isLikelyUrl(u) {
    try {
      const parsed = new URL(u);
      return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
      return false;
    }
  }

  function getSite() {
    return (siteEl && siteEl.value) ? siteEl.value : "other";
  }

  function getUrl() {
    return (urlEl && urlEl.value) ? urlEl.value.trim() : "";
  }

  async function handleDownload() {
    const url = getUrl();
    if (!url) {
      setStatus("error", `${badge("ERROR")} Paste a video URL first.`);
      return;
    }

    if (!isLikelyUrl(url)) {
      setStatus("error", `${badge("ERROR")} Provide a valid http/https URL.`);
      return;
    }

    const site = getSite();

    downloadBtn.disabled = true;
    setStatus("info", `${badge("INFO")} Downloading...`);

    try {
      const res = await fetch(API_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, site }),
      });

      let data = null;
      try { data = await res.json(); } catch { data = null; }

      if (!res.ok) {
        const details = (data && (data.error || data.details)) ? (data.error || data.details) : (`HTTP ${res.status}`);
        setStatus("error", `${badge("ERROR")} Download failed.<br/><small>${details}</small>`);
        return;
      }

      const downloadUrl = data && data.downloadUrl ? data.downloadUrl : null;
      if (!downloadUrl) {
        setStatus("error", `${badge("ERROR")} Backend did not return downloadUrl.`);
        return;
      }

      setStatus("success", `${badge("OK")} Download started...`);
      window.location.href = downloadUrl;
    } catch (err) {
      const msg = err && err.message ? err.message : String(err);
      setStatus("error", `${badge("ERROR")} Network/server error.<br/><small>${msg}</small>`);
    } finally {
      downloadBtn.disabled = false;
    }
  }

  clearBtn?.addEventListener("click", () => {
    if (urlEl) urlEl.value = "";
    if (siteEl) siteEl.value = "other";
    setStatus("info", "");
    if (urlEl) urlEl.focus();
  });

  downloadBtn?.addEventListener("click", handleDownload);
  urlEl?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") handleDownload();
  });

  setStatus("info", `${badge("TIP")} Paste a URL and click <b>Download</b>.`);
})();
