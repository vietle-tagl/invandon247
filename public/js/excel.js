// public/js/excel.js
const EXCEL_IMPORT_URL = "https://script.google.com/macros/s/AKfycbzsVn0Af2xMybpijpIDgbyoOXt588s393Udm-D_MgPBPkbLYS0xAtCxvg819VYlU0DRfQ/exec"; 

let importedRecords = [];

// 1. HÀM TỰ ĐỘNG BỐC TÁCH VÀ CHUẨN HÓA DỮ LIỆU EXCEL
function handleFileUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array', cellDates: true });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];

      // Đọc toàn bộ bảng dưới dạng mảng 2 chiều
      const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });
      if (!rows || rows.length === 0) {
        alert("File Excel không có dữ liệu!");
        return;
      }

      // A. TRÍCH XUẤT THÔNG TIN CHUNG (Mã KH & Tên KH từ header nếu có)
      let globalMaKH = "";
      let globalTenKH = "";

      for (let i = 0; i < Math.min(10, rows.length); i++) {
        const rowText = rows[i].join(" ");
        if (rowText.includes("Tên Khách hàng:") || rowText.includes("Tên khách hàng:")) {
          globalTenKH = String(rows[i][3] || rows[i][2] || "").trim();
        }
        if (rowText.includes("Mã khách hàng")) {
          globalMaKH = String(rows[i][3] || rows[i][2] || "").trim();
        }
      }

      // B. TÌM DÒNG TIÊU ĐỀ BẢNG (Header Index)
      let headerIdx = -1;
      for (let i = 0; i < Math.min(15, rows.length); i++) {
        const rowStr = rows[i].join(" ").toLowerCase();
        if (rowStr.includes("số hiệu") || rowStr.includes("mã bưu gửi") || (rowStr.includes("stt") && rowStr.includes("ngày"))) {
          headerIdx = i;
          break;
        }
      }

      if (headerIdx === -1) {
        alert("⚠️ Không tìm thấy dòng tiêu đề chứa 'Số hiệu bưu gửi' hoặc 'Mã bưu gửi' trong file Excel!");
        return;
      }

      // C. XÁC ĐỊNH VỊ TRÍ CÁC CỘT DỰA TRÊN TIÊU ĐỀ
      const headers = rows[headerIdx].map(h => String(h).trim().toLowerCase());
      const colMap = {};

      headers.forEach((h, idx) => {
        if (h.includes("mã khách hàng") || h === "mã kh") colMap.ma_kh = idx;
        else if (h.includes("tên khách hàng") || h === "tên kh") colMap.ten_kh = idx;
        else if (h.includes("ngày")) colMap.ngay = idx;
        else if (h.includes("số hiệu") || h.includes("mã bưu gửi") || h.includes("số vận đơn")) colMap.so_hieu = idx;
        else if (h.includes("người nhận")) colMap.ten_nn = idx;
        else if (h.includes("địa chỉ")) colMap.dia_chi = idx;
        else if (h === "tỉnh" || h.includes("tỉnh/thành")) colMap.tinh = idx;
        else if (h === "huyện") colMap.huyen = idx;
        else if (h === "xã") colMap.xa = idx;
        else if (h.includes("khối lượng")) colMap.khoi_luong = idx;
        else if (h.includes("tổng cước bao gồm vat") || h.includes("tổng cước") || h.includes("cước phí")) colMap.cuoc_phi = idx;
      });

      importedRecords = [];

      // D. QUÉT TỪNG DÒNG DỮ LIỆU BÊN DƯỚI DÒNG TIÊU ĐỀ
      for (let i = headerIdx + 1; i < rows.length; i++) {
        const row = rows[i];
        const rowStr = row.join(" ").toLowerCase();

        // Bỏ qua dòng rỗng hoặc dòng tổng cộng/chú thích
        if (!row.some(c => String(c).trim() !== "") || rowStr.includes("tổng") || rowStr.includes("cộng") || rowStr.includes("stt")) {
          continue;
        }

        const soHieu = colMap.so_hieu !== undefined ? String(row[colMap.so_hieu] || "").trim() : "";
        
        // Điều kiện: Phải có mã bưu gửi / số vận đơn hợp lệ
        if (soHieu && soHieu.length >= 8 && soHieu !== "undefined") {
          
          // Xử lý Địa chỉ (Nối Xã + Huyện + Tỉnh nếu địa chỉ bị tách làm 3 cột)
          let diaChi = colMap.dia_chi !== undefined ? String(row[colMap.dia_chi] || "").trim() : "";
          const tinh = colMap.tinh !== undefined ? String(row[colMap.tinh] || "").trim() : "";
          const huyen = colMap.huyen !== undefined ? String(row[colMap.huyen] || "").trim() : "";
          const xa = colMap.xa !== undefined ? String(row[colMap.xa] || "").trim() : "";

          if (!diaChi) {
            diaChi = [xa, huyen, tinh].filter(Boolean).join(", ");
          }

          // Xử lý Ngày gửi
          let ngayVal = colMap.ngay !== undefined ? row[colMap.ngay] : "";
          if (ngayVal instanceof Date) {
            ngayVal = ngayVal.toLocaleDateString("vi-VN");
          }

          importedRecords.push({
            'Mã khách hàng': (colMap.ma_kh !== undefined && row[colMap.ma_kh]) ? String(row[colMap.ma_kh]).trim() : globalMaKH,
            'Tên khách hàng': (colMap.ten_kh !== undefined && row[colMap.ten_kh]) ? String(row[colMap.ten_kh]).trim() : globalTenKH,
            'Ngày': ngayVal ? String(ngayVal).trim() : "",
            'Số hiệu bưu gửi': soHieu,
            'Tên người nhận': colMap.ten_nn !== undefined ? String(row[colMap.ten_nn] || "").trim() : "",
            'Địa chỉ': diaChi,
            'Tỉnh/Thành': tinh,
            'Khối lượng': colMap.khoi_luong !== undefined ? String(row[colMap.khoi_luong] || "").trim() : "",
            'Cước phí': colMap.cuoc_phi !== undefined ? String(row[colMap.cuoc_phi] || "").trim() : ""
          });
        }
      }

      const msgDiv = document.getElementById('importMessage');
      if (msgDiv) {
        if (importedRecords.length > 0) {
          msgDiv.className = 'msg ok';
          msgDiv.style.display = 'block';
          msgDiv.textContent = '✅ Đã trích xuất thành công ' + importedRecords.length + ' bưu gửi từ Excel. Bấm "NẠP DỮ LIỆU" để đẩy lên Google Sheet!';
        } else {
          msgDiv.className = 'msg error';
          msgDiv.style.display = 'block';
          msgDiv.textContent = '⚠️ Không đọc được dữ liệu bưu gửi hợp lệ nào từ file Excel!';
        }
      }

    } catch (err) {
      alert("Lỗi khi đọc file Excel: " + err.message);
    }
  };
  reader.readAsArrayBuffer(file);
}

// 2. HÀM ĐẨY DỮ LIỆU LÊN GOOGLE APPS SCRIPT
async function importExcelData() {
  const msgDiv = document.getElementById('importMessage');
  const btnImport = document.getElementById('btnImport');

  if (!importedRecords || importedRecords.length === 0) {
    if (msgDiv) {
      msgDiv.className = 'msg error';
      msgDiv.style.display = 'block';
      msgDiv.textContent = '⚠️ Chưa chọn file Excel hoặc chưa trích xuất được dữ liệu!';
    }
    return;
  }

  if (btnImport) btnImport.disabled = true;
  if (msgDiv) {
    msgDiv.className = 'msg wait';
    msgDiv.style.display = 'block';
    msgDiv.textContent = '⏳ Đang đẩy ' + importedRecords.length + ' bưu gửi lên Google Sheet...';
  }

  try {
    const response = await fetch(EXCEL_IMPORT_URL, {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ records: importedRecords })
    });

    const text = await response.text();
    let result = {};
    try { result = JSON.parse(text); } catch(e) { result = { success: true }; }

    if (result.success || response.ok) {
      if (msgDiv) {
        msgDiv.className = 'msg ok';
        msgDiv.style.display = 'block';
        msgDiv.textContent = '🎉 Đã nạp thành công ' + importedRecords.length + ' dòng vào tab BangKeVanDon!';
      }
      importedRecords = [];
      const fileInput = document.getElementById('excelFileInput');
      if (fileInput) fileInput.value = '';
    } else {
      throw new Error(result.error || "Không thể ghi dữ liệu");
    }
  } catch (e) {
    if (msgDiv) {
      msgDiv.className = 'msg error';
      msgDiv.style.display = 'block';
      msgDiv.textContent = '❌ Lỗi kết nối: ' + e.message;
    }
  } finally {
    if (btnImport) btnImport.disabled = false;
  }
}
