// public/js/excel.js
const EXCEL_IMPORT_URL = "https://script.google.com/macros/s/AKfycby4xN41rqyZeGaNZTmX66moFLgDnJjurUWlf4mfGiCedFr7-cpx4X6MRMWKGVcA05HmJA/exec"; // URL Web App của bạn

// Hàm xử lý khi người dùng chọn file
function handleFileUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    const data = new Uint8Array(e.target.result);
    const workbook = XLSX.read(data, { type: 'array' });

    // 1. Danh sách tên cột có thể gặp (Aliases)
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

    // 2. Lặp qua từng sheet trong file
    workbook.SheetNames.forEach((sheetName) => {
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      // 3. Tìm dòng bắt đầu dữ liệu (dòng có chữ "STT" hoặc "Số hiệu")
      let dataStartRow = 0;
      for (let i = 0; i < jsonData.length; i++) {
        const row = jsonData[i];
        if (row && row.some(cell => String(cell).toLowerCase().includes('stt') || String(cell).includes('Số hiệu'))) {
          dataStartRow = i;
          break;
        }
      }

      if (dataStartRow === 0) continue; // Bỏ qua sheet không có tiêu đề

      // 4. Lấy tiêu đề
      const headers = jsonData[dataStartRow];

      // 5. Duyệt qua dữ liệu và chuẩn hóa
      const recordsToSend = [];
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
          recordsToSend.push(record);
        }
      }

      // 6. Gửi dữ liệu lên Google Sheets
      if (recordsToSend.length > 0) {
        sendToGoogleSheet(recordsToSend);
      }
    });
  };
  reader.readAsArrayBuffer(file);
}

// Hàm gửi dữ liệu lên Google Apps Script
async function sendToGoogleSheet(records) {
  try {
    await fetch(EXCEL_IMPORT_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ records: records })
    });
    alert('✅ Đã gửi ' + records.length + ' dòng dữ liệu lên Google Sheet!');
  } catch (e) {
    alert('❌ Lỗi gửi dữ liệu: ' + e.message);
  }
}
