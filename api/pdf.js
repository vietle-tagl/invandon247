import { chromium } from 'puppeteer-core';
import chromiumBinary from '@sparticuz/chromium';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { trackingCode, captchaText, cookie, data } = req.body;

  // Ở đây bạn cần render HTML (dùng logic renderPrint trong file cũ của bạn)
  // Để tách bạch, mình giả sử bạn đã có dữ liệu và truyền thẳng HTML vào đây.
  // Tuy nhiên, do chúng ta không thể gửi HTML sang file khác dễ dàng, 
  // chúng ta sẽ sử dụng chính file `public/index.html` làm template để render.

  try {
    // Khởi động Chromium
    const executablePath = await chromiumBinary.executablePath();
    const browser = await chromium.launch({
      args: chromiumBinary.args,
      executablePath,
      headless: chromiumBinary.headless,
    });

    const page = await browser.newPage();

    // 1. Điều hướng đến trang web của bạn (hoặc tạo 1 trang HTML tĩnh riêng cho in)
    // Lưu ý: Vercel cần URL tuyệt đối. Nếu đang deploy dev, hãy thay bằng localhost.
    const appUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';
    
    // Giả sử bạn có 1 đường dẫn để render riêng phần in, hoặc dùng chính index.html
    await page.goto(`${appUrl}/?print=1&code=${trackingCode}`, { waitUntil: 'networkidle0' });

    // 2. Đợi dữ liệu và hình ảnh tải xong
    await page.evaluate(async () => {
      // Nếu trên trang bạn dùng JS để gọi API lấy dữ liệu, bạn cần đợi nó render.
      // Ở đây mình giả sử bạn truyền dữ liệu vào bằng cách gọi API từ client.
      // Nếu bạn render bằng JS (client-side), bạn cần đợi vài giây hoặc dùng MutationObserver.
      await document.fonts.ready;
    });
    
    // 3. Tạo PDF với cấu hình in A4 chuẩn
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '6mm',
        bottom: '6mm',
        left: '8mm',
        right: '8mm'
      },
      // Vì CSS của bạn đã có @page rồi, bạn có thể bỏ margin ở đây nếu muốn dùng @page
    });

    await browser.close();

    // 4. Trả về file PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="InVanDon247_VNPost_${trackingCode}.pdf"`);
    res.send(Buffer.from(pdfBuffer));
  } catch (error) {
    console.error('PDF Error:', error);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
}
