// =========================================================
// API.JS - Xử lý logic tra cứu và render dữ liệu
// =========================================================

// SỬA LỖI 1: Dùng window. để tránh trùng lặp biến toàn cục với file pdf.js
window.currentTrackingCode = "";

// Khởi tạo các phần tử DOM
const searchBtn = document.getElementById('search-btn');
const trackingInput = document.getElementById('tracking-code');
const captchaInput = document.getElementById('captcha-input');
const captchaImg = document.getElementById('captcha-img');
const reloadCaptchaBtn = document.getElementById('reload-captcha');
const msgBox = document.getElementById('msg');
const resultContainer = document.getElementById('result-container');
const actionButtons = document.getElementById('action-buttons');

// Hàm hiển thị thông báo
function showMessage(text, type = 'error') {
    if (!msgBox) return;
    msgBox.textContent = text;
    msgBox.className = `msg ${type}`;
    setTimeout(() => { msgBox.className = 'msg'; }, 5000);
}

// Tải Captcha (Giả lập - bạn cần thay bằng API thật của bạn)
function loadCaptcha() {
    if (!captchaImg) return;
    // Thay URL này bằng API captcha thật của bạn
    captchaImg.src = `https://via.placeholder.com/100x40?text=CAPTCHA`; 
    captchaImg.classList.add('loaded');
}

// SỰ KIỆN: Tải lại Captcha
if (reloadCaptchaBtn) {
    reloadCaptchaBtn.addEventListener('click', loadCaptcha);
}

// SỰ KIỆN: Nút Tra Cứu
if (searchBtn) {
    searchBtn.addEventListener('click', async function() {
        const code = trackingInput.value.trim();
        const captcha = captchaInput.value.trim();

        if (!code) {
            showMessage('Vui lòng nhập mã vận đơn!', 'error');
            return;
        }

        showMessage('Đang tra cứu...', 'wait');
        searchBtn.disabled = true;

        try {
            // GỌI API THẬT CỦA BẠN Ở ĐÂY
            // const response = await fetch('/api/track', { ... });
            // const data = await response.json();

            // GIẢ LẬP DỮ LIỆU ĐỂ TEST GIAO DIỆN
            setTimeout(() => {
                const mockData = {
                    trackingCode: code,
                    status: 'Đã phát thành công',
                    receiver: 'Nguyễn Văn A',
                    address: '123 Đường ABC, Quận 1, TP.HCM',
                    events: [
                        { time: '04/08/2026 08:32:25', status: 'Phát thành công', location: 'Bưu cục ABC' },
                        { time: '03/08/2026 15:20:00', status: 'Đang vận chuyển', location: 'Bưu cục XYZ' }
                    ]
                };
                
                renderResult(mockData);
                showMessage('Tra cứu thành công!', 'ok');
                searchBtn.disabled = false;
                if (actionButtons) actionButtons.style.display = 'flex';
            }, 1000);

        } catch (error) {
            console.error(error);
            showMessage('Lỗi kết nối, vui lòng thử lại!', 'error');
            searchBtn.disabled = false;
        }
    });
}

// Hàm Render kết quả ra màn hình web
function renderResult(data) {
    if (!resultContainer) return;
    
    // Lưu mã tracking vào biến toàn cục để pdf.js sử dụng
    window.currentTrackingCode = data.trackingCode;

    // Render HTML cho phần kết quả (Bạn có thể tùy chỉnh theo ý muốn)
    resultContainer.innerHTML = `
        <div class="detail-box">
            <div class="detail-title">Thông tin vận đơn: ${data.trackingCode}</div>
            <div class="detail-grid">
                <div class="detail-item"><b>Trạng thái:</b> <span class="status-badge">${data.status}</span></div>
                <div class="detail-item"><b>Người nhận:</b> <span class="receiver-text">${data.receiver}</span></div>
                <div class="detail-item"><b>Địa chỉ:</b> ${data.address}</div>
            </div>
        </div>
        <div class="timeline">
            ${data.events.map(ev => `
                <div class="event latest">
                    <div class="event-dot"></div>
                    <div class="event-time">${ev.time}</div>
                    <div class="event-status">${ev.status} <b>${ev.location}</b></div>
                </div>
            `).join('')}
        </div>
    `;
    resultContainer.style.display = 'block';

    // Render luôn vào vùng in A4
    renderPrintArea(data);
}

// Hàm Render nội dung cho vùng in A4
function renderPrintArea(data) {
    const printArea = document.getElementById('print-area');
    if (!printArea) return;

    printArea.innerHTML = `
        <div class="print-page">
            <div class="p-header">
                <div class="p-header-left">
                    <img src="./images/logo.png" class="p-logo" onerror="this.style.display='none'">
                    <div class="p-brand-info">
                        <div class="p-brand-name">InVanDon247</div>
                        <div class="p-brand-sub">Công cụ tra cứu và tạo phiếu vận đơn A4</div>
                    </div>
                </div>
                <div class="p-title-wrap">
                    <div class="p-title-main">PHIẾU GỬI HÀNG</div>
                    <div class="p-title-code">Mã: ${data.trackingCode}</div>
                </div>
            </div>
            
            <div class="p-section-box">
                <div class="p-section-head">Thông tin vận đơn</div>
                <div class="p-grid-info">
                    <div><b>Mã vận đơn:</b> ${data.trackingCode}</div>
                    <div><b>Trạng thái:</b> ${data.status}</div>
                    <div><b>Người nhận:</b> ${data.receiver}</div>
                    <div><b>Địa chỉ:</b> ${data.address}</div>
                </div>
            </div>

            <div class="p-section-box">
                <div class="p-section-head">Hành trình</div>
                <table class="p-timeline-table">
                    <tr>
                        <td>
                            ${data.events.map(ev => `
                                <div class="p-event-card">
                                    <div class="p-event-time">${ev.time}</div>
                                    <div class="p-event-desc">${ev.status}</div>
                                    <div class="p-event-office">${ev.location}</div>
                                </div>
                            `).join('')}
                        </td>
                        <td></td>
                    </tr>
                </table>
            </div>

            <div class="p-footer">
                © 2026 InVanDon247. All rights reserved. Dữ liệu được truy xuất từ hệ thống VNPost.
            </div>
        </div>
    `;
}

// Khởi chạy lần đầu
loadCaptcha();
