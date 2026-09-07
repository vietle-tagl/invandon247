// api/track.js

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { trackingCode, action } = req.body;

    // 1. Lấy IP thực của người dùng từ Vercel Header
    const forwarded = req.headers['x-forwarded-for'];
    let realIP = forwarded ? forwarded.split(',')[0].trim() : (req.socket.remoteAddress || '');

    // Nếu chạy localhost / test nội bộ
    if (realIP === '::1' || realIP === '127.0.0.1') {
      realIP = '113.161.73.1'; // IP test tạm thời (Bình Định/Hồ Chí Minh)
    }

    // 2. Tra cứu Tỉnh/Thành qua HTTPS API
    let location = "Chưa xác định";
    if (realIP) {
      try {
        const geoRes = await fetch(`https://ipapi.co/${realIP}/json/`);
        if (geoRes.ok) {
          const geoData = await geoRes.json();
          location = geoData.region || geoData.city || "Chưa xác định";
        }
      } catch (e) {
        console.error("Lỗi Geo-IP:", e.message);
      }
    }

    // 3. Gửi thẳng sang Google Apps Script
    const GOOGLE_SHEET_URL = "https://script.google.com/macros/s/AKfycbzsVn0Af2xMybpijpIDgbyoOXt588s393Udm-D_MgPBPkbLYS0xAtCxvg819VYlU0DRfQ/exec";

    const payload = {
      trackingCode: trackingCode || '',
      action: action || 'Tra cứu',
      ip: realIP,
      city: location
    };

    const sheetRes = await fetch(GOOGLE_SHEET_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // Dùng text/plain để tránh CORS preflight
      body: JSON.stringify(payload)
    });

    const sheetText = await sheetRes.text();

    return res.status(200).json({
      success: true,
      ip: realIP,
      location: location,
      sheetResponse: sheetText
    });

  } catch (error) {
    console.error('Lỗi track:', error.message);
    return res.status(500).json({ error: error.message });
  }
}
