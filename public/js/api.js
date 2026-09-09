// =============================================
// PUBLIC/JS/API.JS - Xử lý Tra cứu, CAPTCHA và Nhật ký
// =============================================

let currentCookie = '';
let currentTrackingCode = '';
let currentData = null;
let captchaRequestId = 0;

// BỘ ĐẾM GOOGLE SHEETS - URL CŨ (ĐANG GHI LOGS)
const GOOGLE_SHEET_URL = "https://script.google.com/macros/s/AKfycbzsVn0Af2xMybpijpIDgbyoOXt588s393Udm-D_MgPBPkbLYS0xAtCxvg819VYlU0DRfQ/exec"; 

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
 * Hàm thoát ký tự HTML (BẮT BUỘC PHẢI CÓ)
 */
const esc = s => String(s ?? '-').replace(/[&<>"']/g, m => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
}[m]));

// =============================================
// HÀM HIỂN THỊ KẾT QUẢ (RENDER SCREEN)
// =============================================
function renderScreen(data){
  const info = data.info || {};
  const locate = data.locate || [];
  const delivery = data.delivery || [];
  const status = latestStatus(data);
  const dp = getDeliveryPerson(data);

  const html = `
  <div class="detail-box">
    <div class="detail-title">
      <svg class="loc-icon" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
      CHI TIẾT BƯU GỬI
    </div>
    <div class="detail-grid">
      <div class="detail-item">✉ Mã vận đơn: <b>${esc(info.ID)}</b></div>
      <div class="detail-item">⚖ Khối lượng: <b>${esc(info.Weight || 0)} gam</b></div>
      <div class="detail-item">📍 Trạng thái: <span class="status-badge">${esc(cleanStatus(status))}</span></div>
      <div class="detail-item">📤 Bưu cục gửi: <b>${esc(info.BC_GUI || '-')}</b></div>
      <div class="detail-item">📥 Bưu cục phát: <b>${esc(info.BC_PHAT || '-')}</b></div>
      <div class="detail-item">👤 Người nhận: <span class="receiver-text">${esc(dp.receiver !== '-' ? dp.receiver : '-')}</span></div>
    </div>
  </div>

  <div class="section-title">THÔNG TIN TRẠNG THÁI (${locate.length} SỰ KIỆN)</div>

  <div class="timeline">
    ${locate.map((item,i) => {
      const address = getAddress(item);
      const coords = getCoords(item);
      const office = getOffice(item);
      return `
      <div class="event ${i === locate.length - 1 ? 'latest' : ''}" id="event-${i}">
        <span class="event-dot"></span>
        <div class="event-time">${esc((item.Date || '') + ' ' + (item.TimeDetail || ''))}</div>
        <div class="event-status">
          ${esc(cleanStatus(item.StatusText))}
          <b>Bưu cục: ${esc(office.full)}</b>
        </div>
        <div class="event-location">${esc(address)}</div>
        <button class="map-btn" title="Xem vị trí" onclick='openMap(${JSON.stringify(address)},${JSON.stringify(cleanStatus(item.StatusText))},${JSON.stringify(coords)})'>➤</button>
      </div>`;
    }).join('')}
  </div>

  <div class="delivery">
    <div class="section-title" style="margin-left:0">THÔNG TIN PHÁT</div>
    <table class="delivery-table">
      <thead>
        <tr>
          <th>Ngày</th>
          <th>Bưu cục / Bưu tá</th>
          <th>Chi tiết</th>
        </tr>
      </thead>
      <tbody>
        ${delivery.length ? delivery.map(d => {
          const o = getOfficeForDelivery(data, d);
          const pi = getDeliveryPerson({ delivery:[d] });
          const postmanText = pi.name !== '-' ? pi.name + (pi.phone !== '-' ? ' - ' + pi.phone : '') : '';
          return `
          <tr>
            <td>${esc(getDeliveryTime(d))}</td>
            <td>
              <b>${esc(o.full)}</b>
              ${postmanText ? `<div class="postman-info">Bưu tá: ${esc(postmanText)}</div>` : ''}
            </td>
            <td>${esc(d.STATUSTEXT || d.StatusText || '-')}</td>
          </tr>`;
        }).join('') : `<tr><td colspan="3" style="text-align:center; color:#94a3b8;">Chưa có dữ liệu phát</td></tr>`}
      </tbody>
    </table>

    <div class="delivery-cards-mobile">
      ${delivery.length ? delivery.map(d => {
        const o = getOfficeForDelivery(data, d);
        const pi = getDeliveryPerson({ delivery:[d] });
        const postmanText = pi.name !== '-' ? pi.name + (pi.phone !== '-' ? ' - ' + pi.phone : '') : '';
        return `
        <div class="delivery-card-item">
          <div class="delivery-card-header">
            <span>📅 ${esc(getDeliveryTime(d))}</span>
          </div>
          <div class="delivery-card-body">
            <div><b>Bưu cục:</b> ${esc(o.full)}</div>
            ${postmanText ? `<div style="color:var(--text-muted); font-size:12px;"><b>Bưu tá:</b> ${esc(postmanText)}</div>` : ''}
            <div style="margin-top:2px;"><b>Trạng thái:</b> <span style="color:var(--green); font-weight:600;">${esc(d.STATUSTEXT || d.StatusText || '-')}</span></div>
          </div>
        </div>`;
      }).join('') : `<div class="delivery-card-item" style="text-align:center; color:#94a3b8;">Chưa có dữ liệu phát</div>`}
    </div>
  </div>

  <div id="map-panel" class="map-panel">
    <div class="map-toolbar">
      <b id="map-title">Vị trí bưu cục</b>
      <a id="map-link" target="_blank" rel="noopener">Mở Google Maps ↗</a>
    </div>
    <iframe id="map-frame" class="map-frame" loading="lazy"></iframe>
  </div>

  <div class="screen-footer">© 2026 InVanDon247. All rights reserved. Dữ liệu được truy xuất từ hệ thống VNPost</div>`;

  document.getElementById('screen-result').innerHTML = html;
}

function openMap(address, title, coords){
  const panel = document.getElementById('map-panel');
  panel.classList.add('show');
  document.getElementById('map-title').textContent = title + ' — ' + address;
  const q = coords ? `${coords.lat},${coords.lng}` : address;
  document.getElementById('map-link').href = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(q);
  document.getElementById('map-frame').src = 'https://www.google.com/maps?q=' + encodeURIComponent(q) + '&output=embed';
  panel.scrollIntoView({ behavior:'smooth', block:'nearest' });
}

// =============================================
// CÁC HÀM TIỆN ÍCH LÀM SẠCH DỮ LIỆU
// =============================================

function cleanStatus(s){
  return String(s || '-')
    .replace(/\s*\(\d{4,7}\s*:[^)]+\)/g, '')
    .replace(/\s*[\.\,]\s*Người nhận\s*:.*$/gi, '')
    .replace(/\s*[\.\,]\s*Ghi chú\s*:.*$/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function getAddress(item){
  return typeof item?.VI_TRI === 'string' && item.VI_TRI.trim() ? item.VI_TRI.trim() : '';
}

function getCoords(item){
  let lat = item?.LAT ?? item?.Lat ?? item?.latitude ?? item?.Latitude;
  let lng = item?.LNG ?? item?.Lon ?? item?.LONG ?? item?.longitude ?? item?.Longitude;
  return lat && lng ? {lat,lng} : null;
}

function getOffice(item){
  const text = String(item?.StatusText || item?.STATUSTEXT || '');
  const m = text.match(/\((\d{4,7})\s*:\s*([^)]*)\)/);
  if(m) return { code:m[1], name:m[2].trim(), full:m[1]+' - '+m[2].trim() };
  const code = item?.POSCode ?? item?.POSCODE ?? item?.ToPOSCode ?? '';
  return { code:String(code || '-'), name:'', full:String(code || '-') };
}

function getOfficeForDelivery(data,d){
  const direct = getOffice({
    StatusText: d?.STATUSTEXT || d?.StatusText,
    POSCode: d?.POSCODE || d?.POSCode || d?.ToPOSCode
  });
  if(direct.name) return direct;
  const code = String(d?.ToPOSCode || d?.POSCode || d?.POSCODE || direct.code || '').trim();
  if(code){
    const found = (data?.locate || []).slice().reverse().find(x => String(x?.POSCode || x?.POSCODE || '').trim() === code);
    if(found) return getOffice(found);
  }
  return direct;
}

function getDeliveryRecord(data){
  const list = Array.isArray(data?.delivery) ? data.delivery : [];
  if(!list.length) return null;
  return list.find(d => /phát thành công|delivered/i.test(String(d?.STATUSTEXT || d?.StatusText || ''))) || list[list.length - 1];
}

function getDeliveryTime(d){
  return String(d?.NGAY_PHAT || d?.DATE || d?.Date || d?.TimeDetail || d?.NGAY_NHAP || '-').trim() || '-';
}

function getDeliveryPerson(data){
  const d = getDeliveryRecord(data);
  if(!d) return { route:'-', name:'-', phone:'-', receiver:'-', time:'-' };

  const cn = String(d.NGAY_CN || '').trim();
  let route='-', name='-', phone='-';

  if(cn){
    const slashIndex = cn.indexOf('/');
    if(slashIndex >= 0){
      route = cn.slice(0, slashIndex).trim() || '-';
      let right = cn.slice(slashIndex + 1).trim();
      const pm = right.match(/(?:ĐT|ÐT)\s*B\s*[.·]?\s*T(?:á|a)?\s*[:：]?\s*(\d[\d .-]{7,}\d)\s*$/iu) || right.match(/(\d[\d .-]{8,}\d)\s*$/);
      if(pm){
        phone = pm[1].replace(/\D/g, '');
        right = right.slice(0, pm.index).trim();
      }
      name = right.replace(/[.\s]*(?:ĐT|ÐT)\s*B\s*[.·]?\s*T(?:á|a)?\s*[:：]?\s*$/iu, '').replace(/[.\s]+$/,'').trim() || '-';
    }
  }

  const st = String(d.STATUSTEXT || d.StatusText || '');
  let receiver='-';
  const rm = st.match(/Người nhận\s*:\s*(.*)$/i);
  if(rm) receiver = rm[1].replace(/^\(\s*\)\s*/, '').trim();

  return { route, name, phone, receiver, time:getDeliveryTime(d) };
}

function latestStatus(data){
  const d = getDeliveryRecord(data);
  if(d?.STATUSTEXT) return String(d.STATUSTEXT).trim();
  const loc = data.locate || [];
  return loc.length ? String(loc[loc.length - 1].StatusText || '-').trim() : 'ĐANG VẬN CHUYỂN';
}

function showMsg(text, type='error'){
  const m = document.getElementById('message');
  m.className = 'msg ' + type;
  m.textContent = text;
}

function fetchWithTimeout(url, options={}, timeout=12000){
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  return fetch(url, { ...options, signal:controller.signal, cache:'no-store' }).finally(() => clearTimeout(timer));
}

/**
 * Tải ảnh CAPTCHA mới
 */
async function loadCaptcha() {
  const imgEl = document.getElementById('captchaImg');
  const reloadBtn = document.getElementById('reloadCaptcha');
  if (!imgEl) return;

  captchaRequestId++;
  const reqId = captchaRequestId;
  if (reloadBtn) reloadBtn.disabled = true;

  try {
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
 * Xử lý tra cứu vận đơn
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

      // Gọi hàm render để hiển thị kết quả lên màn hình
      renderScreen(data);
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

// Khởi động CAPTCHA ngay khi trang load xong
document.addEventListener('DOMContentLoaded', () => {
  loadCaptcha();
  
  document.getElementById('trackingCode').addEventListener('keydown', e => { 
    if(e.key === 'Enter') document.getElementById('captchaText').focus(); 
  });
  document.getElementById('captchaText').addEventListener('keydown', e => { 
    if(e.key === 'Enter') submitTracking(); 
  });
});
