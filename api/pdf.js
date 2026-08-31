import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

export async function POST(req) {
  let browser = null;
  try {
    const executablePath = await chromium.executablePath();

    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: executablePath,
      headless: chromium.headless,
    });

    const page = await browser.newPage();
    // (Đoạn code nhận HTML và render PDF của bạn ở đây...)

    const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });

    return new Response(pdfBuffer, {
      status: 200,
      headers: { 'Content-Type': 'application/pdf' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  } finally {
    if (browser) await browser.close();
  }
}
