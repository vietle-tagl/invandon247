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
 * Tải ảnh CAPTCHA mới
 */
async function refreshCaptcha() {
  const imgEl = document.getElementById('captchaImage') || 
                document.getElementById('imgCaptcha') || 
                document.querySelector('img[alt*="CAPTCHA"]') ||
                document.querySelector('.captcha-box img') ||
                document.querySelector('img');

  if (!imgEl) return;

  captchaRequestId++;
  const reqId = captchaRequestId;

  try {
    const res = await fetch('/api/captcha?t=' + Date.now());
    if (!res.ok) throw new Error('Không thể tải CAPTCHA');
    
    const contentType = res.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      const data = await res.json();
      if (reqId !== captchaRequestId) return;

      if (data && data.image) {
        imgEl.src = data.image.startsWith('data:') ? data.image : `data:image/png;base64,${data.image}`;
        currentCookie = data.cookie || '';
      } else if (data && data.captchaUrl) {
        imgEl.src = data.captchaUrl;
        currentCookie = data.cookie || '';
      } else if (data && data.base64) {
        imgEl.src = data.base64.startsWith('data:') ? data.base64 : `data:image/png;base64,${data.base64}`;
        currentCookie = data.cookie || '';
      }
    } else {
      // Trường hợp Server trả về dữ liệu ảnh trực tiếp (Image/Blob)
      const blob = await res.blob();
      if (reqId !== captchaRequestId) return;
      const objectUrl = URL.createObjectURL(blob);
      imgEl.src = objectUrl;
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
      logToSheet('Tra cứu');
      return result.data;
    } else {
      alert(result.message || 'Tra cứu thất bại. Vui lòng kiểm tra lại CAPTCHA!');
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

const esc = s => String(s ?? '-').replace(/[&<>"']/g, m => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
}[m]));

function cleanStatus(s) {
  return String(s || '-')
    .replace(/\s*\(\d{4,7}\s*:[^)]+\)/g, '')
    .replace(/\s*[\.\,]\s*Người nhận\s*:.*$/gi, '')
    .replace(/\s*[\.\,]\s*Ghi chú\s*:.*$/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function getAddress(item) {
  return typeof item?.VI_TRI === 'string' && item.VI_TRI.trim() ? item.VI_TRI.trim() : '';
}

function getCoords(item) {
  let lat = item?.LAT ?? item?.Lat ?? item?.latitude ?? item?.Latitude;
  let lng = item?.LNG ?? item?.Lon ?? item?.LONG ?? item?.longitude ?? item?.Longitude;
  return (lat && lng) ? { lat: parseFloat(lat), lng: parseFloat(lng) } : null;
}

function getOffice(item) {
  const text = String(item?.StatusText || item?.TRANG_THAI || '');
  const match = text.match(/\(([^)]+)\)/);
  if (match) return match[1].trim();
  return item?.MA_BUU_CUC || item?.TEN_BUU_CUC || '-';
}

// Kích hoạt ngay khi trang tải xong
if (document.readyState === 'loading') {
  document.addEventListener("DOMContentLoaded", refreshCaptcha);
} else {
  refreshCaptcha();
}
