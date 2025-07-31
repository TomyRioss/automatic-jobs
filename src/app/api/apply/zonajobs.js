// src/app/api/apply/zonajobs.js
import { prisma } from "@/lib/prisma";

import { truncateJobTitle } from "./utils";

export async function handleZonajobs(page, email, password, keywords, log) {
  log("Navegando a la página de login de Zonajobs...");
  await page.goto("https://www.zonajobs.com.ar/login", {
    waitUntil: "networkidle2",
  });

  log("Esperando a que el formulario de login esté visible...");
  await page.waitForSelector("#email", { visible: true, timeout: 10000 });

  log("Ingresando credenciales...");
  await page.type("#email", email);
  await page.type("#password", password);

  log("Haciendo clic en 'Ingresar' y esperando la navegación...");
  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle2" }),
    page.click("#ingresar"),
  ]);

  log("Login exitoso. Navegando a la página de perfil para confirmar...");
  await page.goto("https://www.zonajobs.com.ar/postulantes/perfil", {
    waitUntil: "networkidle2",
  });

  await page.waitForSelector("p", { timeout: 15000 });
  log("¡Confirmación de sesión en Zonajobs exitosa!");

  const searchKeywords = keywords
    .split(",")
    .map((k) => k.trim())
    .join("-");
  const searchUrl = `https://www.zonajobs.com.ar/empleos-busqueda-${encodeURIComponent(
    searchKeywords,
  )}.html`;

  log(`Navegando a la URL de búsqueda: ${searchUrl}`);
  await page.goto(searchUrl, { waitUntil: "networkidle2" });

  log("Búsqueda completada. Esperando a que carguen los resultados...");
  try {
    await page.waitForSelector("a.sc-gVZiCL", { timeout: 10000 });
    log("Resultados de búsqueda encontrados.");
  } catch (error) {
    log(`No se encontraron resultados de búsqueda para estas palabras clave: ${error.message}`);
    return { appliedJobs: [], reviewJobs: [] };
  }

  const appliedJobs = [];
  const reviewJobs = [];
  let currentPage = 1;
  const MAX_PAGES = 5;

  while (currentPage <= MAX_PAGES) {
    log(`\n📄 Procesando página ${currentPage} de Zonajobs...`);

    const jobLinks = await page.$$eval("a.sc-gVZiCL", (links) => {
      const uniqueLinks = new Set();
      links.forEach((a) => {
        const href = a.href;
        if (href && href.includes("/empleos/")) {
          uniqueLinks.add(href);
        }
      });
      return Array.from(uniqueLinks);
    });

    log(`Se encontraron ${jobLinks.length} ofertas en la página ${currentPage}.`);

    if (jobLinks.length === 0) {
      log("No se encontraron más ofertas, finalizando.");
      break;
    }

    for (const link of jobLinks) {
      try {
        log(`Navegando a la oferta: ${link}`);
        await page.goto(link, { waitUntil: "networkidle2" });

        const jobDetails = await page.evaluate(() => {
          const getElementText = (selectors) => {
            for (const selector of selectors) {
              const element = document.querySelector(selector);
              if (element) return element.textContent?.trim() || "";
            }
            return "N/A";
          };

          const getInnerText = (selectors) => {
            for (const selector of selectors) {
              const element = document.querySelector(selector);
              if (element) return element.innerText?.trim() || "";
            }
            return "N/A";
          };

          const title = getElementText(["h1.sc-iAvgwm", "h1.titulo-aviso", "h1"]);
          const description =
            getInnerText([
              "div.descripcion-aviso",
              "div.job-description",
              ".job-details-description",
            ]) || "Descripción no encontrada";

          return { title, description };
        });

        jobDetails.title = truncateJobTitle(jobDetails.title);

        const applyButtonSelector = 'button[form="form-salario-pretendido"], #btn-postularme';
        const applyButton = await page
          .waitForSelector(applyButtonSelector, { timeout: 5000, visible: true })
          .catch(() => null);

        if (applyButton) {
          log("Botón de postulación encontrado. Haciendo clic...");
          await applyButton.click();

          log("Postulación enviada. Esperando confirmación...");
          await page.waitForFunction(
            (selector) => {
              const button = document.querySelector(selector);
              return !button || button.disabled;
            },
            { timeout: 10000 },
            applyButtonSelector,
          );

          log(`[ÉXITO] Postulación enviada para: ${link}`);
          appliedJobs.push({ link, ...jobDetails });
          try {
            await prisma.globalStats.upsert({
              where: { id: "main_stats" },
              update: { totalApplications: { increment: 1 } },
              create: { id: "main_stats", totalApplications: 1 },
            });
            log("✅ Contador global de postulaciones de Zonajobs incrementado.");
          } catch (error) {
            log(
              `❌ Error al actualizar el contador de postulaciones de Zonajobs: ${error.message}`,
            );
          }
        } else {
          log(
            `[INFO] No se encontró botón de postulación para: ${link}. Es posible que ya te hayas postulado.`,
          );
          reviewJobs.push({ link, ...jobDetails });
        }
      } catch (jobError) {
        const errorMessage = jobError instanceof Error ? jobError.message : "Error desconocido";
        log(
          `Error procesando ${link}. Puede que la postulación requiera pasos adicionales: ${errorMessage}`,
        );
        reviewJobs.push({ link, title: "Error", description: errorMessage });
      }
    }

    try {
      log('🔍 Buscando el botón de "Siguiente"...');
      const nextButton = await page.evaluateHandle(() => {
        const icon = document.querySelector('i[name="icon-light-caret-right"]');
        return icon ? icon.closest("a, button") : null;
      });

      const nextButtonElement = nextButton.asElement();
      if (nextButtonElement) {
        log("✅ Pasando a la siguiente página...");
        await nextButtonElement.click();
        await page.waitForNavigation({
          waitUntil: "networkidle2",
          timeout: 30000,
        });
        currentPage++;
      } else {
        log("⏩ No hay más páginas o botón no encontrado.");
        break;
      }
    } catch (error) {
      log(`Error durante la paginación, finalizando: ${error.message}`);
      break;
    }
  }
  return { appliedJobs, reviewJobs };
}
