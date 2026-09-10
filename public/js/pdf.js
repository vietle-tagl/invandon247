// =============================================
// PUBLIC/JS/PDF.JS - Xử lý In A4 và Xuất PDF
// =============================================

// Sử dụng hàm esc đã khai báo ở api.js để tránh lỗi Identifier 'esc' has already been declared
const esc = window.esc || (s => String(s ?? '-').replace(/[&<>"']/g, m => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
}[m])));

/**
 * Render dữ liệu lên mẫu phiếu in A4
 */
function renderPrint(data) {
  const printContent = document.getElementById('print-content');
  if (!printContent) return;

  const info = data.info || {};
  const locate = data.locate || [];
  const delivery = data.delivery || [];
  
  // Lấy thông tin trạng thái và người nhận từ dữ liệu
  const status = typeof latestStatus === 'function' ? latestStatus(data) : 'ĐANG VẬN CHUYỂN';
  const dp = typeof getDeliveryPerson === 'function' ? getDeliveryPerson(data) : { receiver: '-', name: '-', phone: '-' };
  const cleanSt = typeof cleanStatus === 'function' ? cleanStatus(status) : status;

  const html = `
    <div class="a4-page">
      <!-- HEADER PHIẾU -->
      <div class="a4-header">
        <div class="a4-brand">
          <h2>InVanDon247</h2>
          <p>PHIẾU XÁC NHẬN THÔNG TIN BƯU GỬI</p>
        </div>
        <div class="a4-meta">
          <div><b>Ngày in:</b> ${new Date().toLocaleDateString('vi-VN')}</div>
          <div><b>Mã vận đơn:</b> <span class="a4-code">${esc(info.ID || '-')}</span></div>
        </div>
      </div>

      <!-- TỔNG QUAN BƯU GỬI -->
      <div class="a4-section">
        <div class="a4-section-title">I. THÔNG TIN CHUNG</div>
        <table class="a4-table">
          <tr>
            <td width="15%"><b>Mã vận đơn:</b></td>
            <td width="35%"><b>${esc(info.ID || '-')}</b></td>
            <td width="15%"><b>Khối lượng:</b></td>
            <td width="35%">${esc(info.Weight || 0)} gam</td>
          </tr>
          <tr>
            <td><b>Bưu cục gửi:</b></td>
            <td>${esc(info.BC_GUI || '-')}</td>
            <td><b>Bưu cục phát:</b></td>
            <td>${esc(info.BC_PHAT || '-')}</td>
          </tr>
          <tr>
            <td><b>Trạng thái:</b></td>
            <td><b style="color: #0284c7;">${esc(cleanSt)}</b></td>
            <td><b>Người nhận:</b></td>
            <td>${esc(dp.receiver !== '-' ? dp.receiver : '-')}</td>
          </tr>
        </table>
      </div>

      <!-- NHẬT KÝ VẬN CHUYỂN -->
      <div class="a4-section">
        <div class="a4-section-title">II. LỊCH SỬ HÀNH TRÌNH (${locate.length} SỰ KIỆN)</div>
        <table class="a4-table full-width">
          <thead>
            <tr>
              <th width="20%">Thời gian</th>
              <th width="35%">Bưu cục / Vị trí</th>
              <th width="45%">Trạng thái chi tiết</th>
            </tr>
          </thead>
          <tbody>
            ${locate.length ? locate.map(item => {
              const office = typeof getOffice === 'function' ? getOffice(item) : { full: '-' };
              const addr = typeof getAddress === 'function' ? getAddress(item) : '';
              const stText = typeof cleanStatus === 'function' ? cleanStatus(item.StatusText) : item.StatusText;
              return `
              <tr>
                <td>${esc((item.Date || '') + ' ' + (item.TimeDetail || ''))}</td>
                <td>
                  <b>${esc(office.full)}</b>
                  ${addr ? `<br><small style="color:#64748b;">${esc(addr)}</small>` : ''}
                </td>
                <td>${esc(stText)}</td>
              </tr>`;
            }).join('') : `<tr><td colspan="3" style="text-align:center;">Chưa có dữ liệu hành trình</td></tr>`}
          </tbody>
        </table>
      </div>

      <!-- THÔNG TIN PHÁT HÀNG -->
      <div class="a4-section">
        <div class="a4-section-title">III. THÔNG TIN PHÁT HÀNG</div>
        <table class="a4-table full-width">
          <thead>
            <tr>
              <th width="20%">Ngày phát</th>
              <th width="35%">Bưu cục / Bưu tá</th>
              <th width="45%">Kết quả phát</th>
            </tr>
          </thead>
          <tbody>
            ${delivery.length ? delivery.map(d => {
              const o = typeof getOfficeForDelivery === 'function' ? getOfficeForDelivery(data, d) : { full: '-' };
              const pi = typeof getDeliveryPerson === 'function' ? getDeliveryPerson({ delivery:[d] }) : { name: '-', phone: '-' };
              const postmanText = pi.name !== '-' ? pi.name + (pi.phone !== '-' ? ' - ' + pi.phone : '') : '';
              const timeStr = typeof getDeliveryTime === 'function' ? getDeliveryTime(d) : '-';
              return `
              <tr>
                <td>${esc(timeStr)}</td>
                <td>
                  <b>${esc(o.full)}</b>
                  ${postmanText ? `<br><small style="color:#64748b;">Bưu tá: ${esc(postmanText)}</small>` : ''}
                </td>
                <td>${esc(d.STATUSTEXT || d.StatusText || '-')}</td>
              </tr>`;
            }).join('') : `<tr><td colspan="3" style="text-align:center;">Chưa có thông tin phát</td></tr>`}
          </tbody>
        </table>
      </div>

      <!-- FOOTER XÁC NHẬN -->
      <div class="a4-footer">
        <p><i>Dữ liệu được tra cứu trực tiếp từ hệ thống VNPost qua cổng InVanDon247 vào lúc ${new Date().toLocaleTimeString('vi-VN')} ngày ${new Date().toLocaleDateString('vi-VN')}.</i></p>
      </div>
    </div>
  `;

  printContent.innerHTML = html;
}

/**
 * Thực hiện In trang A4
 */
function triggerPrint() {
  const data = window.currentData;
  if (!data) {
    alert('Vui lòng tra cứu vận đơn trước khi in.');
    return;
  }
  
  // Log hành động in
  if (typeof logToSheet === 'function') {
    logToSheet('In A4');
  }

  window.print();
}

/**
 * Xuất file PDF bằng html2pdf hoặc cửa sổ in trình duyệt
 */
async function downloadPDF() {
  const data = window.currentData;
  if (!data) {
    alert('Vui lòng tra cứu vận đơn trước khi tải PDF.');
    return;
  }

  // Log hành động xuất PDF
  if (typeof logToSheet === 'function') {
    logToSheet('Tải PDF');
  }

  const printElement = document.getElementById('print-content');
  if (!printElement) return;

  const trackingCode = window.currentTrackingCode || 'VanDon';

  // Nếu có thư viện html2pdf.js thì dùng để tải file trực tiếp
  if (typeof html2pdf !== 'undefined') {
    const opt = {
      margin:       10,
      filename:     `VanDon_${trackingCode}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    
    try {
      await html2pdf().set(opt).from(printElement).save();
    } catch (err) {
      console.error('Lỗi tạo PDF:', err);
      window.print();
    }
  } else {
    // Nếu chưa nhúng thư viện html2pdf, dùng hộp thoại in của hệ thống để lưu PDF
    window.print();
  }
}

// Gắn sự kiện khi DOM nạp xong
document.addEventListener('DOMContentLoaded', () => {
  const btnPrint = document.getElementById('btn-print');
  const btnPdf = document.getElementById('btn-pdf');

  if (btnPrint) {
    btnPrint.addEventListener('click', triggerPrint);
  }

  if (btnPdf) {
    btnPdf.addEventListener('click', downloadPDF);
  }
});
