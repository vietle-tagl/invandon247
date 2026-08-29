export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const { code } = req.query;
    if (!code) {
        return res.status(400).json({ error: 'Vui lòng cung cấp mã vận đơn' });
    }

    const cleanCode = code.trim().toUpperCase();

    try {
        // Sử dụng API backend công khai của VNPost để lấy dữ liệu JSON chính xác
        const apiUrl = `https://vnpost.vn/vi-vn/dinh-vi/buu-gui?key=${cleanCode}`;
        
        const response = await fetch(apiUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7'
            }
        });

        const html = await response.text();

        // Kiểm tra xem phản hồi có chứa thông tin bưu gửi hay không
        if (!html || html.includes('Không tìm thấy') || html.length < 500) {
            return res.status(444).json({ error: 'Mã vận đơn không tồn tại hoặc chưa có dữ liệu trên hệ thống VNPost.' });
        }

        return res.status(200).json({ success: true, code: cleanCode, rawHtml: html });
    } catch (error) {
        return res.status(500).json({ error: 'Lỗi kết nối Server', details: error.message });
    }
}
