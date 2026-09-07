// public/js/excel.js
// URL Web App Google Apps Script
const EXCEL_IMPORT_URL = "https://script.google.com/macros/s/AKfycbzsVn0Af2xMybpijpIDgbyoOXt588s393Udm-D_MgPBPkbLYS0xAtCxvg819VYlU0DRfQ/exec"; 

// Biến lưu dữ liệu tạm thời sau khi đọc file Excel
let importedRecords = [];

// 1. HÀM ĐỌC FILE EXCEL TỪ MÁY TÍNH
function handleFileUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    const data = new Uint8Array(e.target.result);
    const workbook = XLSX.read(data, { type: 'array' });

    // Danh sách từ khóa nhận diện các cột phổ biến
    const columnAliases = {
      'Số hiệu bưu gửi': ['số hiệu bưu gửi', 'số hiệu bg', 'số vận đơn', 'mã vận đơn', 'mã bưu gửi', 'mã đơn', 'so hieu bg'],
      'Ngày': ['ngày chấp nhận', 'ngày gửi', 'ngày nhận', 'ngày', 'ngay'],
      'Tên người nhận': ['tên người nhận', 'người nhận', 'họ tên người nhận', 'nguoi nhan'],
      'Địa chỉ': ['địa chỉ', 'địa chỉ nhận hàng', 'dia chi'],
      'Tỉnh/Thành': ['tỉnh', 'tỉnh/thành phố', 'tỉnh/thành', 'tinh/thanh'],
      'Khối lượng': ['khối lượng (gr)', 'khối lượng', 'khối lượng tịnh (gr)', 'khoi luong'],
      'Cước phí': ['tổng cước bao gồm vat', 'tổng cước', 'tổng cước phí', 'cước phí', 'cuoc phi'],
      'Mã khách hàng': ['mã khách hàng', 'mã kh', 'mã cms', 'mã khách hàng (cms)'],
      'Tên khách hàng': ['tên khách hàng', 'tên cơ quan', 'khách hàng', 'tên đơn vị', 'ten kh']
    };

    importedRecords = [];

    workbook.SheetNames.forEach((sheetName) => {
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      if (!jsonData || jsonData.length === 0) return;

      // Tìm dòng chứa tiêu đề
      let dataStartRow = -1;
      for (let i = 0; i < jsonData.length; i++) {
        const row = jsonData[i];
        if (row && row.some(cell => {
          const str = String(cell).toLowerCase();
          return str.includes('stt') || str.includes('số hiệu') || str.includes('mã') || str.includes('vận đơn');
        })) {
          dataStartRow = i;
          break;
        }
      }

      // Nếu không tìm thấy từ khóa đặc biệt, mặc định lấy dòng 0 làm tiêu đề
      if (dataStartRow === -1) dataStartRow = 0;

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
            const aliases = columnAliases[standardCol];
            if (aliases.includes(normalizedHeader)) {
              record[standardCol] = value || '';
            }
          });
        });

        // Chỉ lưu nếu dòng có dữ liệu
        if (record['Số hiệu bưu gửi'] || Object.keys(record).length > 0) {
          importedRecords.push(record);
        }
      }
    });

    const msgDiv = document.getElementById('importMessage');
    if (msgDiv) {
      if (importedRecords.length > 0) {
        msgDiv.className = 'msg ok';
        msgDiv.style.display = 'block';
        msgDiv.textContent = '✅ Đã đọc thành công ' + importedRecords.length + ' dòng dữ liệu. Hãy bấm "NẠP DỮ LIỆU"!';
      } else {
        msgDiv.className = 'msg error';
        msgDiv.style.display = 'block';
        msgDiv.textContent = '⚠️ Không đọc được dữ liệu phù hợp trong file Excel. Vui lòng kiểm tra lại cấu trúc file!';
      }
    }
  };
  reader.readAsArrayBuffer(file);
}

// 2. HÀM GỬI DỮ LIỆU LÊN GOOGLE APPS SCRIPT
async function importExcelData() {
  if (importedRecords.length === 0) {
    const msgDiv = document.getElementById('importMessage');
    if (msgDiv) {
      msgDiv.className = 'msg error';
      msgDiv.style.display = 'block';
      msgDiv.textContent = '⚠️ Chưa có dữ liệu hoặc chưa chọn file Excel!';
    }
    return;
  }

  const btnImport = document.getElementById('btnImport');
  if (btnImport) btnImport.disabled = true;

  const msgDiv = document.getElementById('importMessage');
  if (msgDiv) {
    msgDiv.className = 'msg wait';
    msgDiv.style.display = 'block';
    msgDiv.textContent = '⏳ Đang nạp ' + importedRecords.length + ' dòng dữ liệu lên Google Sheet...';
  }

  try {
    // Dùng Content-Type text/plain và redirect follow để tránh bị trình duyệt chặn CORS
    const response = await fetch(EXCEL_IMPORT_URL, {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ records: importedRecords })
    });

    const text = await response.text();
    let result = {};
    try {
      result = JSON.parse(text);
    } catch (err) {
      result = { success: true }; 
    }

    if (msgDiv) {
      if (result.success || response.ok) {
        msgDiv.className = 'msg ok';
        msgDiv.style.display = 'block';
        msgDiv.textContent = '🎉 Đã nạp thành công ' + importedRecords.length + ' dòng dữ liệu vào Google Sheet!';
        importedRecords = [];
        const fileInput = document.getElementById('excelFileInput');
        if (fileInput) fileInput.value = '';
      } else {
        msgDiv.className = 'msg error';
        msgDiv.style.display = 'block';
        msgDiv.textContent = '❌ Google Apps Script báo lỗi: ' + (result.error || 'Kiểm tra quyền truy cập trên Apps Script');
      }
    }
  } catch (e) {
    if (msgDiv) {
      msgDiv.className = 'msg error';
      msgDiv.style.display = 'block';
      msgDiv.textContent = '❌ Lỗi kết nối: ' + e.message + '. Hãy kiểm tra lại URL hoặc cấu hình Web App!';
    }
  } finally {
    if (btnImport) btnImport.disabled = false;
  }
}
