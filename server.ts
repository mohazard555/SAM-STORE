import express from "express";
import { createServer as createViteServer } from "vite";
import fetch from "node-fetch";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  // API Route for Sync Proxy (GET gist info)
  app.get("/api/sync", async (req, res) => {
    const { gistId } = req.query;
    const token = process.env.GITHUB_TOKEN;

    if (!token || token.trim() === "") {
      return res.status(500).json({ 
        message: "GITHUB_TOKEN is missing or empty in environment variables. Please add it to the platform settings." 
      });
    }

    try {
      const response = await fetch(`https://api.github.com/gists/${gistId}`, {
        headers: { 
          'Authorization': `Bearer ${token.trim()}`, 
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'Warehouse-App-Proxy'
        }
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        return res.status(response.status).json({
          message: data.message || "GitHub API Error",
          status: response.status,
          hint: response.status === 404 ? "Gist not found. Check if Gist ID is correct and token has 'gist' scope." : undefined
        });
      }
      
      res.status(200).json(data);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // API Route for Sync Proxy (PATCH gist content)
  app.post("/api/sync", async (req, res) => {
    const { gistId } = req.query;
    const body = req.body;
    const token = process.env.GITHUB_TOKEN;

    if (!token || token.trim() === "") {
      return res.status(500).json({ 
        message: "GITHUB_TOKEN is missing or empty in environment variables." 
      });
    }

    if (!gistId) {
      return res.status(400).json({ 
        message: "Missing gistId in query parameters." 
      });
    }

    try {
      const response = await fetch(`https://api.github.com/gists/${gistId}`, {
        method: 'PATCH',
        headers: { 
          'Authorization': `Bearer ${token.trim()}`, 
          'Accept': 'application/vnd.github.v3+json', 
          'Content-Type': 'application/json',
          'User-Agent': 'Warehouse-App-Proxy'
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (response.ok) {
        res.status(200).json(data);
      } else {
        res.status(response.status).json({
          message: data.message || "GitHub API error",
          status: response.status,
          hint: response.status === 404 ? "Gist not found or token lacks permissions." : undefined
        });
      }
    } catch (error: any) {
      console.error("Proxy sync error:", error);
      res.status(500).json({ 
        message: error.message || "Internal server error during sync proxy." 
      });
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
