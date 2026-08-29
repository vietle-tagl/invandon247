export default async function handler(req, res) {
    // Cho phép gọi API từ mọi nguồn (Bypass CORS)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');

    try {
        // Gọi thẳng tới BotDetect Captcha của VNPost
        const captchaUrl = `https://vnpost.vn/captcha/default?${Date.now()}`;
        const response = await fetch(captchaUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
                'Referer': 'https://vnpost.vn/vi/Tracking'
            }
        });

        if (!response.ok) throw new Error('VNPost Error');

        // Chuyển ảnh thành chuỗi Base64
        const arrayBuffer = await response.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString('base64');
        const contentType = response.headers.get('content-type') || 'image/png';

        // Trả về ảnh chuẩn Base64 để hiển thị ngay trên web
        res.status(200).json({
            image: `data:${contentType};base64,${base64}`
        });
    } catch (error) {
        res.status(500).json({ error: 'Lỗi lấy CAPTCHA' });
    }
}
