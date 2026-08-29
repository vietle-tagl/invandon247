export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    const { action } = req.query;

    try {
        // BƯỚC 1: LẤY CAPTCHA
        if (action === 'get-captcha') {
            const response = await fetch('https://vnpost.vn/vi/Tracking/GetCaptcha', {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
                }
            });

            if (!response.ok) {
                return res.status(500).json({ error: `VNPost chặn IP Server Vercel (Status ${response.status})` });
            }

            // Lấy Set-Cookie từ VNPost
            const rawCookies = response.headers.getSetCookie ? response.headers.getSetCookie() : [response.headers.get('set-cookie')];
            const cookieHeader = rawCookies.filter(Boolean).map(c => c.split(';')[0]).join('; ');

            // Chuyển ảnh sang Base64
            const arrayBuffer = await response.arrayBuffer();
            const base64Image = Buffer.from(arrayBuffer).toString('base64');

            return res.status(200).json({
                captcha: `data:image/png;base64,${base64Image}`,
                cookie: cookieHeader
            });
        }

        // BƯỚC 2: TRA CỨU
        if (action === 'track') {
            const { trackingCode, captchaText, cookie } = req.body;

            const params = new URLSearchParams();
            params.append('ItemCode', trackingCode);
            params.append('CaptchaText', captchaText);

            const response = await fetch('https://vnpost.vn/vi/Tracking/Index', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Cookie': cookie || '',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Referer': 'https://vnpost.vn/vi/Tracking'
                },
                body: params.toString()
            });

            const html = await response.text();
            return res.status(200).json({ html });
        }

        return res.status(400).json({ error: 'Action không hợp lệ' });

    } catch (error) {
        return res.status(500).json({ error: 'Lỗi Proxy Server: ' + error.message });
    }
}
