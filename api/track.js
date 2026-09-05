// api/track.js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { trackingCode, action } = req.body;

  // Lấy IP thật từ header của Vercel
  const forwarded = req.headers['x-forwarded-for'];
  const realIP = forwarded ? forwarded.split(',')[0].trim() : req.socket.remoteAddress;

  // Ẩn danh hóa IP
  let anonymizedIP = "0.0.0.0";
  if (realIP && realIP !== '::1' && realIP !== '::ffff:127.0.0.1') {
    let parts = realIP.split('.');
    if (parts.length === 4) {
      anonymizedIP = parts.slice(0, 3).join('.') + '.0';
    } else {
      anonymizedIP = realIP.split(':').slice(0, 3).join(':') + '::';
    }
  }

  // Xác định Tỉnh/Thành dựa trên IP (Dùng API nhưng có xử lý lỗi)
  let location = "Không xác định";
  try {
    const ipResponse = await fetch(`https://ipinfo.io/${anonymizedIP}/json`, { signal: AbortSignal.timeout(3000) });
    const ipData = await ipResponse.json();
    if (ipData.city) {
      location = ipData.city + ', ' + ipData.region;
    }
  } catch (e) {
    // Nếu lỗi hoặc quá thời gian, giữ "Không xác định"
  }

  // Gửi dữ liệu lên Google Sheet
  const GOOGLE_SHEET_URL = "https://script.google.com/macros/s/AKfycbzsVn0Af2xMybpijpIDgbyoOXt588s393Udm-D_MgPBPkbLYS0xAtCxvg819VYlU0DRfQ/exec"; 

  try {
    await fetch(GOOGLE_SHEET_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        trackingCode: trackingCode,
        action: action,
        clientIP: anonymizedIP,
        location: location
      })
    });
  } catch (e) {
    // Gửi lỗi lên Vercel log
    console.error('Lỗi gửi lên Google Sheet:', e);
  }

  // Trả về kết quả cho frontend
  res.status(200).json({ success: true });
}
