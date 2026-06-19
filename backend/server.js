const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const os = require("os");
const { spawn } = require("child_process");

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));

// No repo folders needed: store downloads in temp directory only
const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), "allvideodownloader-"));

// Serve generated files from temp dir
app.use("/downloads", express.static(outputDir, { maxAge: "7d", index: false }));

function pickNewestFile(dir) {
  const files = fs.readdirSync(dir).map((name) => {
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    return { name, full, mtimeMs: stat.mtimeMs };
  });

  if (files.length === 0) return null;
  files.sort((a, b) => b.mtimeMs - a.mtimeMs);
  return files[0].name;
}

// POST /api/download
// Body: { url: string, site: string }
app.post("/api/download", async (req, res) => {
  try {
    const { url, site } = req.body || {};
    if (!url || typeof url !== "string") {
      return res.status(400).json({ error: "Missing or invalid url" });
    }

    // IMPORTANT: downloading from many sites may violate ToS/legality.
    // This is a minimal scaffold that relies on yt-dlp existing on the server.

    const requestId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const filenameTemplate = `video-${requestId}.%(ext)s`;
    const outputPathTemplate = path.join(outputDir, filenameTemplate);

    const beforeCount = fs.readdirSync(outputDir).length;

    const ytdlpArgs = [
      "-f",
      "best",
      "--no-playlist",
      "-o",
      outputPathTemplate,
      url,
    ];

    const child = spawn("yt-dlp", ytdlpArgs, { stdio: ["ignore", "pipe", "pipe"] });

    let stderr = "";
    child.stderr.on("data", (d) => (stderr += d.toString()));

    child.on("error", (err) => {
      return res.status(500).json({
        error: "yt-dlp is not available on the server. Install yt-dlp in the Render environment.",
        details: String(err?.message || err),
      });
    });

    child.on("close", (code) => {
      if (code !== 0) {
        return res.status(400).json({
          error: "Failed to download via yt-dlp",
          details: stderr.slice(-2000),
        });
      }

      const afterCount = fs.readdirSync(outputDir).length;
      if (afterCount <= beforeCount) {
        return res.status(500).json({
          error: "Download finished but no file was found in temp directory",
        });
      }

      const newestName = pickNewestFile(outputDir);
      if (!newestName) {
        return res.status(500).json({ error: "No downloaded file found" });
      }

      const downloadUrl = `/downloads/${encodeURIComponent(newestName)}`;
      return res.json({ downloadUrl, site: site || null });
    });
  } catch (e) {
    return res
      .status(500)
      .json({ error: "Server error", details: String(e?.message || e) });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Backend running on http://localhost:${port}`);
});
