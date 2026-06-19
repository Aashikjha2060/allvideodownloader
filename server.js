const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));

const outputDir = path.join(__dirname, "downloads");
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

// Serve generated files
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

    // SECURITY NOTE:
    // Accepting arbitrary URLs and downloading media can be dangerous and may
    // violate site ToS / legal restrictions. This implementation is a minimal scaffold.

    // Use a unique filename per request so multiple concurrent calls don't overwrite.
    const requestId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const filenameTemplate = `video-${requestId}.%(ext)s`;
    const outputPathTemplate = path.join(outputDir, filenameTemplate);

    const before = fs.existsSync(outputDir) ? fs.readdirSync(outputDir).length : 0;

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
        error:
          "yt-dlp is not available on the server. Install yt-dlp in the Render environment.",
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

      // Pick newest file from downloads directory
      // (yt-dlp writes the file asynchronously; after close it should exist)
      const afterFileCount = fs.readdirSync(outputDir).length;
      if (afterFileCount <= before) {
        return res.status(500).json({
          error: "Download finished but no file was found in downloads directory",
        });
      }

      const newestName = pickNewestFile(outputDir);
      if (!newestName) {
        return res.status(500).json({ error: "No downloaded file found" });
      }

      const downloadUrl = `/downloads/${encodeURIComponent(newestName)}`;

      return res.json({
        downloadUrl,
        site: site || null,
      });
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
