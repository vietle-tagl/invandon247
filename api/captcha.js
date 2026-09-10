export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');

    try {
        const timestamp = Date.now();
        const captchaUrl = `https://vnpost.vn/captcha/default?${timestamp}`;
        
        // Gọi HEAD/GET lấy Cookie phiên làm việc từ VNPost
        const response = await fetch(captchaUrl, {
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                'Referer': 'https://vnpost.vn/vi/Tracking'
            }
        });

        // Bóc tách Cookie
        const rawCookies = response.headers.getSetCookie ? response.headers.getSetCookie() : [response.headers.get('set-cookie')];
        const cookieHeader = rawCookies.filter(Boolean).map(c => c.split(';')[0]).join('; ');

        // Trả URL trực tiếp để Browser tự render ảnh
        res.status(200).json({
            directUrl: captchaUrl,
            cookie: cookieHeader
        });
    } catch (error) {
        res.status(500).json({ error: 'Lỗi lấy phiên CAPTCHA' });
    }
}
