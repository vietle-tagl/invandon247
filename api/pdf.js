// api/pdf.js
const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');

module.exports = async (req, res) => {
  // Chỉ cho phép method POST
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { htmlContent, trackingCode } = req.body;

    if (!htmlContent) {
      return res.status(400).json({ message: 'Missing htmlContent' });
    }

    // Khởi tạo browser với options cho Vercel
    const browser = await puppeteer.launch({
      args: [
        ...chromium.args,
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--single-process',
      ],
      defaultViewport: {
        width: 800,
        height: 1000,
      },
      executablePath: await chromium.executablePath(),
      headless: true,
    });

    const page = await browser.newPage();

    // Set content với đầy đủ CSS
    await page.setContent(htmlContent, {
      waitUntil: ['networkidle0', 'domcontentloaded'],
    });

    // Chờ fonts load
    await page.evaluateHandle('document.fonts.ready');

    // Tạo PDF với kích thước A4
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
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
};
