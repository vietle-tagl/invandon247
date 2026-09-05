// public/js/excel.js
// DÙNG URL WEB APP CŨ (URL đang ghi Logs) - KHÔNG ĐƯỢC ĐỔI
const EXCEL_IMPORT_URL = "https://script.google.com/macros/s/AKfycbzsVn0Af2xMybpijpIDgbyoOXt588s393Udm-D_MgPBPkbLYS0xAtCxvg819VYlU0DRfQ/exec"; 

// Biến lưu dữ liệu tạm thời sau khi đọc file
let importedRecords = [];

// Hàm xử lý khi người dùng chọn file (Chỉ đọc, chưa gửi)
function handleFileUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    const data = new Uint8Array(e.target.result);
    const workbook = XLSX.read(data, { type: 'array' });

    const columnAliases = {
      'Số hiệu bưu gửi': ['Số hiệu bưu gửi', 'Số hiệu BG', 'Số vận đơn', 'Mã vận đơn'],
      'Ngày': ['Ngày chấp nhận', 'Ngày gửi', 'Ngày nhận', 'Ngày'],
      'Tên người nhận': ['Tên người nhận', 'Người nhận', 'Họ tên người nhận'],
      'Địa chỉ': ['Địa chỉ', 'Địa chỉ nhận hàng'],
      'Tỉnh/Thành': ['Tỉnh', 'Tỉnh/Thành phố', 'Tỉnh/Thành'],
      'Khối lượng': ['Khối lượng (gr)', 'Khối lượng', 'Khối lượng tịnh (gr)'],
      'Cước phí': ['Tổng cước bao gồm VAT', 'Tổng cước', 'Tổng cước phí'],
      'Mã khách hàng': ['Mã khách hàng', 'Mã KH', 'Mã CMS', 'Mã khách hàng (CMS)'],
      'Tên khách hàng': ['Tên khách hàng', 'Tên cơ quan', 'Khách hàng', 'Tên đơn vị']
    };

    importedRecords = [];

    workbook.SheetNames.forEach((sheetName) => {
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      let dataStartRow = 0;
      for (let i = 0; i < jsonData.length; i++) {
        const row = jsonData[i];
        if (row && row.some(cell => String(cell).toLowerCase().includes('stt') || String(cell).includes('Số hiệu'))) {
          dataStartRow = i;
          break;
        }
      }

      if (dataStartRow === 0) continue;

      const headers = jsonData[dataStartRow];

      for (let i = dataStartRow + 1; i < jsonData.length; i++) {
        const row = jsonData[i];
        if (!row || !row.some(cell => cell)) continue;

        const record = {};
        headers.forEach((header, colIndex) => {
          const value = row[colIndex];
          if (!header) return;
          const normalizedHeader = String(header).trim().toLowerCase();
          
          Object.keys(columnAliases).forEach((standardCol) => {
            const aliases = columnAliases[standardCol].map(a => a.toLowerCase());
            if (aliases.includes(normalizedHeader)) {
              record[standardCol] = value || '';
            }
          });
        });

        if (record['Số hiệu bưu gửi']) {
          importedRecords.push(record);
        }
      }
    });

    const msgDiv = document.getElementById('importMessage');
    if (msgDiv) {
      msgDiv.className = 'msg ok';
      msgDiv.style.display = 'block';
      msgDiv.textContent = '✅ Đã đọc thành công ' + importedRecords.length + ' dòng dữ liệu. Hãy bấm "NẠP DỮ LIỆU"!';
    }
  };
  reader.readAsArrayBuffer(file);
}

// Hàm gửi dữ liệu lên Google Apps Script (Gọi khi bấm nút "NẠP DỮ LIỆU")
async function importExcelData() {
  if (importedRecords.length === 0) {
    const msgDiv = document.getElementById('importMessage');
    if (msgDiv) {
      msgDiv.className = 'msg error';
      msgDiv.style.display = 'block';
      msgDiv.textContent = '⚠️ Chưa có dữ liệu. Vui lòng chọn file Excel trước!';
    }
    return;
  }

  const btnImport = document.getElementById('btnImport');
  btnImport.disabled = true;

  try {
    // ĐỔI SANG MODE 'CORS' ĐỂ CÓ THỂ ĐỌC PHẢN HỒI
    const response = await fetch(EXCEL_IMPORT_URL, {
      method: 'POST',
      mode: 'cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ records: importedRecords })
    });

    // Đọc phản hồi từ Google Apps Script
    const result = await response.json().catch(() => ({})); 

    const msgDiv = document.getElementById('importMessage');
    if (msgDiv) {
      if (result.success) {
        msgDiv.className = 'msg ok';
        msgDiv.style.display = 'block';
        msgDiv.textContent = '🎉 Đã nạp thành công ' + importedRecords.length + ' dòng dữ liệu lên Google Sheet!';
        importedRecords = [];
        document.getElementById('excelFileInput').value = '';
      } else {
        msgDiv.className = 'msg error';
        msgDiv.style.display = 'block';
        msgDiv.textContent = '❌ Google Apps Script báo lỗi: ' + (result.error || 'Không xác định');
      }
    }
  } catch (e) {
    // Nếu lỗi CORS hoặc lỗi mạng, báo lỗi cụ thể
    const msgDiv = document.getElementById('importMessage');
    if (msgDiv) {
      msgDiv.className = 'msg error';
      msgDiv.style.display = 'block';
      msgDiv.textContent = '❌ Lỗi kết nối: ' + e.message + '. Kiểm tra lại URL Web App!';
    }
  } finally {
    btnImport.disabled = false;
  }
}
