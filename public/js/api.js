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
 * Tải ảnh CAPTCHA mới (Đồng bộ với ID captchaImg trong index.html)
 */
async function loadCaptcha() {
  const imgEl = document.getElementById('captchaImg');
  const reloadBtn = document.getElementById('reloadCaptcha');
  if (!imgEl) return;

  captchaRequestId++;
  const reqId = captchaRequestId;
  if (reloadBtn) reloadBtn.disabled = true;

  try {
    // Gọi đúng endpoint proxy của bạn
    const res = await fetch('/api/proxy?action=get-captcha&_=' + Date.now());
    if (!res.ok) throw new Error('Không thể tải CAPTCHA');
    
    const data = await res.json();
    if (reqId !== captchaRequestId) return;

    if (data && data.captchaUrl) {
      imgEl.src = data.captchaUrl;
      currentCookie = data.cookie || '';
      imgEl.classList.add('loaded');
    } else if (data && data.image) {
      imgEl.src = data.image.startsWith('data:') ? data.image : `data:image/png;base64,${data.image}`;
      currentCookie = data.cookie || '';
      imgEl.classList.add('loaded');
    } else {
      throw new Error('Dữ liệu CAPTCHA không hợp lệ');
    }
  } catch (err) {
    console.error('Lỗi loadCaptcha:', err);
  } finally {
    if (reloadBtn) reloadBtn.disabled = false;
  }
}

/**
 * Xử lý tra cứu vận đơn (Đồng bộ với ID btnSubmit, trackingCode, captchaText)
 */
async function submitTracking(){
  const code = document.getElementById('trackingCode').value.trim();
  const captcha = document.getElementById('captchaText').value.trim();
  const btn = document.getElementById('btnSubmit');

  if(!code || !captcha){
    showMsg('Vui lòng nhập đầy đủ mã vận đơn và CAPTCHA.');
    return;
  }

  if(!currentCookie){
    showMsg('CAPTCHA chưa sẵn sàng. Vui lòng chờ CAPTCHA hiện ra rồi thử lại.', 'wait');
    return;
  }

  btn.disabled = true;
  btn.textContent = '⏳ Đang tra cứu...';
  showMsg('Đang kết nối hệ thống VNPost, vui lòng chờ...', 'wait');

  try {
    const res = await fetch('/api/proxy?action=track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        trackingCode: code, 
        captchaText: captcha, 
        cookie: currentCookie 
      })
    }, 30000);

    let data = null;
    try { data = await res.json(); } catch(_) { throw new Error('Máy chủ trả về dữ liệu không hợp lệ.'); }

    if(data?.info?.ID){
      currentTrackingCode = data.info.ID;
      currentData = data;
      logToSheet('Tra cứu');

      // Gọi hàm render từ file pdf.js (nếu có)
      if(typeof renderScreen === 'function') renderScreen(data);
      if(typeof renderPrint === 'function') renderPrint(data);

      document.getElementById('result-card').style.display = 'block';
      document.getElementById('result').style.display = 'flex';

      showMsg('Tra cứu thành công. Bạn có thể xem, in A4 hoặc tải PDF.', 'ok');
      document.getElementById('result-card').scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      showMsg(data?.message || 'Mã CAPTCHA không đúng hoặc không tìm thấy thông tin vận đơn.');
      document.getElementById('captchaText').value = '';
      await loadCaptcha();
    }
  } catch(e) {
    if(e?.name === 'AbortError'){
      showMsg('Tra cứu mất quá nhiều thời gian. Vui lòng thử lại sau vài giây.');
    } else {
      showMsg('Lỗi tra cứu: ' + (e?.message || 'Không xác định'));
    }
  } finally {
    btn.disabled = false;
    btn.textContent = '🔎 TRA CỨU VẬN ĐƠN';
  }
}

/**
 * Hiển thị thông báo
 */
function showMsg(text, type='error'){
  const m = document.getElementById('message');
  m.className = 'msg ' + type;
  m.textContent = text;
}

// Khởi động CAPTCHA ngay khi trang load xong
document.addEventListener('DOMContentLoaded', () => {
  loadCaptcha();
  
  // Gắn sự kiện Enter cho các ô input
  document.getElementById('trackingCode').addEventListener('keydown', e => { 
    if(e.key === 'Enter') document.getElementById('captchaText').focus(); 
  });
  document.getElementById('captchaText').addEventListener('keydown', e => { 
    if(e.key === 'Enter') submitTracking(); 
  });
});
