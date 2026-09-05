// api/track.js
import https from 'https';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { trackingCode, action } = req.body;

  // Lấy IP thật từ header của Vercel
  const forwarded = req.headers['x-forwarded-for'];
  const realIP = forwarded ? forwarded.split(',')[0].trim() : req.socket.remoteAddress;

  // Ẩn danh hóa IP (Cắt bớt phần cuối)
  let anonymizedIP = "0.0.0.0";
  if (realIP && realIP !== '::1' && realIP !== '::ffff:127.0.0.1') {
    let parts = realIP.split('.');
    if (parts.length === 4) {
      anonymizedIP = parts.slice(0, 3).join('.') + '.0';
    } else {
      anonymizedIP = realIP.split(':').slice(0, 3).join(':') + '::';
    }
  }

  // Gửi dữ liệu lên Google Apps Script (Dùng https để không bị chặn CORS)
  const GOOGLE_SHEET_URL = "https://script.google.com/macros/s/AKfycbzsVn0Af2xMybpijpIDgbyoOXt588s393Udm-D_MgPBPkbLYS0xAtCxvg819VYlU0DRfQ/exec";

  const postData = JSON.stringify({
    trackingCode: trackingCode,
    action: action,
    clientIP: anonymizedIP,
    location: "Chưa xác định" // Tạm thời để "Chưa xác định", đã có IP là được
  });

  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  // Gửi request lên Google Apps Script
  await new Promise((resolve) => {
    const req = https.request(GOOGLE_SHEET_URL, options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        console.log('Gửi lên Google Sheet thành công:', data);
        resolve();
      });
    });

    req.on('error', (e) => {
      console.error('Lỗi gửi lên Google Sheet:', e.message);
      resolve();
    });

    req.write(postData);
    req.end();
  });

  // Trả về kết quả cho frontend
  res.status(200).json({ success: true });
}
