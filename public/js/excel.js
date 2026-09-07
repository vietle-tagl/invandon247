// public/js/excel.js
const EXCEL_IMPORT_URL = "https://script.google.com/macros/s/AKfycbzsVn0Af2xMybpijpIDgbyoOXt588s393Udm-D_MgPBPkbLYS0xAtCxvg819VYlU0DRfQ/exec"; 

let importedMatrix = []; // Lưu dữ liệu dạng mảng 2 chiều

// 1. ĐỌC FILE EXCEL
function handleFileUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];

      // Đọc toàn bộ ô dưới dạng mảng 2 chiều raw
      const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });

      if (!rawData || rawData.length === 0) {
        alert("File Excel rỗng!");
        return;
      }

      // Tìm dòng tiêu đề (dòng chứa từ khóa 'Mã' hoặc 'Số hiệu' hoặc 'STT')
      let headerRowIndex = 0;
      for (let i = 0; i < rawData.length; i++) {
        const rowStr = rawData[i].join(" ").toLowerCase();
        if (rowStr.includes("stt") || rowStr.includes("mã") || rowStr.includes("số hiệu") || rowStr.includes("vận đơn")) {
          headerRowIndex = i;
          break;
        }
      }

      // Lấy toàn bộ các dòng dữ liệu nằm phía sau dòng tiêu đề
      importedMatrix = rawData.slice(headerRowIndex + 1).filter(row => {
        return row && row.some(cell => String(cell).trim() !== "");
      });

      const msgDiv = document.getElementById('importMessage');
      if (msgDiv) {
        if (importedMatrix.length > 0) {
          msgDiv.className = 'msg ok';
          msgDiv.style.display = 'block';
          msgDiv.textContent = '✅ Đã đọc thành công ' + importedMatrix.length + ' dòng dữ liệu. Hãy bấm "NẠP DỮ LIỆU"!';
        } else {
          msgDiv.className = 'msg error';
          msgDiv.style.display = 'block';
          msgDiv.textContent = '⚠️ Không tìm thấy dòng dữ liệu nào trong file Excel!';
        }
      }
    } catch (err) {
      alert("Lỗi đọc file Excel: " + err.message);
    }
  };
  reader.readAsArrayBuffer(file);
}

// 2. GỬI DỮ LIỆU SANG GOOGLE APPS SCRIPT
async function importExcelData() {
  const msgDiv = document.getElementById('importMessage');
  const btnImport = document.getElementById('btnImport');

  if (!importedMatrix || importedMatrix.length === 0) {
    if (msgDiv) {
      msgDiv.className = 'msg error';
      msgDiv.style.display = 'block';
      msgDiv.textContent = '⚠️ Chưa chọn file Excel hoặc file không có dữ liệu!';
    }
    return;
  }

  if (btnImport) btnImport.disabled = true;
  if (msgDiv) {
    msgDiv.className = 'msg wait';
    msgDiv.style.display = 'block';
    msgDiv.textContent = '⏳ Đang nạp ' + importedMatrix.length + ' dòng dữ liệu lên Google Sheet...';
  }

  try {
    // Đóng gói mảng 2 chiều gửi đi
    const payload = JSON.stringify({ matrix: importedMatrix });

    const response = await fetch(EXCEL_IMPORT_URL, {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: payload
    });

    const text = await response.text();
    let result = {};
    try { result = JSON.parse(text); } catch(e) { result = { success: true }; }

    if (result.success || response.ok) {
      if (msgDiv) {
        msgDiv.className = 'msg ok';
        msgDiv.style.display = 'block';
        msgDiv.textContent = '🎉 Đã nạp thành công ' + importedMatrix.length + ' dòng dữ liệu vào BangKeVanDon!';
      }
      importedMatrix = [];
      const fileInput = document.getElementById('excelFileInput');
      if (fileInput) fileInput.value = '';
    } else {
      throw new Error(result.error || "Lỗi không xác định từ Server");
    }
  } catch (e) {
    if (msgDiv) {
      msgDiv.className = 'msg error';
      msgDiv.style.display = 'block';
      msgDiv.textContent = '❌ Lỗi: ' + e.message;
    }
  } finally {
    if (btnImport) btnImport.disabled = false;
  }
}
