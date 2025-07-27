import { NextResponse } from 'next/server';
import puppeteer, { Browser } from 'puppeteer';
import { handleZonajobs } from './zonajobs';
import { handleBumeran } from './bumeran';
import { handleLinkedin } from './linkedin';

export async function POST(request: Request) {
  let browser: Browser | null = null;
  try {
    const body = await request.json();
    const { platform, email, password, keywords } = body;

    if (!platform || !email || !password || !keywords) {
      return NextResponse.json(
        {
          error:
            'Faltan datos (plataforma, email, contraseña o palabras clave)',
        },
        { status: 400 },
      );
    }

    console.log(`Iniciando proceso para ${platform} con:`, { email, keywords });

    browser = await puppeteer.launch({
      headless: false,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--no-first-run',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
      ],
      executablePath:
        process.env.NODE_ENV === 'production'
          ? process.env.PUPPETEER_EXECUTABLE_PATH
          : undefined,
    });

    console.log('Navegador lanzado. Creando una nueva página...');
    const page = await browser.newPage();
    console.log('Página creada.');

    // Optimizar configuración de la página
    await page.setViewport({ width: 1366, height: 768 });

    // Configurar timeouts más agresivos
    page.setDefaultTimeout(30000);
    page.setDefaultNavigationTimeout(30000);

    let results;
    if (platform === 'zonajobs') {
      results = await handleZonajobs(page, email, password, keywords);
    } else if (platform === 'bumeran') {
      results = await handleBumeran(page, email, password, keywords);
    } else if (platform === 'linkedin') {
      results = await handleLinkedin(page, email, password, keywords);
    } else {
      throw new Error(`Plataforma no soportada: ${platform}`);
    }

    await browser.close();
    browser = null;

    return NextResponse.json({
      message: `Proceso finalizado para ${platform}. Postulaciones exitosas: ${results.appliedJobs.length}. Para revisar: ${results.reviewJobs.length}.`,
      ...results,
    });
  } catch (e) {
    if (browser) {
      await browser.close();
    }
    const errorMessage =
      e instanceof Error
        ? e.message
        : 'Error desconocido durante la automatización.';
    console.error('Error en Puppeteer:', errorMessage);
    return NextResponse.json(
      {
        error: 'Ocurrió un error durante la automatización.',
        details: errorMessage,
      },
      { status: 500 },
    );
  }
}
