export default async function handler(req, res) {
    try {
        // Đường dẫn chuẩn lấy CAPTCHA BotDetect của VNPost
        const captchaUrl = `https://vnpost.vn/captcha/default?${Date.now()}`;
        
        const response = await fetch(captchaUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
                'Referer': 'https://vnpost.vn/vi/Tracking'
            }
        });

        if (!response.ok) throw new Error('VNPost Blocked');

        const cookies = response.headers.getSetCookie ? response.headers.getSetCookie() : [response.headers.get('set-cookie')];
        const cookieHeader = cookies.filter(Boolean).map(c => c.split(';')[0]).join('; ');

        const buffer = await response.arrayBuffer();
        const base64Image = Buffer.from(buffer).toString('base64');

        res.status(200).json({
            image: `data:image/png;base64,${base64Image}`,
            cookie: cookieHeader
        });
    } catch (error) {
        res.status(500).json({ error: 'Không lấy được CAPTCHA từ VNPost' });
    }
}
