export default async function handler(req, res) {
    // Cấu hình CORS để giao diện Web gọi được API
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const { code } = req.query;
    if (!code) {
        return res.status(400).json({ error: 'Vui lòng cung cấp mã vận đơn (code)' });
    }

    try {
        // Gửi request cào dữ liệu trực tiếp từ API hệ thống VNPost
        const response = await fetch(`https://vnpost.vn/vi-vn/dinh-vi/buu-gui?key=${code.trim()}`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
            }
        });

        const html = await response.text();
        return res.status(200).json({ success: true, code: code, rawHtml: html });
    } catch (error) {
        return res.status(500).json({ error: 'Không thể kết nối tới VNPost', details: error.message });
    }
}
