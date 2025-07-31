// src/app/api/apply/route.js
import { createRequire } from "node:module";

import { headers } from "next/headers";
import { NextResponse } from "next/server";
import vanillaPuppeteer from "puppeteer";

import { handleBumeran } from "./bumeran";
import { handleLinkedin } from "./linkedin";
import { handleZonajobs } from "./zonajobs";

const require = createRequire(import.meta.url);
const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");

puppeteer.use(StealthPlugin());

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
        controller.enqueue(`${message}\\n`);
      };

      const runScraping = async () => {
        activeSessions.set(userId, { status: "running", platform });
        let browser;
        try {
          log("Launching browser...");
          browser = await puppeteer.launch({
            headless: false,
            args: ["--no-sandbox", "--disable-setuid-sandbox"],
            executablePath: vanillaPuppeteer.executablePath(),
          });
          const page = await browser.newPage();
          await page.setViewport({ width: 1280, height: 800 });

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
