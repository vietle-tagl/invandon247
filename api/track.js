// api/track.js

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { trackingCode, action } = req.body || {};

    // 1. Lấy IP thực của client từ header Vercel
    const forwarded = req.headers['x-forwarded-for'];
    let realIP = forwarded ? forwarded.split(',')[0].trim() : (req.socket.remoteAddress || '');

    // Nếu test trên môi trường Localhost
    if (realIP === '::1' || realIP === '127.0.0.1' || !realIP) {
      realIP = '113.161.73.1'; 
    }

    // 2. Định vị Tỉnh/Thành
    let location = "Chưa xác định";
    try {
      const geoRes = await fetch(`https://ipwho.is/${realIP}`);
      if (geoRes.ok) {
        const geoData = await geoRes.json();
        if (geoData.success) {
          location = geoData.region || geoData.city || "Chưa xác định";
        }
      }
    } catch (e) {
      console.error("Geo error:", e.message);
    }

    // 3. Chuẩn bị dữ liệu gửi sang Google Apps Script
    const payload = JSON.stringify({
      trackingCode: trackingCode || '',
      action: action || 'Tra cứu',
      ip: realIP,
      city: location
    });

    const GOOGLE_SHEET_URL = "https://script.google.com/macros/s/AKfycbzsVn0Af2xMybpijpIDgbyoOXt588s393Udm-D_MgPBPkbLYS0xAtCxvg819VYlU0DRfQ/exec";

    // Gửi POST kèm Body chuẩn
    await fetch(GOOGLE_SHEET_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: payload
    });

    return res.status(200).json({ success: true, ip: realIP, location: location });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
