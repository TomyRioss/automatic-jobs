import { Page, ElementHandle } from 'puppeteer';
import { truncateJobTitle } from './utils';
import { prisma } from '@/lib/prisma';

export async function handleBumeran(
  page: Page,
  email: string,
  password: string,
  keywords: string,
) {
  // 1. Iniciar sesión en Bumeran
  console.log('Navegando a la página de login de Bumeran...');
  await page.goto('https://www.bumeran.com.ar/login', {
    waitUntil: 'networkidle2',
  });

  console.log('Esperando a que el formulario de login esté visible...');
  await page.waitForSelector('#email', { visible: true, timeout: 10000 });

  console.log('Ingresando credenciales...');
  await page.type('#email', email);
  await page.type('#password', password);

  console.log("Haciendo clic en 'Ingresar' y esperando la navegación...");
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle2' }),
    page.click('#ingresar'),
  ]);

  console.log(
    'Login exitoso. Navegando a la página de perfil para confirmar...',
  );
  await page.goto('https://www.bumeran.com.ar/postulantes/curriculum', {
    waitUntil: 'networkidle2',
  });
  await page.waitForSelector('p', { timeout: 15000 });
  console.log('¡Confirmación de sesión en Bumeran exitosa!');

  // 2. Búsqueda de empleos
  const searchKeywords = keywords
    .split(',')
    .map(k => k.trim())
    .join('-');
  const searchUrl = `https://www.bumeran.com.ar/empleos-busqueda-${searchKeywords}.html`;

  console.log(`Navegando a la URL de búsqueda: ${searchUrl}`);
  await page.goto(searchUrl, { waitUntil: 'networkidle2' });

  console.log('Búsqueda completada. Esperando a que carguen los resultados...');
  try {
    // Usamos el selector correcto para las tarjetas de empleo, similar a Zonajobs
    await page.waitForSelector('a.sc-gVZiCL', {
      timeout: 10000,
    });
    console.log('Resultados de búsqueda encontrados.');
  } catch (error) {
    console.log(
      'No se encontraron resultados de búsqueda para estas palabras clave.',
    );
    return { appliedJobs: [], reviewJobs: [] };
  }

  const appliedJobs: { link: string; title: string; description: string }[] =
    [];
  const reviewJobs: { link: string; title: string; description: string }[] = [];
  let currentPage = 1;
  const MAX_PAGES = 5;

  while (currentPage <= MAX_PAGES) {
    console.log(`\n📄 Procesando página ${currentPage} de Bumeran...`);

    // Extraer los enlaces de las ofertas
    const jobLinks = await page.$$eval('a.sc-gVZiCL', links => {
      const uniqueLinks = new Set<string>();
      links.forEach(a => {
        const href = (a as HTMLAnchorElement).href;
        if (href) {
          uniqueLinks.add(href);
        }
      });
      return Array.from(uniqueLinks);
    });

    console.log(
      `Se encontraron ${jobLinks.length} ofertas en la página ${currentPage}.`,
    );

    if (jobLinks.length === 0) {
      console.log('No se encontraron más ofertas, finalizando.');
      break;
    }

    for (const link of jobLinks) {
      try {
        console.log(`Navegando a la oferta: ${link}`);
        await page.goto(link, { waitUntil: 'networkidle2' });

        const jobDetails = await page.evaluate(() => {
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
              // Usamos innerText para obtener el contenido visible, incluyendo saltos de línea
              if (element)
                return (element as HTMLElement).innerText?.trim() || '';
            }
            return 'N/A';
          };

          const title = getElementText([
            'h1.sc-iAvgwm', // Selector original
            'h1.sc-pJurq', // Alternativo visto
            'h1',
          ]);

          const description =
            getInnerText([
              'div.sc-fAEnYS', // Selector principal para la descripción en Bumeran
              'div.job-description',
              'section#job-description',
            ]) || 'Descripción no encontrada';

          return { title, description };
        });

        // Truncar el título si es muy largo
        jobDetails.title = truncateJobTitle(jobDetails.title);

        const applyButtonSelector = 'button[form="form-salario-pretendido"]';
        const applyButton = await page
          .waitForSelector(applyButtonSelector, {
            timeout: 5000,
            visible: true,
          })
          .catch(() => null);

        if (applyButton) {
          await applyButton.click();
          console.log('Postulación enviada. Esperando confirmación...');
          await page.waitForFunction(
            selector => {
              const button = document.querySelector(
                selector,
              ) as HTMLButtonElement | null;
              return !button || button.disabled;
            },
            { timeout: 10000 },
            applyButtonSelector,
          );
          console.log(`[ÉXITO] Postulación enviada para: ${link}`);
          appliedJobs.push({ link, ...jobDetails });
          try {
            await prisma.globalStats.upsert({
              where: { id: 'main_stats' },
              update: { totalApplications: { increment: 1 } },
              create: { id: 'main_stats', totalApplications: 1 },
            });
            console.log(
              '✅ Contador global de postulaciones de Bumeran incrementado.',
            );
          } catch (dbError) {
            console.error(
              '❌ Error al actualizar el contador de postulaciones de Bumeran:',
              dbError,
            );
          }
        } else {
          console.log(
            `[INFO] No se encontró botón de postulación para: ${link}.`,
          );
          reviewJobs.push({ link, ...jobDetails });
        }
      } catch (jobError) {
        const errorMessage =
          jobError instanceof Error ? jobError.message : 'Error desconocido';
        console.error(`Error procesando ${link}: ${errorMessage}`);
        reviewJobs.push({ link, title: 'Error', description: errorMessage });
      }
    }

    // Lógica de paginación
    try {
      console.log('🔍 Buscando el botón de "Siguiente"...');
      const nextButton = await page.evaluateHandle(() => {
        const icon = document.querySelector('i[name="icon-light-caret-right"]');
        return icon ? icon.closest('a, button') : null;
      });

      const nextButtonElement = nextButton.asElement();
      if (nextButtonElement) {
        console.log('✅ Pasando a la siguiente página...');
        await (nextButtonElement as ElementHandle<HTMLElement>).click();
        await page.waitForNavigation({
          waitUntil: 'networkidle2',
          timeout: 30000,
        });
        currentPage++;
      } else {
        console.log('⏩ No hay más páginas o botón no encontrado.');
        break;
      }
    } catch (error) {
      console.log('Error durante la paginación, finalizando.', error);
      break;
    }
  }

  return { appliedJobs, reviewJobs };
}
