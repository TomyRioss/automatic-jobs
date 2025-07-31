// src/app/api/apply/linkedin.js
import { prisma } from "@/lib/prisma";

import { truncateJobTitle } from "./utils";

async function getJobCardsOnCurrentPage(page, log) {
  log("🔍 Buscando contenedor de ofertas...");
  try {
    await page.waitForSelector("ul.fIPvHriRZGzoNhZfdzYSlfTgbEvyrECFataA", { timeout: 15000 });
    log("✅ Lista de ofertas cargada");
  } catch (error) {
    log("❌ No se encontró la lista de ofertas con el selector principal", error);
    log("🔄 Intentando selectores alternativos...");

    const alternativeSelectors = [
      'ul[class*="jobs-search-results-list"]',
      "ul.jobs-search-results__list",
      "div.jobs-search-results-list",
      "ul.ember-view",
      "div[data-test-jobs-search-results-list]",
    ];

    let foundSelector = false;
    for (const selector of alternativeSelectors) {
      try {
        log(`🔍 Probando selector: ${selector}`);
        await page.waitForSelector(selector, { timeout: 5000 });
        log(`✅ Selector encontrado: ${selector}`);
        foundSelector = true;
        break;
      } catch (error) {
        log(`❌ Selector no encontrado: ${selector}`, error);
      }
    }

    if (!foundSelector) {
      log("❌ No se encontró ningún contenedor de ofertas");
      try {
        await page.screenshot({ path: "linkedin-no-container.png" });
        log("📸 Screenshot guardado como linkedin-no-container.png");
      } catch (error) {
        log(`❌ No se pudo guardar screenshot: ${error.message}`, error);
      }
      return [];
    }
  }

  log("⏳ Esperando que carguen todas las ofertas...");
  await new Promise((resolve) => setTimeout(resolve, 3000));

  log("🔍 Extrayendo tarjetas de ofertas...");
  let jobCards = await page.$$("ul.fIPvHriRZGzoNhZfdzYSlfTgbEvyrECFataA > li.ember-view");

  if (jobCards.length === 0) {
    log("🔄 No se encontraron ofertas con el selector principal, probando alternativos...");
    const cardSelectors = [
      "li.ember-view",
      "div.job-card-container",
      "li[data-occludable-job-id]",
      "div[data-job-id]",
      "[data-test-job-card]",
    ];

    for (const selector of cardSelectors) {
      log(`🔍 Probando selector de tarjetas: ${selector}`);
      jobCards = await page.$$(selector);
      if (jobCards.length > 0) {
        log(`✅ Encontradas ${jobCards.length} ofertas con selector: ${selector}`);
        break;
      }
    }
  }

  if (jobCards.length === 0) {
    log("📜 No se encontraron tarjetas, haciendo scroll para cargar más...");
    for (let scrollAttempt = 0; scrollAttempt < 3; scrollAttempt++) {
      log(`📜 Intento de scroll ${scrollAttempt + 1}/3`);
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await new Promise((resolve) => setTimeout(resolve, 2000));
      jobCards = await page.$$("ul.fIPvHriRZGzoNhZfdzYSlfTgbEvyrECFataA > li.ember-view");
      if (jobCards.length > 0) {
        log(`✅ Después del scroll ${scrollAttempt + 1}: ${jobCards.length} ofertas encontradas`);
        break;
      }
    }
  }

  log(`📊 Se encontraron ${jobCards.length} ofertas`);

  if (jobCards.length === 0) {
    log("⚠️ No se encontraron ofertas de trabajo");
    try {
      await page.screenshot({ path: "linkedin-no-jobs.png" });
      log("📸 Screenshot guardado como linkedin-no-jobs.png");
    } catch (e) {
      log(`❌ No se pudo guardar screenshot: ${e.message}`);
    }
  }

  return jobCards;
}

export async function handleLinkedin(page, email, password, keywords, location, modalities, log) {
  try {
    await ensureLinkedInSession(page, log);

    log("🔍 Navegando a la página de búsqueda inicial...");
    const searchKeywords = encodeURIComponent(
      keywords
        .split(",")
        .map((k) => k.trim())
        .join(" "),
    );
    const searchUrl = `https://www.linkedin.com/jobs/search/?keywords=${searchKeywords}&origin=JOBS_HOME_SEARCH_BUTTON&refresh=true`;

    await page.goto(searchUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
    log("✅ Navegación inicial completada");
    await new Promise((resolve) => setTimeout(resolve, 5000));

    if (location) {
      await ensureLocationFilter(page, location, log);
    }
    if (modalities && modalities.length > 0) {
      await ensureWorkplaceFilter(page, modalities, log);
    }

    const allAppliedJobs = [];
    const allReviewJobs = [];
    let currentPage = 1;
    const MAX_PAGES = 5;

    while (currentPage <= MAX_PAGES) {
      log(`\n📄 Procesando página ${currentPage}...`);
      const jobCards = await getJobCardsOnCurrentPage(page, log);
      if (jobCards.length === 0) {
        log("No se encontraron más ofertas en esta página. Finalizando paginación.");
        break;
      }

      const pageResults = await processJobApplications(page, jobCards, log);
      allAppliedJobs.push(...pageResults.appliedJobs);
      allReviewJobs.push(...pageResults.reviewJobs);

      log('🔍 Buscando el botón de "Siguiente"...');
      const nextButtonHandle = await page.evaluateHandle(() => {
        const spans = Array.from(document.querySelectorAll("span.artdeco-button__text"));
        const nextSpan = spans.find((span) => span.textContent?.trim() === "Siguiente");
        return nextSpan ? nextSpan.closest("button") : null;
      });

      const nextButton = nextButtonHandle.asElement();
      if (nextButton && !(await nextButton.evaluate((b) => b.disabled))) {
        log("✅ Pasando a la siguiente página...");
        await nextButton.click();
        await new Promise((resolve) => setTimeout(resolve, 5000));
        currentPage++;
      } else {
        log("⏩ No hay más páginas o el botón de siguiente no está disponible.");
        break;
      }
    }

    if (currentPage > MAX_PAGES) {
      log(`⚠️ Se alcanzó el límite de ${MAX_PAGES} páginas.`);
    }

    log("\n🏁 Proceso de LinkedIn finalizado.");
    return { appliedJobs: allAppliedJobs, reviewJobs: allReviewJobs };
  } catch (error) {
    log(`❌ Error en handleLinkedin: ${error.message}`);
    throw error;
  }
}

async function ensureLinkedInSession(page, log) {
  log("🔐 Verificando sesión de LinkedIn...");
  try {
    await page.goto("https://www.linkedin.com/feed", {
      waitUntil: "networkidle2",
      timeout: 60000,
    });
    const isLoggedIn = await checkIfLoggedIn(page, log);
    if (isLoggedIn) {
      log("✅ Sesión de LinkedIn ya activa");
      return;
    }
  } catch (error) {
    log(`⚠️ Error navegando al feed, continuando con login manual: ${error.message}`);
  }
  await handleManualLogin(page, log);
}

async function checkIfLoggedIn(page, log) {
  try {
    await page.waitForSelector("h3.profile-card-name", { timeout: 5000 });
    return true;
  } catch (error) {
    log(`❌ Error al verificar si estás logueado: ${error.message}`);
    return false;
  }
}

async function handleManualLogin(page, log) {
  log("🔑 Iniciando proceso de login manual...");
  await page.goto("https://www.linkedin.com/checkpoint/lg/sign-in-another-account", {
    waitUntil: "networkidle2",
    timeout: 60000,
  });
  log("📝 Página de login cargada. Por favor, inicia sesión manualmente...");

  const maxWaitTime = 60000;
  const checkInterval = 2000;
  let elapsedTime = 0;

  while (elapsedTime < maxWaitTime) {
    const isLoggedIn = await checkIfLoggedIn(page, log);
    if (isLoggedIn) {
      log("✅ Login manual completado exitosamente");
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, checkInterval));
    elapsedTime += checkInterval;
    if (elapsedTime % 10000 === 0) {
      const remainingTime = Math.ceil((maxWaitTime - elapsedTime) / 1000);
      log(`⏳ Esperando login... Tiempo restante: ${remainingTime}s`);
    }
  }
  throw new Error("❌ Tiempo de espera agotado para el login manual");
}

async function processJobApplications(page, jobCards, log) {
  log(`\n🚀 Iniciando procesamiento de ${jobCards.length} ofertas...`);
  const appliedJobs = [];
  const reviewJobs = [];
  const jobCardsCount = jobCards.length;

  for (let i = 0; i < jobCardsCount; i++) {
    try {
      log(`\n📝 Procesando oferta ${i + 1}/${jobCardsCount}`);
      log("🔄 Refrescando lista de ofertas...");
      const freshJobCards = await page.$$(
        "ul.fIPvHriRZGzoNhZfdzYSlfTgbEvyrECFataA > li.ember-view",
      );

      if (!freshJobCards[i]) {
        log("❌ No se encontró la tarjeta actual en la lista refrescada, saltando...");
        continue;
      }
      const currentCard = freshJobCards[i];
      log("📜 Haciendo scroll hasta la tarjeta...");
      await currentCard.scrollIntoView();
      await new Promise((resolve) => setTimeout(resolve, 1000));
      log("🔍 Verificando que la tarjeta está visible...");
      const isVisible = await currentCard.isVisible();
      if (!isVisible) {
        log("⚠️ Tarjeta no visible después del scroll, saltando...");
        continue;
      }
      log("🖱️ Haciendo clic en la tarjeta...");
      await currentCard.click();
      log("✅ Clic realizado, esperando que carguen los detalles...");
      await new Promise((resolve) => setTimeout(resolve, 3000));
      log("⏳ Tiempo de espera completado");
      const currentUrl = page.url();
      log(`📍 URL después del clic: ${currentUrl}`);
      log("📋 Extrayendo detalles de la oferta...");
      const jobDetails = await extractJobDetails(page, log);
      log(`🏢 ${jobDetails.title} - ${jobDetails.company}`);
      log('🔍 Verificando si tiene "Solicitud sencilla"...');
      const hasEasyApply = await checkForEasyApply(page, log);
      if (!hasEasyApply) {
        log('❌ No tiene "Solicitud sencilla", omitiendo...');
        continue;
      }
      log('✅ Tiene "Solicitud sencilla", procesando postulación...');
      const result = await processApplication(page, jobDetails, log);
      if (result.success) {
        log("✅ Postulación exitosa");
        appliedJobs.push(result.jobResult);
      } else {
        log("⚠️ Postulación requiere revisión");
        reviewJobs.push(result.jobResult);
      }
    } catch (error) {
      log(`❌ Error procesando oferta ${i + 1}: ${error.message}`);
      try {
        const currentUrl = page.url();
        reviewJobs.push({
          link: currentUrl,
          title: `Error en oferta ${i + 1}`,
          description: error instanceof Error ? error.message : "Error desconocido",
        });
      } catch (e) {
        log(`❌ No se pudo obtener información de la oferta con error: ${e.message}`);
      }
    }
  }
  log(`\n🎯 Resumen final: ${appliedJobs.length} exitosas, ${reviewJobs.length} para revisar`);
  return { appliedJobs, reviewJobs };
}

async function extractJobDetails(page, log) {
  const jobDetailsContainerSelector = ".job-details-jobs-unified-top-card";
  try {
    await page.waitForSelector(jobDetailsContainerSelector, { timeout: 5000 });
  } catch (error) {
    log(
      `⚠️ No se encontró el contenedor de detalles principal: ${jobDetailsContainerSelector}`,
      error,
    );
    await page.waitForSelector(".job-view-layout", { timeout: 5000 });
  }

  const result = await page.evaluate(() => {
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
    const title = getElementText([
      ".job-details-jobs-unified-top-card__job-title",
      "h1.t-24.t-bold",
      "h1",
      ".job-title",
      "h2.job-title",
    ]);
    const company = getElementText([
      ".job-details-jobs-unified-top-card__company-name",
      'a[href*="/company/"]',
      ".job-company-name",
      "div.job-details-jobs-unified-top-card__primary-description-without-company-cta > a",
    ]);
    const location = getElementText([
      ".job-details-jobs-unified-top-card__bullet",
      "span.job-location",
      'span[class*="location"]',
    ]);
    const description =
      getInnerText([
        "div.jobs-description-content__text",
        "#job-details",
        ".jobs-box__html-content",
        "div.job-details-jobs-unified-top-card__job-insight",
      ]) || "Descripción no encontrada";
    return { title, company, location, description };
  });

  result.title = truncateJobTitle(result.title);
  return result;
}

async function checkForEasyApply(page, log) {
  const easyApplySelector = 'button.jobs-apply-button[aria-label*="Solicitud sencilla"]';
  log(`🔍 Verificando si tiene "${easyApplySelector}"...`);
  try {
    await page.waitForSelector(easyApplySelector, { timeout: 3500 });
    log('✅ Botón "Solicitud sencilla" encontrado');
    return true;
  } catch (error) {
    log(`❌ Botón con selector "${easyApplySelector}" no encontrado en 10s`, error);
  }
  return false;
}

async function processApplication(page, jobDetails, log) {
  log(`🚀 Iniciando proceso de postulación para: ${jobDetails.title}`);
  try {
    const easyApplySelector = 'button.jobs-apply-button[aria-label*="Solicitud sencilla"]';
    log(`⏳ Esperando el botón "${easyApplySelector}"...`);
    await page.waitForSelector(easyApplySelector, { timeout: 10000 });
    await page.click(easyApplySelector);
    log('✅ Clic en "Solicitud sencilla"');
    const modalSelector = 'div[data-test-modal][role="dialog"]';
    log(`⏳ Esperando que se abra el modal con selector: "${modalSelector}"...`);
    await page.waitForSelector(modalSelector, { timeout: 10000 });
    log('✅ Modal de "Solicitud sencilla" abierto.');
  } catch (error) {
    log(`❌ Error al abrir o encontrar el modal de Solicitud Sencilla: ${error.message}`);
    try {
      const screenshotPath = "linkedin-modal-error.png";
      await page.screenshot({ path: screenshotPath });
      log(`📸 Screenshot de diagnóstico guardado en: ${screenshotPath}`);
    } catch (e) {
      log(`❌ No se pudo guardar el screenshot de diagnóstico: ${e.message}`);
    }
    return {
      success: false,
      jobResult: {
        ...jobDetails,
        link: page.url(),
        description: "Error al abrir el modal de Solicitud Sencilla.",
      },
    };
  }

  log("📝 Procesando formulario de postulación...");
  const success = await fillApplicationForm(page, log);

  if (success) {
    try {
      await prisma.globalStats.upsert({
        where: { id: "main_stats" },
        update: { totalApplications: { increment: 1 } },
        create: { id: "main_stats", totalApplications: 1 },
      });
      log("✅ Contador global de postulaciones incrementado.");
    } catch (error) {
      log(`❌ Error al actualizar el contador global de postulaciones: ${error.message}`);
    }
  }

  const jobResult = {
    link: page.url(),
    title: jobDetails.title,
    description: jobDetails.description,
  };

  return { success, jobResult };
}

async function fillApplicationForm(page, log) {
  const maxDuration = 120000;
  const checkInterval = 2000;
  let elapsedTime = 0;
  log('⏳ Rellenando formulario de "Solicitud sencilla"...');

  while (elapsedTime < maxDuration) {
    log(`\n🔎 Buscando campos y botones... (Tiempo: ${elapsedTime / 1000}s)`);
    await fillFormFields(page, log);

    const submitButton = await page.$('button[aria-label*="Enviar solicitud"]');
    if (submitButton) {
      log('✅ Botón "Enviar solicitud" encontrado. Haciendo clic...');
      await submitButton.click();
      log("🎉 ¡Postulación enviada exitosamente!");
      log("⏳ Esperando 2s para que aparezca el popup de confirmación...");
      await new Promise((resolve) => setTimeout(resolve, 2000));
      try {
        log("🔍 Buscando el botón para cerrar el popup de confirmación...");
        const clicked = await page.evaluate(() => {
          const use = document.querySelector('use[href="#close-medium"]');
          if (use) {
            const button = use.closest("button");
            if (button) {
              button.click();
              return true;
            }
          }
          return false;
        });
        if (clicked) {
          log("✅ Popup de confirmación cerrado.");
          await new Promise((resolve) => setTimeout(resolve, 1000));
        } else {
          log(
            "⚠️ No se encontró el botón de cierre del popup por el icono, probando por aria-label...",
          );
          const dismissButton = await page.$(
            'button[aria-label="Descartar"], button[aria-label="Cerrar"]',
          );
          if (dismissButton) {
            await dismissButton.click();
            log("✅ Popup de confirmación cerrado (por aria-label).");
            await new Promise((resolve) => setTimeout(resolve, 1000));
          } else {
            log("⚠️ No se pudo cerrar el popup de confirmación. Continuando...");
          }
        }
      } catch (error) {
        log(`❌ Error al intentar cerrar el popup de confirmación: ${error.message}`);
      }
      return true;
    }

    const reviewButton = await page.$('button[aria-label*="Revisar"]');
    if (reviewButton) {
      log('✅ Botón "Revisar" encontrado. Haciendo clic...');
      await reviewButton.click();
      await new Promise((resolve) => setTimeout(resolve, 2000));
      continue;
    }

    const nextButton = await page.$(
      'button[data-easy-apply-next-button], button[aria-label*="Ir al siguiente paso"]',
    );
    if (nextButton) {
      log('✅ Botón "Siguiente" encontrado. Haciendo clic...');
      await nextButton.click();
      await new Promise((resolve) => setTimeout(resolve, 2000));
      continue;
    }
    log("... No se encontraron botones de acción. Esperando...");
    await new Promise((resolve) => setTimeout(resolve, checkInterval));
    elapsedTime += checkInterval;
  }
  log("❌ Se superó el tiempo máximo para rellenar el formulario.");
  return false;
}

async function fillFormFields(page, log) {
  log("🖊️ Rellenando campos del formulario...");
  const textInputs = await page.$$('input[type="text"]:not([disabled])');
  for (const input of textInputs) {
    try {
      const value = await input.evaluate((el) => el.value);
      if (!value) {
        await input.type("2", { delay: 100 });
        log('... input de texto rellenado con "2".');
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    } catch (error) {
      log(`❌ Error al rellenar el input de texto: ${error.message}`);
    }
  }

  const selects = await page.$$("select:not([disabled])");
  for (const select of selects) {
    try {
      const selectedValue = await select.evaluate((el) => el.value);
      if (!selectedValue || selectedValue.toLowerCase().includes("select")) {
        const options = await select.$$("option");
        if (options.length <= 1) continue;
        let yesOptionFound = false;
        for (const option of options) {
          const optionText = await option.evaluate((el) => el.textContent?.trim().toLowerCase());
          if (optionText === "yes") {
            const optionValue = await option.evaluate((el) => el.value);
            await select.select(optionValue);
            log('... opción "Yes" seleccionada en el select.');
            yesOptionFound = true;
            break;
          }
        }
        if (yesOptionFound) continue;
        const lastOption = options[options.length - 1];
        const valueToSelect = await lastOption.evaluate((el) => el.value);
        const textToSelect = await lastOption.evaluate((el) => el.textContent?.trim());
        await select.select(valueToSelect);
        log(`... última opción ('${textToSelect}') seleccionada en el select.`);
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    } catch (error) {
      log(`❌ Error al seleccionar la última opción en el select: ${error.message}`);
    }
  }

  log("📻 Buscando preguntas de Sí/No (radio buttons)...");
  try {
    const radioButtonsHandled = await page.evaluate(() => {
      let handledCount = 0;
      const fieldsets = document.querySelectorAll(
        "fieldset[data-test-form-builder-radio-button-form-component]",
      );
      fieldsets.forEach((fieldset) => {
        const yesInput = fieldset.querySelector('input[type="radio"][value="Yes"]');
        if (yesInput && !yesInput.checked) {
          const yesLabel = fieldset.querySelector(`label[for="${yesInput.id}"]`);
          if (yesLabel) {
            yesLabel.click();
            handledCount++;
          }
        }
      });
      return handledCount;
    });
    if (radioButtonsHandled > 0) {
      log(`... ${radioButtonsHandled} preguntas de "Sí/No" respondidas.`);
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  } catch (e) {
    log(`❌ Error al procesar preguntas de radio button: ${e.message}`);
  }
}

async function ensureLocationFilter(page, userLocation, log) {
  log(`🌐 Verificando filtro de ubicación: "${userLocation}" ...`);
  try {
    const locationInputSelector = 'input[id^="jobs-search-box-location-id"]';
    await page.waitForSelector(locationInputSelector, { timeout: 10000 });
    const currentValue = await page.$eval(locationInputSelector, (el) => el.value || "");
    if (currentValue.trim().toLowerCase() === userLocation.trim().toLowerCase()) {
      log("✅ El filtro de ubicación ya está configurado correctamente.");
      return;
    }
    log("🔄 Actualizando filtro de ubicación...");
    const inputHandle = await page.$(locationInputSelector);
    if (!inputHandle) throw new Error("No se encontró el input de ubicación");
    await inputHandle.click({ clickCount: 3 });
    await page.keyboard.press("Backspace");
    await inputHandle.type(userLocation, { delay: 100 });
    await page.keyboard.press("Enter");
    log("⏳ Esperando que los resultados se actualicen con la nueva ubicación...");
    await new Promise((resolve) => setTimeout(resolve, 4000));
  } catch (error) {
    log(`❌ Error al configurar el filtro de ubicación: ${error.message}`);
  }
}

async function ensureWorkplaceFilter(page, modalities, log) {
  log(`🏢 Verificando filtro de modalidad: ${modalities.join(", ")} ...`);
  try {
    const filterButtonSelector = "button#searchFilter_workplaceType";
    await page.waitForSelector(filterButtonSelector, { timeout: 10000 });
    log("🖱️ Abriendo desplegable de modalidad...");
    await page.click(filterButtonSelector);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const optionsContainerSelector = "ul.search-reusables__collection-values-container";
    try {
      await page.waitForSelector(optionsContainerSelector, { timeout: 10000 });
      log("✅ Contenedor de opciones de modalidad visible.");
    } catch (error) {
      log(`❌ No se pudo encontrar el contenedor de opciones de modalidad. ${error.message}`);
      await page.screenshot({ path: "linkedin-modalidad-dropdown-error.png" });
      log("📸 Screenshot de diagnóstico guardado como linkedin-modalidad-dropdown-error.png");
      throw new Error("No se pudo abrir el desplegable de filtros de modalidad.");
    }
    const modalityMap = {
      presencial: "Presencial",
      hibrido: "Híbrido",
      remoto: "En remoto",
    };
    for (const mod of modalities) {
      const optionText = modalityMap[mod.toLowerCase()];
      if (!optionText) continue;
      const toggled = await page.evaluate((text) => {
        const listItems = Array.from(
          document.querySelectorAll("li.search-reusables__collection-values-item"),
        );
        const targetItem = listItems.find((item) => item.textContent?.trim().includes(text));
        if (!targetItem) return false;
        const checkbox = targetItem.querySelector('input[type="checkbox"]');
        const label = targetItem.querySelector("label.search-reusables__value-label");
        if (checkbox && !checkbox.checked && label) {
          label.click();
          return true;
        }
        return false;
      }, optionText);
      if (toggled) {
        log(`✅ Opción "${optionText}" activada.`);
        await new Promise((resolve) => setTimeout(resolve, 500));
      } else {
        log(`ℹ️ Opción "${optionText}" ya estaba activada o no se encontró.`);
      }
    }
    log("🔍 Buscando botón para aplicar filtros...");
    const applyButtonFound = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll("button"));
      const applyButton = buttons.find((button) => {
        const buttonText = button.textContent?.trim() || "";
        return buttonText.startsWith("Mostrar") && buttonText.includes("resultado");
      });
      if (applyButton) {
        applyButton.click();
        return true;
      }
      return false;
    });
    if (applyButtonFound) {
      log("✅ Botón para aplicar filtros accionado.");
      await new Promise((res) => setTimeout(res, 4000));
    } else {
      log("⚠️ No se encontró el botón para aplicar filtros, cerrando dropdown...");
      await page.click(filterButtonSelector);
    }
  } catch (error) {
    log(`❌ Error al configurar el filtro de modalidad: ${error.message}`);
  }
}
