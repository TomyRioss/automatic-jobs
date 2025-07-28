import { Page, ElementHandle } from 'puppeteer';
import { truncateJobTitle } from './utils';
import { prisma } from '@/lib/prisma';

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

// NUEVO: Tipos para filtros opcionales
export interface LinkedinExtraFilters {
  location?: string; // Ej.: "La Paz, Bolivia"
  modalities?: Array<'presencial' | 'hibrido' | 'remoto'>; // Modalidades opcionales
}

async function getJobCardsOnCurrentPage(
  page: Page,
): Promise<ElementHandle<Element>[]> {
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
  let jobCards: ElementHandle<Element>[] = await page.$$(
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
  // NUEVOS PARÁMETROS OPCIONALES
  location?: string,
  modalities?: Array<'presencial' | 'hibrido' | 'remoto'>,
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

    // NUEVO: Asegurar que el filtro de ubicación y modalidad estén configurados
    if (location) {
      await ensureLocationFilter(page, location);
    }
    if (modalities && modalities.length > 0) {
      await ensureWorkplaceFilter(page, modalities);
    }

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

      console.log('🔍 Buscando el botón de "Siguiente"...');
      const nextButtonHandle = await page.evaluateHandle(() => {
        const spans = Array.from(
          document.querySelectorAll('span.artdeco-button__text'),
        );
        const nextSpan = spans.find(
          span => span.textContent?.trim() === 'Siguiente',
        );
        return nextSpan ? nextSpan.closest('button') : null;
      });

      const nextButton = nextButtonHandle.asElement();

      if (
        nextButton &&
        !(await (nextButton as ElementHandle<HTMLButtonElement>).evaluate(
          b => b.disabled,
        ))
      ) {
        console.log('✅ Pasando a la siguiente página...');
        await (nextButton as ElementHandle<HTMLButtonElement>).click();
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
  jobCards: ElementHandle<Element>[],
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
  // Esperar a que el contenedor principal de detalles sea visible
  const jobDetailsContainerSelector = '.job-details-jobs-unified-top-card';
  try {
    await page.waitForSelector(jobDetailsContainerSelector, { timeout: 5000 });
  } catch (error) {
    console.log(
      `⚠️ No se encontró el contenedor de detalles principal: ${jobDetailsContainerSelector}`,
    );
    // Intentar con un selector de respaldo más general
    await page.waitForSelector('.job-view-layout', { timeout: 5000 });
  }

  const result = await page.evaluate(() => {
    // Selectores primarios y de respaldo para cada campo
    const getElementText = (selectors: string[]): string => {
      for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element) return element.textContent?.trim() || '';
      }
      return 'N/A';
    };

    const getInnerText = (selectors: string[]): string => {
      for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element) return (element as HTMLElement).innerText?.trim() || '';
      }
      return 'N/A';
    };

    const title = getElementText([
      '.job-details-jobs-unified-top-card__job-title', // Selector original
      'h1.t-24.t-bold', // Selector más específico para el título
      'h1', // Selector más genérico
      '.job-title', // Otro selector común
      'h2.job-title',
    ]);

    const company = getElementText([
      '.job-details-jobs-unified-top-card__company-name', // Selector original
      'a[href*="/company/"]', // Enlace de la compañía
      '.job-company-name',
      'div.job-details-jobs-unified-top-card__primary-description-without-company-cta > a',
    ]);

    const location = getElementText([
      '.job-details-jobs-unified-top-card__bullet', // Selector original
      'span.job-location', // Selector más específico para ubicación
      'span[class*="location"]',
    ]);

    const description =
      getInnerText([
        'div.jobs-description-content__text', // Selector principal
        '#job-details',
        '.jobs-box__html-content',
        'div.job-details-jobs-unified-top-card__job-insight',
      ]) || 'Descripción no encontrada';

    return {
      title,
      company,
      location,
      description,
    };
  });

  // Truncar el título si es muy largo
  result.title = truncateJobTitle(result.title);

  return result;
}

async function checkForEasyApply(page: Page): Promise<boolean> {
  const easyApplySelector =
    'button.jobs-apply-button[aria-label*="Solicitud sencilla"]';
  console.log(`🔍 Verificando si tiene "${easyApplySelector}"...`);
  try {
    await page.waitForSelector(easyApplySelector, { timeout: 3500 });
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

  if (success) {
    try {
      await prisma.globalStats.upsert({
        where: { id: 'main_stats' },
        update: { totalApplications: { increment: 1 } },
        create: { id: 'main_stats', totalApplications: 1 },
      });
      console.log('✅ Contador global de postulaciones incrementado.');
    } catch (error) {
      console.error(
        '❌ Error al actualizar el contador global de postulaciones:',
        error,
      );
    }
  }

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
      console.log('🎉 ¡Postulación enviada exitosamente!');

      console.log(
        '⏳ Esperando 2s para que aparezca el popup de confirmación...',
      );
      await new Promise(resolve => setTimeout(resolve, 2000));

      try {
        console.log(
          '🔍 Buscando el botón para cerrar el popup de confirmación...',
        );

        const clicked = await page.evaluate(() => {
          const use = document.querySelector('use[href="#close-medium"]');
          if (use) {
            const button = use.closest('button');
            if (button) {
              (button as HTMLElement).click();
              return true;
            }
          }
          return false;
        });

        if (clicked) {
          console.log('✅ Popup de confirmación cerrado.');
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait a bit
        } else {
          console.log(
            '⚠️ No se encontró el botón de cierre del popup por el icono, probando por aria-label...',
          );
          const dismissButton = await page.$(
            'button[aria-label="Descartar"], button[aria-label="Cerrar"]',
          );
          if (dismissButton) {
            await dismissButton.click();
            console.log('✅ Popup de confirmación cerrado (por aria-label).');
            await new Promise(resolve => setTimeout(resolve, 1000));
          } else {
            console.log(
              '⚠️ No se pudo cerrar el popup de confirmación. Continuando...',
            );
          }
        }
      } catch (error) {
        console.error(
          '❌ Error al intentar cerrar el popup de confirmación:',
          error,
        );
      }

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
        await input.type('2', { delay: 100 });
        console.log('... input de texto rellenado con "2".');
        // Pausa para asegurar que el valor se procesa antes de continuar
        await new Promise(resolve => setTimeout(resolve, 200));
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
      // Condición mejorada para detectar si el select necesita un valor.
      // Cubre valores vacíos y placeholders como "Select an option" o "Selecciona".
      if (!selectedValue || selectedValue.toLowerCase().includes('select')) {
        const options = await select.$$('option');
        if (options.length <= 1) continue; // No hay opciones para elegir

        let yesOptionFound = false;
        // Prioridad 1: Buscar y seleccionar "Yes" si existe en las opciones.
        for (const option of options) {
          const optionText = await option.evaluate(el =>
            el.textContent?.trim().toLowerCase(),
          );
          if (optionText === 'yes') {
            const optionValue = await option.evaluate(
              el => (el as HTMLOptionElement).value,
            );
            await select.select(optionValue);
            console.log('... opción "Yes" seleccionada en el select.');
            yesOptionFound = true;
            break;
          }
        }

        // Si se seleccionó "Yes", continuar con el siguiente select.
        if (yesOptionFound) continue;

        // Prioridad 2 (NUEVA LÓGICA): Seleccionar la última opción.
        const lastOption = options[options.length - 1];
        const valueToSelect = await lastOption.evaluate(
          el => (el as HTMLOptionElement).value,
        );
        const textToSelect = await lastOption.evaluate(el =>
          el.textContent?.trim(),
        );

        await select.select(valueToSelect);
        console.log(
          `... última opción ('${textToSelect}') seleccionada en el select.`,
        );

        // Pequeña pausa para que los cambios se registren
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    } catch (e) {
      // Silencioso
    }
  }

  // NUEVO: Rellenar radio buttons de "Sí/No"
  console.log('📻 Buscando preguntas de Sí/No (radio buttons)...');
  try {
    const radioButtonsHandled = await page.evaluate(() => {
      let handledCount = 0;
      const fieldsets = document.querySelectorAll(
        'fieldset[data-test-form-builder-radio-button-form-component]',
      );

      fieldsets.forEach(fieldset => {
        const yesInput = fieldset.querySelector(
          'input[type="radio"][value="Yes"]',
        ) as HTMLInputElement;

        if (yesInput && !yesInput.checked) {
          // Busca la etiqueta correspondiente, que es más fiable para hacer clic
          const yesLabel = fieldset.querySelector(
            `label[for="${yesInput.id}"]`,
          ) as HTMLLabelElement;

          if (yesLabel) {
            yesLabel.click();
            handledCount++;
          }
        }
      });
      return handledCount;
    });

    if (radioButtonsHandled > 0) {
      console.log(
        `... ${radioButtonsHandled} preguntas de "Sí/No" respondidas.`,
      );
      // Pausa para asegurar que la acción se procesa
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  } catch (e) {
    console.error('❌ Error al procesar preguntas de radio button:', e);
  }
}

// NUEVA FUNCIÓN: Configurar filtro de ubicación
async function ensureLocationFilter(
  page: Page,
  userLocation: string,
): Promise<void> {
  console.log(`🌐 Verificando filtro de ubicación: "${userLocation}" ...`);
  try {
    const locationInputSelector = 'input[id^="jobs-search-box-location-id"]';
    await page.waitForSelector(locationInputSelector, { timeout: 10000 });

    const currentValue: string = await page.$eval(
      locationInputSelector,
      el => (el as HTMLInputElement).value || '',
    );

    if (
      currentValue.trim().toLowerCase() === userLocation.trim().toLowerCase()
    ) {
      console.log(
        '✅ El filtro de ubicación ya está configurado correctamente.',
      );
      return;
    }

    console.log('🔄 Actualizando filtro de ubicación...');
    const inputHandle = await page.$(locationInputSelector);
    if (!inputHandle) throw new Error('No se encontró el input de ubicación');

    // Limpiar y escribir nueva ubicación
    await inputHandle.click({ clickCount: 3 });
    await page.keyboard.press('Backspace');
    await inputHandle.type(userLocation, { delay: 100 });
    await page.keyboard.press('Enter');

    console.log(
      '⏳ Esperando que los resultados se actualicen con la nueva ubicación...',
    );
    await new Promise(resolve => setTimeout(resolve, 4000));
  } catch (error) {
    console.error('❌ Error al configurar el filtro de ubicación:', error);
  }
}

// NUEVA FUNCIÓN: Configurar filtro de modalidad de trabajo
async function ensureWorkplaceFilter(
  page: Page,
  modalities: Array<'presencial' | 'hibrido' | 'remoto'>,
): Promise<void> {
  console.log(
    `🏢 Verificando filtro de modalidad: ${modalities.join(', ')} ...`,
  );
  try {
    const filterButtonSelector = 'button#searchFilter_workplaceType';
    await page.waitForSelector(filterButtonSelector, { timeout: 10000 });

    // Abrir el desplegable
    console.log('🖱️ Abriendo desplegable de modalidad...');
    await page.click(filterButtonSelector);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Pausa para animación

    // Esperar a que aparezca el contenedor de opciones (usando un selector más específico)
    const optionsContainerSelector =
      'ul.search-reusables__collection-values-container';
    try {
      await page.waitForSelector(optionsContainerSelector, { timeout: 10000 });
      console.log('✅ Contenedor de opciones de modalidad visible.');
    } catch (e) {
      console.error(
        '❌ No se pudo encontrar el contenedor de opciones de modalidad.',
      );
      await page.screenshot({
        path: 'linkedin-modalidad-dropdown-error.png',
      });
      console.log(
        '📸 Screenshot de diagnóstico guardado como linkedin-modalidad-dropdown-error.png',
      );
      throw new Error(
        'No se pudo abrir el desplegable de filtros de modalidad.',
      );
    }

    // Mapear modalidades a los textos que aparecen en LinkedIn (en español)
    const modalityMap: Record<string, string> = {
      presencial: 'Presencial',
      hibrido: 'Híbrido',
      remoto: 'En remoto',
    };

    for (const mod of modalities) {
      const optionText =
        modalityMap[mod.toLowerCase() as keyof typeof modalityMap];
      if (!optionText) continue;

      // Evaluamos dentro de la página para marcar la opción si no está seleccionada
      const toggled = await page.evaluate((text: string) => {
        const listItems = Array.from(
          document.querySelectorAll(
            'li.search-reusables__collection-values-item',
          ),
        );
        const targetItem = listItems.find(item =>
          item.textContent?.trim().includes(text),
        );

        if (!targetItem) return false;

        const checkbox = targetItem.querySelector(
          'input[type="checkbox"]',
        ) as HTMLInputElement | null;
        const label = targetItem.querySelector(
          'label.search-reusables__value-label',
        );

        if (checkbox && !checkbox.checked && label) {
          (label as HTMLElement).click(); // Click the label to toggle
          return true;
        }
        return false;
      }, optionText);

      if (toggled) {
        console.log(`✅ Opción "${optionText}" activada.`);
        await new Promise(resolve => setTimeout(resolve, 500)); // Pequeña pausa
      } else {
        console.log(
          `ℹ️ Opción "${optionText}" ya estaba activada o no se encontró.`,
        );
      }
    }

    // Buscar y hacer clic en el botón "Mostrar resultados"
    console.log('🔍 Buscando botón para aplicar filtros...');
    const applyButtonFound = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const applyButton = buttons.find(button => {
        const buttonText = button.textContent?.trim() || '';
        // Busca "Mostrar X resultados"
        return (
          buttonText.startsWith('Mostrar') && buttonText.includes('resultado')
        );
      });

      if (applyButton) {
        (applyButton as HTMLElement).click();
        return true;
      }
      return false;
    });

    if (applyButtonFound) {
      console.log('✅ Botón para aplicar filtros accionado.');
      await new Promise(res => setTimeout(res, 4000));
    } else {
      console.log(
        '⚠️ No se encontró el botón para aplicar filtros, cerrando dropdown...',
      );
      // Cerrar el dropdown si no hay botón (click fuera)
      await page.click(filterButtonSelector);
    }
  } catch (error) {
    console.error('❌ Error al configurar el filtro de modalidad:', error);
  }
}
