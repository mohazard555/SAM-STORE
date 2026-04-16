import express from "express";
import { createServer as createViteServer } from "vite";
import fetch from "node-fetch";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  // API route for proxied downloads (useful for WebViews)
  app.post("/api/download", (req, res) => {
    const { base64, filename, mimeType } = req.body;
    if (!base64 || !filename) {
      return res.status(400).send("Missing data");
    }
    try {
      const buffer = Buffer.from(base64, 'base64');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
      res.setHeader('Content-Type', mimeType || 'application/octet-stream');
      res.send(buffer);
    } catch (error) {
      console.error('Download error:', error);
      res.status(500).send("Error processing download");
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
    app.get("*", (req, res) => {
      res.sendFile("dist/index.html", { root: "." });
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();