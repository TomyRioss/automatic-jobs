// src/app/api/apply/route.js
import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { handleBumeran } from "./bumeran";
import { handleLinkedin } from "./linkedin";
import { handleZonajobs } from "./zonajobs";

const activeSessions = new Map();

export async function POST(req) {
  const { platform, email, password, keywords, location, modalities } = await req.json();
  const headersList = headers();
  const userId = headersList.get("x-user-id");

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (activeSessions.has(userId)) {
    return NextResponse.json(
      { error: "Ya hay un proceso de postulación activo para este usuario." },
      { status: 409 },
    );
  }

  const stream = new ReadableStream({
    start(controller) {
      const log = (message) => {
        controller.enqueue(`${message}\n`);
      };

      const runScraping = async () => {
        activeSessions.set(userId, { status: "running", platform });
        let browser;
        try {
          const puppeteer = (await import("puppeteer-extra")).default;
          const StealthPlugin = (await import("puppeteer-extra-plugin-stealth")).default;

          puppeteer.use(StealthPlugin());
          log("Launching browser...");

          // Configuración optimizada para Vercel
          const isProduction = process.env.NODE_ENV === "production";

          browser = await puppeteer.launch({
            headless: "new",
            args: [
              "--no-sandbox",
              "--disable-setuid-sandbox",
              "--disable-dev-shm-usage",
              "--disable-accelerated-2d-canvas",
              "--no-first-run",
              "--no-zygote",
              "--disable-gpu",
              "--disable-background-timer-throttling",
              "--disable-backgrounding-occluded-windows",
              "--disable-renderer-backgrounding",
              "--disable-features=TranslateUI",
              "--disable-ipc-flooding-protection",
              "--single-process",
              "--disable-extensions",
              "--disable-plugins",
              "--disable-images",
              "--disable-javascript",
              "--disable-web-security",
              "--disable-features=VizDisplayCompositor",
            ],
            // Usar el Chrome incluido con Puppeteer
            ignoreDefaultArgs: ["--disable-extensions"],
          });

          const page = await browser.newPage();

          // Configurar el viewport
          await page.setViewport({ width: 1280, height: 800 });

          // Configurar user agent
          await page.setUserAgent(
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          );

          log(`Starting scraping for ${platform}...`);

          if (platform === "linkedin") {
            await handleLinkedin(page, email, password, keywords, location, modalities, log);
          } else if (platform === "bumeran") {
            await handleBumeran(page, email, password, keywords, log);
          } else if (platform === "zonajobs") {
            await handleZonajobs(page, email, password, keywords, log);
          } else {
            log(`Invalid platform: ${platform}`);
            throw new Error("Plataforma no válida");
          }

          log("Scraping process finished successfully.");
        } catch (error) {
          log(`Error during scraping process: ${error.message}`);
          console.error("Error en el proceso de postulación:", error);
        } finally {
          if (browser) {
            await browser.close();
            log("Browser closed.");
          }
          activeSessions.delete(userId);
          controller.close();
        }
      };

      runScraping();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}

export async function GET() {
  const activeUsers = Array.from(activeSessions.entries()).map(([userId, data]) => ({
    userId,
    ...data,
  }));
  return NextResponse.json({ activeSessions: activeUsers });
}
