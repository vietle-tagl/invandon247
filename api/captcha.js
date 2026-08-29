export default async function handler(req, res) {
    try {
        // Gọi lấy ảnh CAPTCHA và Cookie từ VNPost
        const response = await fetch('https://vnpost.vn/vi/Tracking/GetCaptcha', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
            }
        });
        
        const setCookie = response.headers.get('set-cookie');
        const buffer = await response.arrayBuffer();
        const base64Image = Buffer.from(buffer).toString('base64');

        res.status(200).json({
            image: `data:image/png;base64,${base64Image}`,
            cookie: setCookie
        });
    } catch (error) {
        res.status(500).json({ error: 'Không lấy được CAPTCHA từ VNPost' });
    }
}
