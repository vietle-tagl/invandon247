// =============================================
// PUBLIC/JS/API.JS - Xử lý Tra cứu, CAPTCHA và Nhật ký
// =============================================

let currentCookie = '';
let currentTrackingCode = '';
let currentData = null;
let captchaRequestId = 0;

/**
 * Gửi nhật ký hành động về Backend Vercel (/api/track)
 */
async function logToSheet(action) {
  try {
    if (!currentTrackingCode) return;

    await fetch('/api/track', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({
        trackingCode: currentTrackingCode,
        action: action || 'Tra cứu'
      })
    });
  } catch (e) {
    console.error('Lỗi kết nối /api/track:', e);
  }
}

/**
 * Tải ảnh CAPTCHA mới từ VNPost
 */
async function refreshCaptcha() {
  const imgEl = document.getElementById('captchaImage') || document.getElementById('imgCaptcha');
  if (!imgEl) return;

  captchaRequestId++;
  const reqId = captchaRequestId;

  try {
    // Gọi API lấy CAPTCHA qua serverless proxy hoặc trực tiếp
    const res = await fetch('/api/captcha?t=' + Date.now());
    if (!res.ok) throw new Error('Không thể tải CAPTCHA');
    
    const data = await res.json();
    if (reqId !== captchaRequestId) return; // Bỏ qua nếu có request mới hơn

    if (data && data.image) {
      imgEl.src = data.image.startsWith('data:') ? data.image : `data:image/png;base64,${data.image}`;
      currentCookie = data.cookie || '';
    } else if (data && data.captchaUrl) {
      imgEl.src = data.captchaUrl;
      currentCookie = data.cookie || '';
    }
  } catch (err) {
    console.error('Lỗi refreshCaptcha:', err);
  }
}

/**
 * Xử lý tra cứu vận đơn
 */
async function trackShipment(trackingCode, captchaCode) {
  if (!trackingCode) {
    alert('Vui lòng nhập mã vận đơn!');
    return null;
  }
  if (!captchaCode) {
    alert('Vui lòng nhập mã CAPTCHA!');
    return null;
  }

  currentTrackingCode = trackingCode.trim().toUpperCase();

  try {
    const response = await fetch('/api/tracking', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        trackingCode: currentTrackingCode,
        captcha: captchaCode,
        cookie: currentCookie
      })
    });

    const result = await response.json();

    if (response.ok && result.success) {
      currentData = result.data;
      // Ghi nhật ký tra cứu thành công lên Google Sheet
      logToSheet('Tra cứu');
      return result.data;
    } else {
      alert(result.message || 'Tra cứu thất bại. Vui lòng kiểm tra lại CAPTCHA!');
      // Tải lại CAPTCHA mới sau khi nhập sai
      refreshCaptcha();
      return null;
    }
  } catch (error) {
    console.error('Lỗi tra cứu:', error);
    alert('Đã xảy ra lỗi kết nối. Vui lòng thử lại!');
    refreshCaptcha();
    return null;
  }
}

// =============================================
// CÁC HÀM TIỆN ÍCH LÀM SẠCH DỮ LIỆU & GIAO DIỆN
// =============================================

// Escape ký tự HTML phòng chống XSS
const esc = s => String(s ?? '-').replace(/[&<>"']/g, m => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
}[m]));

// Làm sạch trạng thái
function cleanStatus(s) {
  return String(s || '-')
    .replace(/\s*\(\d{4,7}\s*:[^)]+\)/g, '')
    .replace(/\s*[\.\,]\s*Người nhận\s*:.*$/gi, '')
    .replace(/\s*[\.\,]\s*Ghi chú\s*:.*$/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

// Lấy địa chỉ vị trí
function getAddress(item) {
  return typeof item?.VI_TRI === 'string' && item.VI_TRI.trim() ? item.VI_TRI.trim() : '';
}

// Lấy tọa độ GPS
function getCoords(item) {
  let lat = item?.LAT ?? item?.Lat ?? item?.latitude ?? item?.Latitude;
  let lng = item?.LNG ?? item?.Lon ?? item?.LONG ?? item?.longitude ?? item?.Longitude;
  return (lat && lng) ? { lat: parseFloat(lat), lng: parseFloat(lng) } : null;
}

// Lấy thông tin bưu cục/đơn vị xử lý
function getOffice(item) {
  const text = String(item?.StatusText || item?.TRANG_THAI || '');
  const match = text.match(/\(([^)]+)\)/);
  if (match) return match[1].trim();
  return item?.MA_BUU_CUC || item?.TEN_BUU_CUC || '-';
}

// Tự động kích hoạt lấy CAPTCHA ngay khi nạp trang xong
document.addEventListener("DOMContentLoaded", function () {
  refreshCaptcha();
});
