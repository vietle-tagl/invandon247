import http from 'http';
import https from 'https';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { trackingCode, action } = req.body;
  const forwarded = req.headers['x-forwarded-for'];
  const realIP = forwarded ? forwarded.split(',')[0].trim() : (req.socket.remoteAddress || '');

  // 1. Định vị Tỉnh/Thành (Dùng HTTP gốc để không bị lỗi Fetch của Vercel)
  let location = "Chưa xác định";
  if (realIP && realIP !== '::1' && realIP !== '127.0.0.1') {
    try {
      location = await new Promise((resolve) => {
        http.get(`http://ip-api.com/json/${realIP}?lang=vi`, (resp) => {
          let data = '';
          resp.on('data', chunk => data += chunk);
          resp.on('end', () => {
            try {
              const geo = JSON.parse(data);
              resolve(geo.regionName || geo.city || "Chưa xác định");
            } catch (e) { resolve("Chưa xác định"); }
          });
        }).on("error", () => resolve("Chưa xác định"));
      });
    } catch (e) {}
  }

  // 2. Chuẩn bị dữ liệu gửi lên Sheet
  const postData = JSON.stringify({
    trackingCode: trackingCode || '',
    action: action || 'Tra cứu',
    ip: realIP,
    city: location
  });

  const GOOGLE_SHEET_URL = "https://script.google.com/macros/s/AKfycbzsVn0Af2xMybpijpIDgbyoOXt588s393Udm-D_MgPBPkbLYS0xAtCxvg819VYlU0DRfQ/exec";
  
  // 3. Đẩy lên Sheet bằng HTTPS gốc
  try {
    await new Promise((resolve) => {
      const options = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      };
      // Vì Google script url sẽ redirect, Vercel xử lý an toàn hơn với node-fetch nếu redirect, nhưng ta gọi qua Web App URL
      const reqSheet = https.request(GOOGLE_SHEET_URL, options, (resSheet) => {
        resSheet.on('data', () => {});
        resSheet.on('end', resolve);
      });
      reqSheet.on('error', resolve);
      reqSheet.write(postData);
      reqSheet.end();
    });
  } catch (e) {}

  res.status(200).json({ success: true, ip: realIP, city: location });
}
