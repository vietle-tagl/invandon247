// api/track.js

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { trackingCode, action } = req.body;

    // 1. Lấy IP thực của người dùng từ Vercel Header
    const forwarded = req.headers['x-forwarded-for'];
    const realIP = forwarded ? forwarded.split(',')[0].trim() : req.socket.remoteAddress;

    // 2. Tra cứu Tỉnh/Thành phố dựa trên IP (Dùng ip-api.com)
    let location = "Chưa xác định";
    if (realIP && realIP !== '::1' && realIP !== '127.0.0.1' && !realIP.startsWith('192.168.')) {
      try {
        const geoRes = await fetch(`http://ip-api.com/json/${realIP}?lang=vi`);
        if (geoRes.ok) {
          const geoData = await geoRes.json();
          if (geoData.status === 'success') {
            // Lấy Tỉnh/Thành phố (regionName hoặc city)
            location = geoData.regionName || geoData.city || "Chưa xác định";
          }
        }
      } catch (geoError) {
        console.error('Lỗi tra cứu Geo IP:', geoError.message);
      }
    }

    // 3. Gửi dữ liệu đầy đủ lên Google Apps Script
    const GOOGLE_SHEET_URL = "https://script.google.com/macros/s/AKfycbzsVn0Af2xMybpijpIDgbyoOXt588s393Udm-D_MgPBPkbLYS0xAtCxvg819VYlU0DRfQ/exec";

    const postData = {
      trackingCode: trackingCode || '',
      action: action || 'Tra cứu',
      ip: realIP || '',
      city: location
    };

    const sheetResponse = await fetch(GOOGLE_SHEET_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(postData),
      redirect: 'follow'
    });

    const responseText = await sheetResponse.text();
    console.log('Gửi lên Google Sheet thành công:', responseText);

    // 4. Phản hồi về cho Client
    return res.status(200).json({ 
      success: true, 
      ip: realIP, 
      location: location 
    });

  } catch (error) {
    console.error('Lỗi xử lý api/track:', error.message);
    return res.status(500).json({ error: error.message });
  }
}
