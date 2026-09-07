// =============================================
// API.JS - Xử lý tra cứu vận đơn và đồng bộ Google Sheets
// =============================================

let currentCookie = '';
let currentTrackingCode = '';
let currentData = null;
let captchaRequestId = 0;

/**
 * Gửi nhật ký tra cứu/in ấn lên Vercel Backend (/api/track)
 * Server Backend sẽ tự động trích xuất IP và tra cứu Tỉnh/Thành để ghi vào Google Sheet
 */
async function logToSheet(action) {
  try {
    if (!currentTrackingCode) return;

    const response = await fetch('/api/track', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({
        trackingCode: currentTrackingCode,
        action: action || 'Tra cứu'
      })
    });

    if (!response.ok) {
      console.error('Lỗi khi gửi log tới Vercel Server:', await response.text());
    }
  } catch (e) {
    console.error('Lỗi kết nối tới /api/track:', e);
  }
}

// Hàm tiện ích: Escape ký tự HTML
const esc = s => String(s ?? '-').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));

// Hàm xử lý làm sạch trạng thái vận đơn
function cleanStatus(s) {
  return String(s || '-')
    .replace(/\s*\(\d{4,7}\s*:[^)]+\)/g, '')
    .replace(/\s*[\.\,]\s*Người nhận\s*:.*$/gi, '')
    .replace(/\s*[\.\,]\s*Ghi chú\s*:.*$/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

// Hàm lấy địa chỉ vị trí
function getAddress(item) {
  return typeof item?.VI_TRI === 'string' && item.VI_TRI.trim() ? item.VI_TRI.trim() : '';
}

// Hàm lấy tọa độ GPS (nếu có)
function getCoords(item) {
  let lat = item?.LAT ?? item?.Lat ?? item?.latitude ?? item?.Latitude;
  let lng = item?.LNG ?? item?.Lon ?? item?.LONG ?? item?.longitude ?? item?.Longitude;
  return lat && lng ? { lat, lng } : null;
}

// Hàm lấy tên bưu cục/đơn vị xử lý
function getOffice(item) {
  const text = String(item?.StatusText || item?.TRANG_THAI || '');
  const match = text.match(/\(([^)]+)\)/);
  if (match) return match[1].trim();
  return item?.MA_BUU_CUC || item?.TEN_BUU_CUC || '-';
}
