import { Page } from 'puppeteer';

interface JobDetails {
  title: string;
  company: string;
  location: string;
  description: string;
}

interface JobResult {
  link: string;
  title: string;
  description: string;
}

async function getJobCardsOnCurrentPage(page: Page): Promise<any[]> {
  // Esperar a que carguen los resultados usando el selector correcto
  console.log('🔍 Buscando contenedor de ofertas...');
  try {
    await page.waitForSelector('ul.fIPvHriRZGzoNhZfdzYSlfTgbEvyrECFataA', {
      timeout: 15000,
    });
    console.log('✅ Lista de ofertas cargada');
  } catch (error) {
    console.log(
      '❌ No se encontró la lista de ofertas con el selector principal',
    );

    // Intentar con selectores alternativos
    console.log('🔄 Intentando selectores alternativos...');

    const alternativeSelectors = [
      'ul[class*="jobs-search-results-list"]',
      'ul.jobs-search-results__list',
      'div.jobs-search-results-list',
      'ul.ember-view',
      'div[data-test-jobs-search-results-list]',
    ];

    let foundSelector = false;
    for (const selector of alternativeSelectors) {
      try {
        console.log(`🔍 Probando selector: ${selector}`);
        await page.waitForSelector(selector, { timeout: 5000 });
        console.log(`✅ Selector encontrado: ${selector}`);
        foundSelector = true;
        break;
      } catch (e) {
        console.log(`❌ Selector no encontrado: ${selector}`);
      }
    }

    if (!foundSelector) {
      console.log('❌ No se encontró ningún contenedor de ofertas');
      // Tomar screenshot para debug
      try {
        await page.screenshot({ path: 'linkedin-no-container.png' });
        console.log('📸 Screenshot guardado como linkedin-no-container.png');
      } catch (e) {
        console.log('❌ No se pudo guardar screenshot');
      }
      return [];
    }
  }

  // Esperar un poco más para que carguen todas las ofertas
  console.log('⏳ Esperando que carguen todas las ofertas...');
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Obtener todas las tarjetas de ofertas usando el selector correcto
  console.log('🔍 Extrayendo tarjetas de ofertas...');
  let jobCards = await page.$$(
    'ul.fIPvHriRZGzoNhZfdzYSlfTgbEvyrECFataA > li.ember-view',
  );

  if (jobCards.length === 0) {
    console.log(
      '🔄 No se encontraron ofertas con el selector principal, probando alternativos...',
    );

    // Intentar selectores alternativos para las tarjetas
    const cardSelectors = [
      'li.ember-view',
      'div.job-card-container',
      'li[data-occludable-job-id]',
      'div[data-job-id]',
      '[data-test-job-card]',
    ];

    for (const selector of cardSelectors) {
      console.log(`🔍 Probando selector de tarjetas: ${selector}`);
      jobCards = await page.$$(selector);
      if (jobCards.length > 0) {
        console.log(
          `✅ Encontradas ${jobCards.length} ofertas con selector: ${selector}`,
        );
        break;
      }
    }
  }

  // Si aún no hay tarjetas, hacer scroll para cargar más
  if (jobCards.length === 0) {
    console.log(
      '📜 No se encontraron tarjetas, haciendo scroll para cargar más...',
    );

    // Hacer scroll varias veces para cargar más contenido
    for (let scrollAttempt = 0; scrollAttempt < 3; scrollAttempt++) {
      console.log(`📜 Intento de scroll ${scrollAttempt + 1}/3`);
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Intentar obtener tarjetas nuevamente
      jobCards = await page.$$(
        'ul.fIPvHriRZGzoNhZfdzYSlfTgbEvyrECFataA > li.ember-view',
      );
      if (jobCards.length > 0) {
        console.log(
          `✅ Después del scroll ${scrollAttempt + 1}: ${
            jobCards.length
          } ofertas encontradas`,
        );
        break;
      }
    }
  }

  console.log(`📊 Se encontraron ${jobCards.length} ofertas`);

  if (jobCards.length === 0) {
    console.log('⚠️ No se encontraron ofertas de trabajo');
    // Tomar screenshot para debug
    try {
      await page.screenshot({ path: 'linkedin-no-jobs.png' });
      console.log('📸 Screenshot guardado como linkedin-no-jobs.png');
    } catch (e) {
      console.log('❌ No se pudo guardar screenshot');
    }
  }

  return jobCards;
}

export async function handleLinkedin(
  page: Page,
  email: string,
  password: string,
  keywords: string,
): Promise<{ appliedJobs: JobResult[]; reviewJobs: JobResult[] }> {
  try {
    await ensureLinkedInSession(page);

    console.log('🔍 Navegando a la página de búsqueda inicial...');
    const searchKeywords = encodeURIComponent(
      keywords
        .split(',')
        .map(k => k.trim())
        .join(' '),
    );
    const searchUrl = `https://www.linkedin.com/jobs/search/?keywords=${searchKeywords}&origin=JOBS_HOME_SEARCH_BUTTON&refresh=true`;

    await page.goto(searchUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });
    console.log('✅ Navegación inicial completada');
    await new Promise(resolve => setTimeout(resolve, 5000));

    const allAppliedJobs: JobResult[] = [];
    const allReviewJobs: JobResult[] = [];
    let currentPage = 1;
    const MAX_PAGES = 5;

    while (currentPage <= MAX_PAGES) {
      console.log(`\n📄 Procesando página ${currentPage}...`);

      const jobCards = await getJobCardsOnCurrentPage(page);
      if (jobCards.length === 0) {
        console.log(
          'No se encontraron más ofertas en esta página. Finalizando paginación.',
        );
        break;
      }

      const pageResults = await processJobApplications(page, jobCards);
      allAppliedJobs.push(...pageResults.appliedJobs);
      allReviewJobs.push(...pageResults.reviewJobs);

      const nextButton = await page.$('button[aria-label="Siguiente"]');
      if (
        nextButton &&
        !(await nextButton.evaluate(b => (b as HTMLButtonElement).disabled))
      ) {
        console.log('✅ Pasando a la siguiente página...');
        await nextButton.click();
        await new Promise(resolve => setTimeout(resolve, 5000));
        currentPage++;
      } else {
        console.log(
          '⏩ No hay más páginas o el botón de siguiente no está disponible.',
        );
        break;
      }
    }

    if (currentPage > MAX_PAGES) {
      console.log(`⚠️ Se alcanzó el límite de ${MAX_PAGES} páginas.`);
    }

    console.log('\n🏁 Proceso de LinkedIn finalizado.');
    return { appliedJobs: allAppliedJobs, reviewJobs: allReviewJobs };
  } catch (error) {
    console.error('Error en handleLinkedin:', error);
    throw error;
  }
}

async function ensureLinkedInSession(page: Page): Promise<void> {
  console.log('🔐 Verificando sesión de LinkedIn...');

  // Intentar navegar al feed
  try {
    await page.goto('https://www.linkedin.com/feed', {
      waitUntil: 'networkidle2',
      timeout: 60000,
    });

    // Verificar si ya estamos logueados
    const isLoggedIn = await checkIfLoggedIn(page);
    if (isLoggedIn) {
      console.log('✅ Sesión de LinkedIn ya activa');
      return;
    }
  } catch (error) {
    console.log('⚠️ Error navegando al feed, continuando con login manual...');
  }

  // Si no hay sesión, proceder con login manual
  await handleManualLogin(page);
}

async function checkIfLoggedIn(page: Page): Promise<boolean> {
  try {
    await page.waitForSelector('h3.profile-card-name', {
      timeout: 5000,
    });
    return true;
  } catch {
    return false;
  }
}

async function handleManualLogin(page: Page): Promise<void> {
  console.log('🔑 Iniciando proceso de login manual...');

  // Navegar a la página de login
  await page.goto(
    'https://www.linkedin.com/checkpoint/lg/sign-in-another-account',
    {
      waitUntil: 'networkidle2',
      timeout: 60000,
    },
  );

  console.log(
    '📝 Página de login cargada. Por favor, inicia sesión manualmente...',
  );

  // Esperar hasta que el usuario inicie sesión
  const maxWaitTime = 60000; // 60 segundos
  const checkInterval = 2000; // Verificar cada 2 segundos
  let elapsedTime = 0;

  while (elapsedTime < maxWaitTime) {
    const isLoggedIn = await checkIfLoggedIn(page);
    if (isLoggedIn) {
      console.log('✅ Login manual completado exitosamente');
      return;
    }

    await new Promise(resolve => setTimeout(resolve, checkInterval));
    elapsedTime += checkInterval;

    // Mostrar progreso cada 10 segundos
    if (elapsedTime % 10000 === 0) {
      const remainingTime = Math.ceil((maxWaitTime - elapsedTime) / 1000);
      console.log(`⏳ Esperando login... Tiempo restante: ${remainingTime}s`);
    }
  }

  throw new Error('❌ Tiempo de espera agotado para el login manual');
}

async function processJobApplications(
  page: Page,
  jobCards: any[],
): Promise<{ appliedJobs: JobResult[]; reviewJobs: JobResult[] }> {
  console.log(`\n🚀 Iniciando procesamiento de ${jobCards.length} ofertas...`);

  const appliedJobs: JobResult[] = [];
  const reviewJobs: JobResult[] = [];

  const jobCardsCount = jobCards.length;

  for (let i = 0; i < jobCardsCount; i++) {
    try {
      console.log(`\n📝 Procesando oferta ${i + 1}/${jobCardsCount}`);

      // Re-fetch job cards para evitar error "Node is detached"
      console.log('🔄 Refrescando lista de ofertas...');
      const freshJobCards = await page.$$(
        'ul.fIPvHriRZGzoNhZfdzYSlfTgbEvyrECFataA > li.ember-view',
      );

      if (!freshJobCards[i]) {
        console.log(
          '❌ No se encontró la tarjeta actual en la lista refrescada, saltando...',
        );
        continue;
      }

      const currentCard = freshJobCards[i];

      // Hacer scroll hasta la tarjeta para que se cargue
      console.log('📜 Haciendo scroll hasta la tarjeta...');
      await currentCard.scrollIntoView();
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Verificar que la tarjeta está visible después del scroll
      console.log('🔍 Verificando que la tarjeta está visible...');
      const isVisible = await currentCard.isVisible();
      if (!isVisible) {
        console.log('⚠️ Tarjeta no visible después del scroll, saltando...');
        continue;
      }

      // Hacer clic en la tarjeta para cargar detalles
      console.log('🖱️ Haciendo clic en la tarjeta...');
      await currentCard.click();
      console.log('✅ Clic realizado, esperando que carguen los detalles...');

      // Esperar a que carguen los detalles
      await new Promise(resolve => setTimeout(resolve, 3000));
      console.log('⏳ Tiempo de espera completado');

      // Verificar que estamos en la página correcta
      const currentUrl = page.url();
      console.log(`📍 URL después del clic: ${currentUrl}`);

      // Extraer información de la oferta
      console.log('📋 Extrayendo detalles de la oferta...');
      const jobDetails = await extractJobDetails(page);
      console.log(`🏢 ${jobDetails.title} - ${jobDetails.company}`);

      // Verificar si tiene "Solicitud sencilla"
      console.log('🔍 Verificando si tiene "Solicitud sencilla"...');
      const hasEasyApply = await checkForEasyApply(page);
      if (!hasEasyApply) {
        console.log('❌ No tiene "Solicitud sencilla", omitiendo...');
        continue;
      }

      console.log('✅ Tiene "Solicitud sencilla", procesando postulación...');

      // Procesar la postulación
      const result = await processApplication(page, jobDetails);
      if (result.success) {
        console.log('✅ Postulación exitosa');
        appliedJobs.push(result.jobResult);
      } else {
        console.log('⚠️ Postulación requiere revisión');
        reviewJobs.push(result.jobResult);
      }
    } catch (error) {
      console.error(`❌ Error procesando oferta ${i + 1}:`, error);

      // Intentar obtener información básica de la oferta
      try {
        const currentUrl = page.url();
        reviewJobs.push({
          link: currentUrl,
          title: `Error en oferta ${i + 1}`,
          description:
            error instanceof Error ? error.message : 'Error desconocido',
        });
      } catch (e) {
        console.error(
          '❌ No se pudo obtener información de la oferta con error',
        );
      }
    }
  }

  console.log(
    `\n🎯 Resumen final: ${appliedJobs.length} exitosas, ${reviewJobs.length} para revisar`,
  );
  return { appliedJobs, reviewJobs };
}

async function extractJobDetails(page: Page): Promise<JobDetails> {
  return await page.evaluate(() => {
    const title =
      document
        .querySelector('.job-details-jobs-unified-top-card__job-title')
        ?.textContent?.trim() || 'N/A';
    const company =
      document
        .querySelector('.job-details-jobs-unified-top-card__company-name')
        ?.textContent?.trim() || 'N/A';
    const location =
      document
        .querySelector('.job-details-jobs-unified-top-card__bullet')
        ?.textContent?.trim() || 'N/A';
    const description =
      document
        .querySelector('#job-details')
        ?.textContent?.trim()
        .substring(0, 150) || 'N/A';

    return {
      title,
      company,
      location,
      description: `${company} - ${location}. ${description}`,
    };
  });
}

async function checkForEasyApply(page: Page): Promise<boolean> {
  const easyApplySelector =
    'button.jobs-apply-button[aria-label*="Solicitud sencilla"]';
  console.log(`🔍 Verificando si tiene "${easyApplySelector}"...`);
  try {
    await page.waitForSelector(easyApplySelector, { timeout: 10000 });
    console.log('✅ Botón "Solicitud sencilla" encontrado');
    return true;
  } catch (error) {
    console.log(
      `❌ Botón con selector "${easyApplySelector}" no encontrado en 10s`,
    );
  }
  return false;
}

async function processApplication(
  page: Page,
  jobDetails: JobDetails,
): Promise<{ success: boolean; jobResult: JobResult }> {
  console.log('🚀 Iniciando proceso de postulación para:', jobDetails.title);

  try {
    // 1. Usar el selector correcto y más específico para el botón
    const easyApplySelector =
      'button.jobs-apply-button[aria-label*="Solicitud sencilla"]';
    console.log(`⏳ Esperando el botón "${easyApplySelector}"...`);
    await page.waitForSelector(easyApplySelector, { timeout: 10000 });

    await page.click(easyApplySelector);
    console.log('✅ Clic en "Solicitud sencilla"');

    // 2. Esperar a que se abra el modal con el selector correcto
    const modalSelector = 'div[data-test-modal][role="dialog"]';
    console.log(
      `⏳ Esperando que se abra el modal con selector: "${modalSelector}"...`,
    );
    await page.waitForSelector(modalSelector, { timeout: 10000 });
    console.log('✅ Modal de "Solicitud sencilla" abierto.');
  } catch (error) {
    console.error(
      '❌ Error al abrir o encontrar el modal de Solicitud Sencilla:',
      error,
    );
    try {
      const screenshotPath = 'linkedin-modal-error.png';
      await page.screenshot({ path: screenshotPath });
      console.log(
        `📸 Screenshot de diagnóstico guardado en: ${screenshotPath}`,
      );
    } catch (e) {
      console.log('❌ No se pudo guardar el screenshot de diagnóstico.');
    }
    // Devolvemos un resultado para revisión en lugar de detener todo el proceso
    return {
      success: false,
      jobResult: {
        ...jobDetails,
        link: page.url(),
        description: 'Error al abrir el modal de Solicitud Sencilla.',
      },
    };
  }

  // 3. Procesar el formulario con la nueva lógica mejorada
  console.log('📝 Procesando formulario de postulación...');
  const success = await fillApplicationForm(page);

  const jobResult: JobResult = {
    link: page.url(),
    title: jobDetails.title,
    description: jobDetails.description,
  };

  return { success, jobResult };
}

async function fillApplicationForm(page: Page): Promise<boolean> {
  const maxDuration = 120000; // 2 minutos máximo por formulario
  const checkInterval = 2000;
  let elapsedTime = 0;

  console.log('⏳ Rellenando formulario de "Solicitud sencilla"...');

  while (elapsedTime < maxDuration) {
    console.log(
      `\n🔎 Buscando campos y botones... (Tiempo: ${elapsedTime / 1000}s)`,
    );

    // Rellenar campos visibles antes de buscar botones de acción
    await fillFormFields(page);

    // Prioridad 1: Botón de Enviar
    const submitButton = await page.$(`button[aria-label*="Enviar solicitud"]`);
    if (submitButton) {
      console.log('✅ Botón "Enviar solicitud" encontrado. Haciendo clic...');
      await submitButton.click();
      await new Promise(resolve => setTimeout(resolve, 3000)); // Dar tiempo a que se procese
      console.log('🎉 ¡Postulación enviada exitosamente!');
      return true;
    }

    // Prioridad 2: Botón de Revisar
    const reviewButton = await page.$(`button[aria-label*="Revisar"]`);
    if (reviewButton) {
      console.log('✅ Botón "Revisar" encontrado. Haciendo clic...');
      await reviewButton.click();
      await new Promise(resolve => setTimeout(resolve, 2000));
      continue;
    }

    // Prioridad 3: Botón de Siguiente
    const nextButton = await page.$(
      `button[data-easy-apply-next-button], button[aria-label*="Ir al siguiente paso"]`,
    );
    if (nextButton) {
      console.log('✅ Botón "Siguiente" encontrado. Haciendo clic...');
      await nextButton.click();
      await new Promise(resolve => setTimeout(resolve, 2000));
      continue;
    }

    console.log('... No se encontraron botones de acción. Esperando...');
    await new Promise(resolve => setTimeout(resolve, checkInterval));
    elapsedTime += checkInterval;
  }

  console.log('❌ Se superó el tiempo máximo para rellenar el formulario.');
  return false;
}

async function fillFormFields(page: Page): Promise<void> {
  console.log('🖊️ Rellenando campos del formulario...');

  // Rellenar inputs de texto
  const textInputs = await page.$$('input[type="text"]:not([disabled])');
  for (const input of textInputs) {
    try {
      const value = await input.evaluate(el => (el as HTMLInputElement).value);
      if (!value) {
        await input.type('2', { delay: 50 });
        console.log('... input de texto rellenado con "2".');
      }
    } catch (e) {
      // Silencioso para no llenar el log
    }
  }

  // Rellenar selects
  const selects = await page.$$('select:not([disabled])');
  for (const select of selects) {
    try {
      const selectedValue = await select.evaluate(
        el => (el as HTMLSelectElement).value,
      );
      if (
        !selectedValue ||
        selectedValue.toLowerCase().includes('selecciona')
      ) {
        const options = await select.$$('option');
        let selected = false;

        // Prioridad 1: Buscar y seleccionar "Yes"
        for (const option of options) {
          const optionText = await option.evaluate(el =>
            el.textContent?.trim().toLowerCase(),
          );
          if (optionText === 'yes') {
            const optionValue = await option.evaluate(
              el => (el as HTMLOptionElement).value,
            );
            await select.select(optionValue);
            console.log('... opción "Yes" seleccionada.');
            selected = true;
            break;
          }
        }

        if (selected) continue;

        // Prioridad 2: Seleccionar la segunda opción (la primera suele ser placeholder)
        if (options.length > 1) {
          const valueToSelect = await options[1].evaluate(
            el => (el as HTMLOptionElement).value,
          );
          await select.select(valueToSelect);
          console.log(`... segunda opción '${valueToSelect}' seleccionada.`);
        }
      }
    } catch (e) {
      // Silencioso
    }
  }
}
