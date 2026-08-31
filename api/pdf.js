import { chromium } from 'puppeteer-core';
import chromiumBinary from '@sparticuz/chromium';

export default async function handler(req, res) {
  try {
    const browser = await chromiumBinary.launch({
      args: chromiumBinary.args,
      executablePath: await chromiumBinary.executablePath(),
      headless: chromiumBinary.headless,
    });

    const page = await browser.newPage();
    // ... (Phần page.goto, page.pdf giữ nguyên như cũ)
    await browser.close();
    // Trả về PDF cho client
  } catch (error) {
    console.error(error); // Xem log chi tiết trên Vercel
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
}
