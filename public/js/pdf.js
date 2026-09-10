// =============================================
// PDF.JS - SỬA LỖI NÚT BẤM VÀ THỐNG NHẤT FOOTER
// =============================================

// Khai báo biến toàn cục hứng dữ liệu từ api.js
window.currentData = window.currentData || null;
window.currentTrackingCode = window.currentTrackingCode || '';

const esc = s => String(s ?? '-').replace(/[&<>"']/g, m => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
}[m]));

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

function generateBarcodeBase64(text) {
  try {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    JsBarcode(svg, text, {
      format: "CODE128",
      width: 2,
      height: 60,
      displayValue: false,
      margin: 6
    });
    const xml = new XMLSerializer().serializeToString(svg);
    return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(xml)));
  } catch(e) {
    return '';
  }
}

function buildPrintEventCard(item){
  return `
    <div class="p-event-card">
      <div class="p-event-time">⏰ ${esc((item.Date || '') + ' ' + (item.TimeDetail || ''))}</div>
      <div class="p-event-desc">${esc(cleanStatus(item.StatusText))}</div>
      <div class="p-event-office">Bưu cục: ${esc(getOffice(item).full)} ${getAddress(item) ? ' - ' + esc(getAddress(item)) : ''}</div>
    </div>`;
}

function buildPrintPageHTML(data, chunk, pageIndex, totalPages, splitIndex, includeDelivery){
  const info = data.info || {};
  const locate = data.locate || [];
  const delivery = data.delivery || [];
  const dp = getDeliveryPerson(data);

  const left = chunk.slice(0, splitIndex);
  const right = chunk.slice(splitIndex);

  const trackingCode = info.ID || window.currentTrackingCode || '-';
  const qrLink = `https://invandon247.com/?code=${trackingCode}`;
  
  let qrSrc = '';
  try {
    const qrEl = document.createElement('div');
    new QRCode(qrEl, {
      text: qrLink,
      width: 58,
      height: 58,
      colorDark: "#000000",
      colorLight: "#ffffff",
      correctLevel: QRCode.CorrectLevel.H
    });
    const qrCanvas = qrEl.querySelector('canvas');
    const qrImg = qrEl.querySelector('img');
    qrSrc = qrCanvas ? qrCanvas.toDataURL('image/png') : (qrImg ? qrImg.src : '');
  } catch(e) {}

  const barcodeBase64 = generateBarcodeBase64(trackingCode);

  return `
    <div class="print-page">
      <div class="p-header">
        <div class="p-header-left">
          <img class="p-logo" src="/images/logo.png" alt="InVanDon247">
          <div class="p-brand-info">
            <div class="p-brand-name">InVanDon247</div>
            <div class="p-brand-sub">Công cụ tra cứu và tạo phiếu vận đơn A4</div>
          </div>
        </div>
        <div class="p-title-wrap">
          <div class="p-title-main">THÔNG TIN VẬN ĐƠN</div>
          <div class="p-title-code">Mã vận đơn: ${esc(trackingCode)} (VNPOST)</div>
        </div>
        ${qrSrc ? `<img class="p-qr-code" src="${qrSrc}" alt="QR Code">` : ''}
      </div>

      ${pageIndex === 0 ? `
      <div class="p-section-box">
        <div class="p-section-head">CHI TIẾT BƯU GỬI</div>
        <div class="p-grid-info">
          <div class="p-barcode-item">
            ${barcodeBase64 ? `<img class="p-barcode-img" src="${barcodeBase64}" alt="Barcode">` : ''}
          </div>
          
          <div class="p-info-item">
            <div class="p-info-top">Mã vận đơn: <b>${esc(info.ID || trackingCode)}</b></div>
            <div>Bưu cục gửi: <b>${esc(info.BC_GUI || '-')}</b></div>
          </div>
          
          <div class="p-info-item">
            <div class="p-info-top">Khối lượng: <b>${esc(info.Weight || 0)} gam</b></div>
            <div>Bưu cục phát: <b>${esc(info.BC_PHAT || '-')}</b></div>
          </div>
          
          <div class="p-info-item">
            <div class="p-info-top">Trạng thái: <b style="color:#059669">${esc(cleanStatus(latestStatus(data)))}</b></div>
            <div>Người nhận: <b>${esc(dp.receiver !== '-' ? dp.receiver : '-')}</b></div>
          </div>
        </div>
      </div>
      ` : ''}

      <div class="p-section-box p-timeline-box">
        <div class="p-section-head">LỊCH SỬ HÀNH TRÌNH (${locate.length} SỰ KIỆN)</div>
        <div style="padding:4px;">
          <table class="p-timeline-table">
            <tr>
              <td>${left.map(buildPrintEventCard).join('')}</td>
              <td>${right.map(buildPrintEventCard).join('')}</td>
            </tr>
          </table>
        </div>
      </div>

      ${includeDelivery ? `
      <div class="p-section-box p-delivery-box">
        <div class="p-section-head">THÔNG TIN PHÁT</div>
        <div style="padding:3px;">
          <table class="p-delivery-table">
            <thead>
              <tr>
                <th style="width:20%;">Ngày</th>
                <th style="width:40%;">Bưu cục / Bưu tá</th>
                <th style="width:40%;">Chi tiết</th>
              </tr>
            </thead>
            <tbody>
              ${delivery.length ? delivery.map(d => {
                const o = getOfficeForDelivery(data, d);
                const pi = getDeliveryPerson({delivery:[d]});
                const postmanText = pi.name !== '-' ? pi.name + (pi.phone !== '-' ? ' - ' + pi.phone : '') : '';
                return `
                <tr>
                  <td>${esc(getDeliveryTime(d))}</td>
                  <td>
                    <b>${esc(o.full)}</b>
                    ${postmanText ? `<br><span style="color:#475569;">Bưu tá: ${esc(postmanText)}</span>` : ''}
                  </td>
                  <td>${esc(d.STATUSTEXT || d.StatusText || '-')}</td>
                </tr>`;
              }).join('') : `<tr><td colspan="3" style="text-align:center;">Chưa có dữ liệu phát</td></tr>`}
            </tbody>
          </table>
        </div>
      </div>
      ` : ''}

      <!-- CHÂN TRANG ĐỒNG NHẤT KHÔNG TRÙNG LẶP -->
      <div class="p-footer">
        © 2026 InVanDon247. All rights reserved. Dữ liệu được truy xuất từ hệ thống VNPost — Trang ${pageIndex + 1}/${totalPages}
      </div>
    </div>`;
}

function renderPrint(data){
  let printArea = document.getElementById('print-area');
  if(!printArea){
    printArea = document.createElement('div');
    printArea.id = 'print-area';
    document.body.appendChild(printArea);
  }

  const locate = Array.isArray(data?.locate) ? data.locate : [];
  const chunkSize = 12; // Số sự kiện tối đa mỗi trang
  const totalPages = Math.ceil(locate.length / chunkSize) || 1;
  
  let html = '';
  for(let i = 0; i < totalPages; i++){
    const chunk = locate.slice(i * chunkSize, (i + 1) * chunkSize);
    const splitIndex = Math.ceil(chunk.length / 2);
    const isLastPage = (i === totalPages - 1);
    html += buildPrintPageHTML(data, chunk, i, totalPages, splitIndex, isLastPage);
  }
  
  printArea.innerHTML = html;
}

function safeTrackingFilename(){
  const raw = String(window.currentTrackingCode || window.currentData?.info?.ID || '247').trim();
  return raw.replace(/[^a-zA-Z0-9_-]/g, '_');
}

// HÀM XỬ LÝ IN A4
async function printA4(){
  if(!window.currentData){
    alert('Vui lòng tra cứu vận đơn trước khi thực hiện.');
    return;
  }

  renderPrint(window.currentData);

  const oldTitle = document.title;
  document.title = `InVanDon247_VNPost_${safeTrackingFilename()}`;

  setTimeout(() => {
    window.print();
    document.title = oldTitle;
  }, 200);
}

// HÀM XỬ LÝ TẢI PDF
async function downloadPDF(){
  if(!window.currentData){
    alert('Vui lòng tra cứu vận đơn trước khi thực hiện.');
    return;
  }

  const pdfBtn = document.querySelector('.pdf-btn');
  const originalText = pdfBtn ? pdfBtn.innerHTML : '';

  try{
    if(pdfBtn){
      pdfBtn.disabled = true;
      pdfBtn.innerHTML = '⏳ Đang tạo PDF...';
    }

    renderPrint(window.currentData);
    
    const printArea = document.getElementById('print-area');
    const pages = printArea.querySelectorAll('.print-page');
    
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true
    });

    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      const canvas = await html2canvas(page, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/png');
      if (i > 0) pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, 0, 210, 297);
    }

    pdf.save(`InVanDon247_VNPost_${safeTrackingFilename()}.pdf`);

  } catch(error) {
    console.error('PDF Error:', error);
    alert('Không thể tạo file PDF. Vui lòng thử chức năng "In A4" và chọn "Lưu dưới dạng PDF".');
  } finally {
    if(pdfBtn){
      pdfBtn.disabled = false;
      pdfBtn.innerHTML = originalText;
    }
  }
}

// BẮT SỰ KIỆN NÚT BẤM KHI TRANG TẢI XONG
document.addEventListener('DOMContentLoaded', () => {
  const printBtn = document.querySelector('.print-btn');
  const pdfBtn = document.querySelector('.pdf-btn');

  if(printBtn) printBtn.addEventListener('click', printA4);
  if(pdfBtn) pdfBtn.addEventListener('click', downloadPDF);
});
