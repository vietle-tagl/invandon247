import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  let browser = null;

  try {
    const { htmlContent, trackingCode } = req.body;

    if (!htmlContent) {
      return res.status(400).json({ message: 'Thiếu dữ liệu HTML' });
    }

    // 1. Cấu hình Chromium tối ưu cho Vercel
    const executablePath = await chromium.executablePath();

    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: executablePath,
      headless: chromium.headless,
    });

    const page = await browser.newPage();

    // 2. Nạp toàn bộ HTML chứa layout in A4 vào Chromium
    await page.setContent(htmlContent, {
      waitUntil: ['load', 'networkidle0'], // Chờ nạp xong CSS/Fonts/Images
    });

    // 3. Tiến hành render PDF sử dụng chuẩn A4 và Margins
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true, // Giữ màu nền/border
      margin: {
        top: '6mm',
        right: '8mm',
        bottom: '6mm',
        left: '8mm'
      }
    });

    await browser.close();

    // 4. Trả về File PDF tải trực tiếp (Stream/Buffer)
    const filename = `InVanDon247_VNPost_${trackingCode || '247'}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    return res.status(200).send(pdfBuffer);

  } catch (error) {
    if (browser) await browser.close();
    console.error('Puppeteer PDF Error:', error);
    return res.status(500).json({ 
      message: 'Lỗi tạo PDF trên Server', 
      error: error.message 
    });
  }
}
