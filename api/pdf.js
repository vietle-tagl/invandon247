import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

export async function POST(req) {
  try {
    // Cấu hình đường dẫn Chromium tối ưu cho môi trường Vercel Serverless
    const executablePath = await chromium.executablePath();

    const browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: executablePath,
      headless: chromium.headless,
    });

    const page = await browser.newPage();

    // 1. Nhận nội dung HTML hoặc URL từ client
    // const { html } = await req.json();
    // await page.setContent(html, { waitUntil: 'networkidle0' });

    // 2. Tạo PDF
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
    });

    await browser.close();

    // 3. Trả về file PDF cho phía client
    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline; filename="don-hang.pdf"',
      },
    });
  } catch (error) {
    console.error('Puppeteer PDF Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
