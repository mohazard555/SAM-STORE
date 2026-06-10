import express from "express";
import { createServer as createViteServer } from "vite";
import fetch from "node-fetch";
import fs from "fs";
import path from "path";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  const GIST_CONFIG_PATH = path.join(process.cwd(), "gist-config.json");

  // Pre-initialize gist-config.json if it doesn't exist
  if (!fs.existsSync(GIST_CONFIG_PATH)) {
    try {
      const defaultConfig = {
        gistUrl: "https://gist.githubusercontent.com/mohazard555/6da370385392ac7cd27e034efe4b7d7c/raw/amenstor.json",
        githubToken: ""
      };
      fs.writeFileSync(GIST_CONFIG_PATH, JSON.stringify(defaultConfig, null, 2), "utf8");
    } catch (e) {
      console.error("Failed to initialize gist-config.json:", e);
    }
  }

  // Get shared sync configuration
  app.get("/api/sync-config", (req, res) => {
    try {
      if (fs.existsSync(GIST_CONFIG_PATH)) {
        const data = fs.readFileSync(GIST_CONFIG_PATH, "utf8");
        return res.json(JSON.parse(data));
      }
    } catch (e) {
      console.error("Error reading gist-config.json:", e);
    }
    res.json({
      gistUrl: "https://gist.githubusercontent.com/mohazard555/6da370385392ac7cd27e034efe4b7d7c/raw/amenstor.json",
      githubToken: ""
    });
  });

  // Save shared sync configuration
  app.post("/api/sync-config", (req, res) => {
    try {
      const { gistUrl, githubToken } = req.body;
      const config = { gistUrl: gistUrl || "", githubToken: githubToken || "" };
      fs.writeFileSync(GIST_CONFIG_PATH, JSON.stringify(config, null, 2), "utf8");
      return res.json({ success: true });
    } catch (e: any) {
      console.error("Error writing gist-config.json:", e);
      return res.status(500).json({ success: false, error: e.message });
    }
  });

  // Temporary storage for print/download jobs
  const jobs = new Map<string, { base64?: string, html?: string, filename: string, mimeType: string }>();

  // Prepare a job and return an ID
  app.post("/api/prepare-job", (req, res) => {
    const { base64, html, filename, mimeType } = req.body;
    const id = Math.random().toString(36).substring(2, 15);
    jobs.set(id, { base64, html, filename, mimeType });
    
    // Auto-delete job after 5 minutes
    setTimeout(() => jobs.delete(id), 5 * 60 * 1000);
    
    res.json({ id });
  });

  // View/Download a job by ID
  app.get("/api/view-job/:id", (req, res) => {
    const job = jobs.get(req.params.id);
    if (!job) {
      return res.status(404).send("<h1>عذراً، انتهت صلاحية هذا الرابط أو أنه غير موجود.</h1><p>يرجى المحاولة مرة أخرى من داخل التطبيق.</p>");
    }

    const action = req.query.action;

    if (action === 'print' && job.html) {
      res.send(`
        <!DOCTYPE html>
        <html dir="rtl">
        <head>
          <meta charset="UTF-8">
          <title>طباعة - ${job.filename}</title>
          <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;700&display=swap" rel="stylesheet">
          <style>
            body { font-family: 'Cairo', sans-serif; margin: 0; padding: 0; }
            @media print {
              .no-print { display: none; }
            }
            .no-print {
              background: #f3f4f6;
              padding: 15px;
              text-align: center;
              border-bottom: 1px solid #ddd;
            }
            button {
              background: #0284c7;
              color: white;
              border: none;
              padding: 10px 20px;
              border-radius: 5px;
              cursor: pointer;
              font-family: 'Cairo', sans-serif;
              font-weight: bold;
            }
          </style>
        </head>
        <body>
          <div class="no-print">
            <p>إذا لم تظهر نافذة الطباعة تلقائياً، اضغط على الزر أدناه:</p>
            <button onclick="window.print()">بدء الطباعة</button>
          </div>
          ${job.html}
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 500);
            };
          </script>
        </body>
        </html>
      `);
    } else if (job.base64) {
      const buffer = Buffer.from(job.base64, 'base64');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(job.filename)}"`);
      res.setHeader('Content-Type', job.mimeType || 'application/octet-stream');
      res.send(buffer);
    } else {
      res.status(400).send("Invalid job type");
    }
  });

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