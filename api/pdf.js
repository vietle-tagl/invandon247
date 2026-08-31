// api/pdf.js
import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { htmlContent, trackingCode } = req.body;

    if (!htmlContent) {
      return res.status(400).json({ message: 'Missing htmlContent' });
    }

    // Khởi tạo browser với cấu hình cho Vercel
    const browser = await puppeteer.launch({
      args: [
        ...chromium.args,
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--single-process',
        '--font-render-hinting=none',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process',
      ],
      defaultViewport: {
        width: 800,
        height: 1000,
        deviceScaleFactor: 1,
      },
      executablePath: await chromium.executablePath(
        'https://github.com/Sparticuz/chromium/releases/download/v121.0.0/chromium-v121.0.0-pack.tar'
      ),
      headless: true,
      ignoreHTTPSErrors: true,
    });

    const page = await browser.newPage();

    // Set content với đầy đủ CSS
    await page.setContent(htmlContent, {
      waitUntil: ['networkidle0', 'domcontentloaded'],
      timeout: 15000,
    });

    // Đợi fonts và render
    await page.evaluateHandle('document.fonts.ready');
    await page.waitForTimeout(500);

    // Tạo PDF
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '8mm',
        bottom: '8mm',
        left: '8mm',
        right: '8mm',
      },
      preferCSSPageSize: true,
      displayHeaderFooter: false,
    });

    await browser.close();

    // Trả về PDF
    const filename = `InVanDon247_VNPost_${trackingCode || 'unknown'}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.status(200).send(pdfBuffer);

  } catch (error) {
    console.error('PDF generation error:', error);
    res.status(500).json({
      message: 'Lỗi tạo PDF: ' + (error.message || 'Unknown error'),
    });
  }
}
