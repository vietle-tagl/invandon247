// =========================================================
// PDF.JS - Xử lý in ấn và tải PDF
// =========================================================

// SỬA LỖI 2: KHÔNG khai báo lại biến currentTrackingCode ở đây nữa
// Chỉ sử dụng window.currentTrackingCode đã được khai báo bên api.js

// Hàm In A4 (Dùng lệnh in của trình duyệt)
function printPage() {
    if (!window.currentTrackingCode) {
        alert('Vui lòng tra cứu vận đơn trước khi in!');
        return;
    }
    window.print();
}

// Hàm Tải PDF (Sử dụng html2canvas + jsPDF)
async function downloadPDF() {
    if (!window.currentTrackingCode) {
        alert('Vui lòng tra cứu vận đơn trước khi tải PDF!');
        return;
    }

    const element = document.getElementById('print-area');
    if (!element || element.innerHTML.trim() === '') {
        alert('Không có dữ liệu để tạo PDF!');
        return;
    }

    // Hiển thị thông báo đang xử lý
    const btn = document.querySelector('.pdf-btn');
    const originalText = btn ? btn.innerHTML : '';
    if (btn) {
        btn.innerHTML = '⏳ Đang tạo PDF...';
        btn.disabled = true;
    }

    try {
        // Cấu hình xuất PDF
        const opt = {
            margin:       0, // Đã có @page margin trong CSS
            filename:     `VanDon_${window.currentTrackingCode}.pdf`,
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { 
                scale: 2, 
                useCORS: true, // Cho phép tải ảnh từ domain khác (Google Maps, Logo)
                logging: false 
            },
            jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' },
            pagebreak:    { mode: ['avoid-all', 'css', 'legacy'] }
        };

        // Thực hiện tạo PDF
        await html2pdf().set(opt).from(element).save();

    } catch (error) {
        console.error('Lỗi tạo PDF:', error);
        alert('Có lỗi xảy ra khi tạo PDF. Vui lòng thử lại!');
    } finally {
        // Khôi phục nút bấm
        if (btn) {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    }
}
