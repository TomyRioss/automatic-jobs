import { Page } from 'puppeteer';

export async function handleZonajobs(
  page: Page,
  email: string,
  password: string,
  keywords: string,
) {
  // 1. Iniciar sesión en Zonajobs con los selectores correctos
  console.log('Navegando a la página de login de Zonajobs...');
  await page.goto('https://www.zonajobs.com.ar/login', {
    waitUntil: 'networkidle2',
  });

  console.log('Esperando a que el formulario de login esté visible...');
  await page.waitForSelector('#email', { visible: true, timeout: 10000 });

  console.log('Ingresando credenciales...');
  await page.type('#email', email);
  await page.type('#password', password);

  console.log("Haciendo clic en 'Ingresar' y esperando la navegación...");
  // Hacemos clic en el botón de submit y esperamos a que la página de destino cargue
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle2' }),
    page.click('#ingresar'),
  ]);

  console.log(
    'Login exitoso. Navegando a la página de perfil para confirmar...',
  );
  await page.goto('https://www.zonajobs.com.ar/postulantes/perfil', {
    waitUntil: 'networkidle2',
  });

  // Esperamos a que un elemento único de la página de perfil esté visible
  await page.waitForSelector('p', { timeout: 15000 });
  console.log('¡Confirmación de sesión en Zonajobs exitosa!');

  // 2. Búsqueda de empleos
  const searchKeywords = keywords
    .split(',')
    .map((k: string) => k.trim())
    .join('-'); // Zonajobs une las palabras con guiones en la URL
  const searchUrl = `https://www.zonajobs.com.ar/empleos-busqueda-${encodeURIComponent(
    searchKeywords,
  )}.html`;

  console.log(`Navegando a la URL de búsqueda: ${searchUrl}`);
  await page.goto(searchUrl, { waitUntil: 'networkidle2' });

  console.log('Búsqueda completada. Esperando a que carguen los resultados...');
  try {
    await page.waitForSelector('a.sc-gVZiCL', { timeout: 10000 });
    console.log('Resultados de búsqueda encontrados.');
  } catch (error) {
    console.log(
      'No se encontraron resultados de búsqueda para estas palabras clave.',
    );
    // Si no hay resultados, podemos terminar el proceso de forma limpia.
    return {
      appliedJobs: [],
      reviewJobs: [],
    };
  }

  // Extraer los enlaces de las ofertas de la primera página
  const jobLinks = await page.$$eval(
    'a.sc-gVZiCL', // Usamos el selector correcto de las tarjetas de oferta
    (links: Element[]) => {
      const uniqueLinks = new Set<string>();
      links.forEach(a => {
        const href = (a as HTMLAnchorElement).href;
        // Filtramos para asegurarnos de que es un enlace de empleo válido
        if (href && href.includes('/empleos/')) {
          uniqueLinks.add(href);
        }
      });
      return Array.from(uniqueLinks);
    },
  );

  console.log(
    `Se encontraron ${jobLinks.length} ofertas en la primera página.`,
  );

  const appliedJobs: { link: string; title: string; description: string }[] =
    [];
  const reviewJobs: { link: string; title: string; description: string }[] = [];

  for (const link of jobLinks) {
    try {
      console.log(`Navegando a la oferta: ${link}`);
      await page.goto(link, { waitUntil: 'networkidle2' });

      const jobDetails = await page.evaluate(() => {
        const title =
          document.querySelector('h1.sc-iAvgwm')?.textContent?.trim() || 'N/A';
        const description =
          document
            .querySelector('div.sc-fAEnYS')
            ?.textContent?.trim()
            .substring(0, 150) || 'N/A';
        return { title, description };
      });

      // Buscamos cualquier botón de postulación conocido
      const applyButtonSelector =
        'button[form="form-salario-pretendido"], #btn-postularme';

      const applyButton = await page
        .waitForSelector(applyButtonSelector, {
          timeout: 5000,
          visible: true,
        })
        .catch(() => null);

      if (applyButton) {
        console.log('Botón de postulación encontrado. Haciendo clic...');
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
      } else {
        console.log(
          `[INFO] No se encontró botón de postulación para: ${link}. Es posible que ya te hayas postulado.`,
        );
        reviewJobs.push({ link, ...jobDetails });
      }
    } catch (jobError) {
      const errorMessage =
        jobError instanceof Error ? jobError.message : 'Error desconocido';
      console.error(
        `Error procesando ${link}. Puede que la postulación requiera pasos adicionales.`,
        errorMessage,
      );
      reviewJobs.push({ link, title: 'Error', description: errorMessage });
    }
  }
  return { appliedJobs, reviewJobs };
}
