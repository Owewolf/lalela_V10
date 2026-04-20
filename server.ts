import "dotenv/config";
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import apiRouter from "./src/server/api.js";

async function startServer() {
  const app = express();
  const port = Number(process.env.PORT || 3001);
  const isProduction = process.env.NODE_ENV === "production";

  app.use(express.json());
  app.use("/api", apiRouter);

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });

    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve("dist");

    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(port, "0.0.0.0", () => {
    console.log(`Server running on port ${port}`);
    console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
  });
}

startServer().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});