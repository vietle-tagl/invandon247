export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const { action } = req.query;

    try {

        // =====================================================
        // 1. LẤY CAPTCHA
        // =====================================================
        if (action === 'get-captcha') {

            const response = await fetch(
                'https://vnpost.vn/handle-captcha/refresh-captcha',
                {
                    method: 'GET',
                    headers: {
                        'User-Agent':
                            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36',

                        'Accept':
                            'application/json, text/javascript, */*; q=0.01',

                        'X-Requested-With': 'XMLHttpRequest'
                    }
                }
            );

            if (!response.ok) {
                return res.status(502).json({
                    error: 'VNPost không trả CAPTCHA',
                    status: response.status
                });
            }

            // Lấy toàn bộ Set-Cookie
            let rawCookies = [];

            if (typeof response.headers.getSetCookie === 'function') {
                rawCookies = response.headers.getSetCookie();
            } else {
                const c = response.headers.get('set-cookie');
                if (c) rawCookies = [c];
            }

            const sessionCookie = rawCookies
                .filter(Boolean)
                .map(c => c.split(';')[0])
                .join('; ');

            const data = await response.json();

            if (!data || !data.captcha) {
                return res.status(500).json({
                    error: 'VNPost không trả URL CAPTCHA'
                });
            }

            // =================================================
            // QUAN TRỌNG:
            // Lấy luôn ảnh CAPTCHA thông qua SERVER
            // và dùng đúng Cookie vừa nhận được
            // =================================================

            const captchaResponse = await fetch(data.captcha, {
                method: 'GET',
                headers: {
                    'User-Agent':
                        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36',

                    'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',

                    'Referer': 'https://vnpost.vn/',

                    'Cookie': sessionCookie
                }
            });

            if (!captchaResponse.ok) {
                return res.status(502).json({
                    error: 'Không tải được ảnh CAPTCHA',
                    status: captchaResponse.status
                });
            }

            const captchaBuffer = Buffer.from(
                await captchaResponse.arrayBuffer()
            );

            const contentType =
                captchaResponse.headers.get('content-type') ||
                'image/png';

            // Trả ảnh dạng Base64
            const captchaBase64 =
                `data:${contentType};base64,` +
                captchaBuffer.toString('base64');

            return res.status(200).json({
                captchaUrl: captchaBase64,
                cookie: sessionCookie
            });
        }


        // =====================================================
        // 2. TRA CỨU VẬN ĐƠN
        // =====================================================
        if (action === 'track' && req.method === 'POST') {

            const {
                trackingCode,
                captchaText,
                cookie
            } = req.body || {};

            if (!trackingCode || !captchaText) {
                return res.status(400).json({
                    error: 'Thiếu mã vận đơn hoặc CAPTCHA'
                });
            }

            if (!cookie) {
                return res.status(400).json({
                    error: 'Thiếu Cookie phiên VNPost'
                });
            }

            const targetUrl =
                'https://vnpost.vn/postcode/thong-tin' +
                '?captcha=' +
                encodeURIComponent(captchaText) +
                '&post_code=' +
                encodeURIComponent(trackingCode);

            const response = await fetch(targetUrl, {
                method: 'GET',

                headers: {
                    'User-Agent':
                        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36',

                    'Accept':
                        'application/json, text/javascript, */*; q=0.01',

                    'X-Requested-With':
                        'XMLHttpRequest',

                    'Referer':
                        'https://vnpost.vn/',

                    'Cookie':
                        cookie
                }
            });

            const text = await response.text();

            let resultJson;

            try {
                resultJson = JSON.parse(text);
            } catch {
                return res.status(502).json({
                    error: 'VNPost không trả JSON',
                    raw: text.substring(0, 500)
                });
            }

            return res.status(200).json(resultJson);
        }


        return res.status(400).json({
            error: 'Action không hợp lệ'
        });

    } catch (error) {

        console.error(error);

        return res.status(500).json({
            error: 'Lỗi Proxy Server: ' + error.message
        });
    }
}
