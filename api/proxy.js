export default async function handler(req, res) {
    // Cho phép CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const { action } = req.query;

    try {
        // 1. LẤY CAPTCHA VÀ SESSION COOKIE TỪ VNPOST
        if (action === 'get-captcha') {
            const response = await fetch('https://vnpost.vn/handle-captcha/refresh-captcha', {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'application/json, text/javascript, */*; q=0.01',
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });

            // Lấy Cookie phiên làm việc (vnpost_session)
            const rawCookies = response.headers.getSetCookie ? response.headers.getSetCookie() : [response.headers.get('set-cookie')];
            const sessionCookie = rawCookies.map(c => c ? c.split(';')[0] : '').join('; ');

            const data = await response.json();

            if (data && data.captcha) {
                return res.status(200).json({
                    captchaUrl: data.captcha,
                    cookie: sessionCookie
                });
            } else {
                return res.status(500).json({ error: 'Không lấy được URL CAPTCHA từ VNPost' });
            }
        }

        // 2. TRA CỨU VẬN ĐƠN VỚI MÃ + CAPTCHA + COOKIE
        if (action === 'track' && req.method === 'POST') {
            const { trackingCode, captchaText, cookie } = req.body;

            if (!trackingCode || !captchaText) {
                return res.status(400).json({ error: 'Thiếu mã vận đơn hoặc mã CAPTCHA' });
            }

            const targetUrl = `https://vnpost.vn/postcode/thong-tin?captcha=${encodeURIComponent(captchaText)}&post_code=${encodeURIComponent(trackingCode)}`;

            const response = await fetch(targetUrl, {
                method: 'GET',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'application/json, text/javascript, */*; q=0.01',
                    'X-Requested-With': 'XMLHttpRequest',
                    'Cookie': cookie || ''
                }
            });

            const resultJson = await response.json();
            return res.status(200).json(resultJson);
        }

        return res.status(400).json({ error: 'Action không hợp lệ' });

    } catch (error) {
        return res.status(500).json({ error: 'Lỗi Proxy Server: ' + error.message });
    }
}
