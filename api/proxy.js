const https = require('https');
const axios = require('axios'); // Thêm axios vào package.json hoặc dùng fetch/https native

export default async function handler(req, res) {
    // Cấu hình CORS để trang web của bạn gọi được API
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-vnpost-cookie');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const { action } = req.query;

    try {
        // BƯỚC 1: LẤY CAPTCHA VÀ TRẢ COOKIE VỀ CHO TRÌNH DUYỆT
        if (action === 'get-captcha') {
            const response = await axios.get('https://vnpost.vn/vi/Tracking/GetCaptcha', {
                responseType: 'arraybuffer',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                }
            });

            // Lấy cookie phiên làm việc từ VNPost
            const rawCookies = response.headers['set-cookie'] || [];
            const cookieHeader = rawCookies.map(c => c.split(';')[0]).join('; ');

            // Chuyển ảnh Captcha sang mã Base64
            const base64Image = Buffer.from(response.data, 'binary').toString('base64');

            return res.status(200).json({
                captcha: `data:image/png;base64,${base64Image}`,
                cookie: cookieHeader
            });
        }

        // BƯỚC 2: GỬI MÃ VẬN ĐƠN + CAPTCHA + COOKIE SANG VNPOST
        if (action === 'track') {
            const { trackingCode, captchaText, cookie } = req.body;

            if (!trackingCode || !captchaText || !cookie) {
                return res.status(400).json({ error: 'Thiếu thông tin tra cứu hoặc Cookie phiên làm việc!' });
            }

            // Gửi request tra cứu kèm Cookie phiên làm việc ban đầu
            const response = await axios.post(
                'https://vnpost.vn/vi/Tracking/Index',
                new URLSearchParams({
                    'ItemCode': trackingCode,
                    'CaptchaText': captchaText
                }).toString(),
                {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'Cookie': cookie,
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                        'Referer': 'https://vnpost.vn/vi/Tracking'
                    }
                }
            );

            return res.status(200).json({ html: response.data });
        }

        return res.status(400).json({ error: 'Action không hợp lệ' });
    } catch (error) {
        return res.status(500).json({ error: 'Lỗi kết nối tới VNPost Server', detail: error.message });
    }
}
