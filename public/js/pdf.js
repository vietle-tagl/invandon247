// =============================================
// PDF.JS - Xử lý tạo Barcode, QR Code và In/Tải PDF
// =============================================

/* Tạo Barcode bằng JsBarcode */
function generateBarcodeBase64(text) {
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

  const qrLink = `https://invandon247.com/?code=${info.ID || currentTrackingCode || '-'}`;
  
  // Tạo QR dạng ảnh
  const qrEl = document.createElement('div');
  new QRCode(qrEl, {
    text: qrLink,
    width: 55,
    height: 55,
    colorDark: "#000000",
    colorLight: "#ffffff",
    correctLevel: QRCode.CorrectLevel.H
  });
  const qrCanvas = qrEl.querySelector('canvas');
  const qrImg = qrEl.querySelector('img');
  const qrSrc = qrCanvas ? qrCanvas.toDataURL('image/png') : qrImg.src;

  const barcodeBase64 = generateBarcodeBase64(info.ID || currentTrackingCode || '-');

  const adBanner = `
    <div class="p-ad-box">
      <div class="ad-text">🔥 TUYỂN DỤNG NV GIAO HÀNG / NHÂN VIÊN BƯU CỤC - THU NHẬP 10 - 20 TRIỆU. GỌI 19006885</div>
    </div>
  `;

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
          <div class="p-title-code">Mã vận đơn: ${esc(info.ID || currentTrackingCode || '-')} (Đơn vị VNPOST - Bưu điện Việt Nam)</div>
        </div>
        <img class="p-qr-code" src="${qrSrc}" alt="QR Code">
      </div>

      ${pageIndex === 0 ? `
      <div class="p-section-box">
        <div class="p-section-head">CHI TIẾT BƯU GỬI</div>
        <div class="p-grid-info">
          <div class="p-barcode-item">
            <img class="p-barcode-img" src="${barcodeBase64}" alt="Barcode">
          </div>
          
          <div class="p-info-item">
            <div class="p-info-top">Mã vận đơn: <b>${esc(info.ID)}</b></div>
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

      ${adBanner}

      <div class="p-footer">
        © 2026 InVanDon247. Bảo lưu mọi quyền. Dữ liệu được truy xuất trực tiếp từ hệ thống VNPost qua cổng kết nối InVanDon247 — Trang ${pageIndex + 1}/${totalPages}
      </div>
    </div>`;
}

function createPrintMeasureRoot(){
  const root = document.createElement('div');
  root.id = 'print-measure-root';
  root.style.cssText =
    'position:absolute;left:-100000px;top:0;width:194mm;visibility:hidden;pointer-events:none;z-index:-1;';
  document.body.appendChild(root);
  return root;
}

function measurePrintCardHeights(data){
  const locate = Array.isArray(data?.locate) ? data.locate : [];
  const root = createPrintMeasureRoot();

  const section = document.createElement('div');
  section.className = 'p-section-box';
  section.innerHTML = `
    <div class="p-section-head">LỊCH SỬ HÀNH TRÌNH</div>
    <div style="padding:4px;">
      <table class="p-timeline-table">
        <tr><td id="measure-left"></td><td id="measure-right"></td></tr>
      </table>
    </div>`;
  root.appendChild(section);

  const td = section.querySelector('#measure-left');
  const heights = [];

  for(const item of locate){
    const holder = document.createElement('div');
    holder.innerHTML = buildPrintEventCard(item);
    const card = holder.firstElementChild;
    td.appendChild(card);

    const cs = getComputedStyle(card);
    const marginBottom = parseFloat(cs.marginBottom) || 0;
    heights.push(card.getBoundingClientRect().height + marginBottom);

    td.removeChild(card);
  }

  root.remove();
  return heights;
}

function measurePageBaseHeight(data, pageIndex, totalPages, includeDelivery){
  const root = createPrintMeasureRoot();
  root.innerHTML = buildPrintPageHTML(data, [], pageIndex, totalPages, 0, includeDelivery);

  const page = root.firstElementChild;
  const pageRect = page.getBoundingClientRect();
  const footer = page.querySelector('.p-footer');

  let contentBottom = footer
    ? footer.getBoundingClientRect().bottom - pageRect.top
    : 0;

  contentBottom += 1;

  const pageHeight = pageRect.height;
  root.remove();

  return {
    pageHeight,
    available: Math.max(0, pageHeight - contentBottom)
  };
}

function findSplitForChunk(heights, start, count, capacity){
  if(count <= 0) return 0;

  const prefix = [0];
  for(let i=0;i<count;i++){
    prefix.push(prefix[prefix.length - 1] + (heights[start + i] || 0));
  }

  if(count === 1){
    return prefix[1] <= capacity ? 1 : 0;
  }

  let best = -1;
  let bestBalance = Infinity;

  for(let k=1;k<count;k++){
    const left = prefix[k];
    const right = prefix[count] - prefix[k];

    if(left <= capacity && right <= capacity){
      const balance = Math.abs(left - right);
      if(balance < bestBalance){
        bestBalance = balance;
        best = k;
      }
    }
  }

  return best;
}

function renderPrint(data){
  const locate = Array.isArray(data?.locate) ? data.locate : [];
  const printArea = document.getElementById('print-area');

  if(!printArea) return;

  const heights = measurePrintCardHeights(data);
  const totalEvents = locate.length;
  const pages = [];
  let start = 0;
  let pageIndex = 0;

  const MEASURE_TOTAL = 999;

  while(start < totalEvents || pageIndex === 0){
    const remaining = totalEvents - start;

    if(remaining > 0){
      const lastBase = measurePageBaseHeight(data, pageIndex, MEASURE_TOTAL, true);
      const splitAll = findSplitForChunk(heights, start, remaining, lastBase.available);

      if(splitAll > 0){
        pages.push({
          start,
          count: remaining,
          split: splitAll,
          includeDelivery: true
        });
        start = totalEvents;
        break;
      }
    }else{
      pages.push({
        start: totalEvents,
        count: 0,
        split: 0,
        includeDelivery: true
      });
      break;
    }

    const base = measurePageBaseHeight(data, pageIndex, MEASURE_TOTAL, false);
    let maxCount = 0;

    const limit = remaining > 1 ? remaining - 1 : remaining;

    for(let count=1; count<=limit; count++){
      const split = findSplitForChunk(heights, start, count, base.available);
      if(split <= 0) break;
      maxCount = count;
    }

    if(maxCount === 0 && remaining > 0){
      maxCount = 1;
    }

    const split = findSplitForChunk(heights, start, maxCount, base.available);

    pages.push({
      start,
      count: maxCount,
      split: split > 0 ? split : 1,
      includeDelivery: false
    });

    start += maxCount;
    pageIndex++;

    if(pageIndex > totalEvents + 5) break;
  }

  const totalPages = pages.length || 1;

  printArea.innerHTML = pages.map((p, i) => {
    const chunk = locate.slice(p.start, p.start + p.count);

    return buildPrintPageHTML(
      data,
      chunk,
      i,
      totalPages,
      p.split,
      p.includeDelivery
    );
  }).join('');
}

function safeTrackingFilename(){
  const raw = String(currentTrackingCode || currentData?.info?.ID || '247').trim();
  return raw.replace(/[^a-zA-Z0-9_-]/g, '_');
}

async function printA4(){
  if(!currentData){
    alert('Vui lòng tra cứu vận đơn trước.');
    return;
  }

  try{
    if(document.fonts?.ready) await document.fonts.ready;
  }catch(_){}

  renderPrint(currentData);

  logToSheet('In A4');

  const oldTitle = document.title;
  const printFilename = `InVanDon247_VNPost_${safeTrackingFilename()}`;
  document.title = printFilename;

  const restoreTitle = () => {
    document.title = oldTitle;
    window.removeEventListener('afterprint', restoreTitle);
  };
  window.addEventListener('afterprint', restoreTitle);

  setTimeout(() => window.print(), 300);
}

async function downloadPDF(){
  if(!currentData){
    alert('Vui lòng tra cứu vận đơn trước.');
    return;
  }

  const pdfBtn = document.querySelector('.pdf-btn');
  const originalText = pdfBtn.innerHTML;

  try{
    pdfBtn.disabled = true;
    pdfBtn.innerHTML = '⏳ Đang tạo PDF...';

    renderPrint(currentData);
    
    const printArea = document.getElementById('print-area');
    const pages = printArea.querySelectorAll('.print-page');
    
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    const pageWidth = 210;
    let pageIndex = 0;

    for (const page of pages) {
      const tempContainer = document.createElement('div');
      tempContainer.style.position = 'absolute';
      tempContainer.style.left = '-100000px';
      tempContainer.style.top = '0';
      tempContainer.style.width = '210mm';
      tempContainer.style.boxSizing = 'border-box';
      tempContainer.style.background = '#ffffff';
      tempContainer.style.padding = '8mm';
      
      const pageClone = page.cloneNode(true);
      pageClone.style.width = '194mm';
      pageClone.style.height = 'auto';
      pageClone.style.overflow = 'visible';
      pageClone.style.margin = '0';
      pageClone.style.pageBreakAfter = 'auto';
      pageClone.style.breakAfter = 'auto';

      const imgs = pageClone.querySelectorAll('img');
      for (const img of imgs) {
        if (img.src.startsWith('blob:') || img.src.startsWith('http')) {
          try {
            const imgCanvas = document.createElement('canvas');
            imgCanvas.width = img.naturalWidth;
            imgCanvas.height = img.naturalHeight;
            const ctx = imgCanvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            img.src = imgCanvas.toDataURL('image/png');
          } catch (e) {}
        }
      }

      tempContainer.appendChild(pageClone);
      document.body.appendChild(tempContainer);

      await document.fonts.ready;
      await new Promise(r => setTimeout(r, 100));

      const canvas = await html2canvas(tempContainer, {
        scale: 1.5,
        useCORS: true,
        allowTaint: false,
        logging: false,
        backgroundColor: '#ffffff',
        width: tempContainer.scrollWidth,
        height: tempContainer.scrollHeight
      });

      document.body.removeChild(tempContainer);

      const imgData = canvas.toDataURL('image/png');
      
      if (pageIndex > 0) {
        pdf.addPage();
      }
      
      const imgWidth = pageWidth - 16;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 8, 8, imgWidth, imgHeight);
      
      pageIndex++;
    }

    pdf.save(`InVanDon247_VNPost_${safeTrackingFilename()}.pdf`);

    logToSheet('Tải PDF');

  }catch(error){
    console.error('PDF Error:', error);
    alert('Lỗi tải PDF: ' + error.message);
  }finally{
    pdfBtn.disabled = false;
    pdfBtn.innerHTML = originalText;
  }
}
