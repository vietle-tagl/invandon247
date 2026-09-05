// public/js/excel.js
const EXCEL_IMPORT_URL = "https://script.google.com/macros/s/AKfycby4xN41rqyZeGaNZTmX66moFLgDnJjurUWlf4mfGiCedFr7-cpx4X6MRMWKGVcA05HmJA/exec"; // URL Web App của bạn

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

    // Danh sách tên cột có thể gặp (Aliases)
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

    // Làm sạch dữ liệu cũ
    importedRecords = [];

    // Lặp qua từng sheet trong file
    workbook.SheetNames.forEach((sheetName) => {
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      // Tìm dòng bắt đầu dữ liệu (dòng có chữ "STT" hoặc "Số hiệu")
      let dataStartRow = 0;
      for (let i = 0; i < jsonData.length; i++) {
        const row = jsonData[i];
        if (row && row.some(cell => String(cell).toLowerCase().includes('stt') || String(cell).includes('Số hiệu'))) {
          dataStartRow = i;
          break;
        }
      }

      if (dataStartRow === 0) continue; // Bỏ qua sheet không có tiêu đề

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

    // Thông báo đã đọc thành công
    const msgDiv = document.getElementById('importMessage');
    msgDiv.className = 'msg ok';
    msgDiv.style.display = 'block';
    msgDiv.textContent = '✅ Đã đọc thành công ' + importedRecords.length + ' dòng dữ liệu từ file Excel. Hãy bấm "NẠP DỮ LIỆU" để gửi lên!';
  };
  reader.readAsArrayBuffer(file);
}

// Hàm gửi dữ liệu lên Google Apps Script (Gọi khi bấm nút "NẠP DỮ LIỆU")
async function importExcelData() {
  if (importedRecords.length === 0) {
    const msgDiv = document.getElementById('importMessage');
    msgDiv.className = 'msg error';
    msgDiv.style.display = 'block';
    msgDiv.textContent = '⚠️ Vui lòng chọn file Excel trước!';
    return;
  }

  const btnImport = document.getElementById('btnImport');
  btnImport.disabled = true;

  try {
    await fetch(EXCEL_IMPORT_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ records: importedRecords })
    });
    
    const msgDiv = document.getElementById('importMessage');
    msgDiv.className = 'msg ok';
    msgDiv.style.display = 'block';
    msgDiv.textContent = '🎉 Đã nạp thành công ' + importedRecords.length + ' dòng dữ liệu lên Google Sheet!';
    
    // Làm sạch sau khi gửi
    importedRecords = [];
    document.getElementById('excelFileInput').value = '';
  } catch (e) {
    const msgDiv = document.getElementById('importMessage');
    msgDiv.className = 'msg error';
    msgDiv.style.display = 'block';
    msgDiv.textContent = '❌ Lỗi gửi dữ liệu: ' + e.message;
  } finally {
    btnImport.disabled = false;
  }
}
