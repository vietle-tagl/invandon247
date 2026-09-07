// =============================================
// API/TRACK.JS - Serverless Function trên Vercel
// =============================================

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { trackingCode, action } = req.body || {};

    // 1. Trích xuất IP thực của người dùng
    const forwarded = req.headers['x-forwarded-for'];
    let realIP = forwarded ? forwarded.split(',')[0].trim() : (req.socket.remoteAddress || '');

    if (realIP === '::1' || realIP === '127.0.0.1' || !realIP) {
      realIP = '113.161.73.1';
    }

    // 2. Tra cứu Tỉnh/Thành theo IP
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
      console.error("Lỗi Geo-IP:", e.message);
    }

    // 3. Đóng gói dữ liệu gửi lên Google Apps Script
    const GOOGLE_SHEET_URL = "https://script.google.com/macros/s/AKfycbzsVn0Af2xMybpijpIDgbyoOXt588s393Udm-D_MgPBPkbLYS0xAtCxvg819VYlU0DRfQ/exec";

    const payload = JSON.stringify({
      trackingCode: trackingCode || '',
      action: action || 'Tra cứu',
      ip: realIP,
      city: location
    });

    await fetch(GOOGLE_SHEET_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: payload
    });

    return res.status(200).json({ 
      success: true, 
      ip: realIP, 
      location: location 
    });

  } catch (error) {
    console.error('Lỗi track:', error);
    return res.status(500).json({ error: error.message });
  }
}
