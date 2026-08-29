export default async function handler(req, res) {
    try {
        const response = await fetch('https://vnpost.vn/vi/Tracking/GetCaptcha', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
            }
        });
        
        // Lấy Session Cookie mà VNPost tạo ra
        const cookies = response.headers.getSetCookie ? response.headers.getSetCookie() : [response.headers.get('set-cookie')];
        const cookieHeader = cookies.filter(Boolean).map(c => c.split(';')[0]).join('; ');

        const buffer = await response.arrayBuffer();
        const base64Image = Buffer.from(buffer).toString('base64');

        res.status(200).json({
            image: `data:image/png;base64,${base64Image}`,
            cookie: cookieHeader
        });
    } catch (error) {
        res.status(500).json({ error: 'Không thể kết nối VNPost' });
    }
}
