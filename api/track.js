export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { code, captcha, cookie } = req.body;

    try {
        const response = await fetch('https://vnpost.vn/vi/Tracking/TraCuuHanhTrinh', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'Cookie': cookie || '',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                'X-Requested-With': 'XMLHttpRequest',
                'Origin': 'https://vnpost.vn',
                'Referer': 'https://vnpost.vn/vi/Tracking'
            },
            body: new URLSearchParams({
                'ItemCode': code,
                'CaptchaCode': captcha
            })
        });

        const html = await response.text();
        res.status(200).send(html);
    } catch (error) {
        res.status(500).json({ error: 'Lỗi gửi dữ liệu tra cứu' });
    }
}
