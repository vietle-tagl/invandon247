export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();

    const { code, captcha, cookie } = req.body;

    try {
        const response = await fetch('https://vnpost.vn/vi/Tracking/TraCuuHanhTrinh', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Cookie': cookie || '',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
            },
            body: new URLSearchParams({
                'ItemCode': code,
                'CaptchaCode': captcha
            })
        });

        const html = await response.text();
        res.status(200).send(html);
    } catch (error) {
        res.status(500).json({ error: 'Lỗi truy vấn dữ liệu từ VNPost' });
    }
}
