import { chromium } from 'puppeteer-core';
import chromiumBinary from '@sparticuz/chromium';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { trackingCode } = req.body;

  try {
    // Khởi động Chromium
    const executablePath = await chromiumBinary.executablePath();
    const browser = await chromium.launch({
      args: chromiumBinary.args,
      executablePath,
      headless: chromiumBinary.headless,
    });

    const page = await browser.newPage();

    // Điều hướng về trang web của bạn (Vercel sẽ tự cung cấp URL này)
    const appUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';
    
    // Tạo URL với query string để frontend biết cần render dữ liệu
    // Lưu ý: Bạn cần sửa frontend để đọc query string này và tự động gọi API lấy dữ liệu.
    // Ví dụ: https://invandon247.vercel.app/?code=RB608708026VN
    await page.goto(`${appUrl}/?code=${trackingCode}`, { waitUntil: 'networkidle0' });

    // Đợi Font và Logo tải xong
    await page.evaluate(async () => {
      await document.fonts.ready;
      // Đợi thêm 500ms để API render xong dữ liệu trên frontend
      await new Promise(r => setTimeout(r, 500));
    });

    // Tạo PDF với cấu hình lề chuẩn CSS
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '6mm',
        bottom: '6mm',
        left: '8mm',
        right: '8mm'
      },
    });

    await browser.close();

    // Trả về PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="InVanDon247_VNPost_${trackingCode}.pdf"`);
    res.send(Buffer.from(pdfBuffer));

  } catch (error) {
    console.error('PDF Error:', error);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
}
