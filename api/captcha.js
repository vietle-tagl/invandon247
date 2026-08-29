export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');

    try {
        const captchaUrl = `https://vnpost.vn/captcha/default?${Date.now()}`;
        const response = await fetch(captchaUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
                'Referer': 'https://vnpost.vn/vi/Tracking'
            }
        });

        if (!response.ok) throw new Error('VNPost Error');

        // Bóc tách đúng cookie session từ header
        const rawCookies = response.headers.getSetCookie ? response.headers.getSetCookie() : [response.headers.get('set-cookie')];
        const cookieHeader = rawCookies.filter(Boolean).map(c => c.split(';')[0]).join('; ');

        const arrayBuffer = await response.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString('base64');
        const contentType = response.headers.get('content-type') || 'image/png';

        res.status(200).json({
            image: `data:${contentType};base64,${base64}`,
            cookie: cookieHeader
        });
    } catch (error) {
        res.status(500).json({ error: 'Lỗi lấy CAPTCHA' });
    }
}
