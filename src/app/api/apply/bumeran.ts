import { Page } from 'puppeteer';

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

  return { appliedJobs, reviewJobs };
}
