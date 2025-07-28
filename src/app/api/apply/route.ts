import { NextRequest, NextResponse } from 'next/server';
import puppeteer, { Browser } from 'puppeteer';
import { handleZonajobs } from './zonajobs';
import { handleBumeran } from './bumeran';
import { handleLinkedin } from './linkedin';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  const userId = req.headers.get('x-user-id');

  if (!userId) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  let browser: Browser | null = null;
  try {
    const body = await req.json();
    const { platform, email, password, keywords } = body;
    // Nuevos campos opcionales
    const { location, modalities } = body;

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
      results = await handleLinkedin(
        page,
        email,
        password,
        keywords,
        location,
        modalities,
      );
    } else {
      throw new Error('Plataforma no válida');
    }

    await browser.close();

    // Save applied jobs to the database for the logged-in user
    if (results.appliedJobs.length > 0) {
      const applicationsToCreate = results.appliedJobs.map(job => ({
        title: job.title?.trim() || 'Sin título',
        description: job.description?.trim() || 'Sin descripción',
        link: job.link,
        source: platform,
        userId: userId,
      }));

      await prisma.application.createMany({
        data: applicationsToCreate,
        skipDuplicates: true,
      });
    }

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
