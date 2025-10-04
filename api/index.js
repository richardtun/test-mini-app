// --- KHỞI TẠO MÁY CHỦ VÀ CÁC THƯ VIỆN CẦN THIẾT ---
import express from 'express';
// Chúng ta dùng Express để xử lý các tuyến đường (routes)
const app = express();

// Hàm này để tạo URL hình ảnh cho Frame.
// Nó dùng placeholder service để tạo ảnh theo trạng thái game.
const generateImageUrl = (count, isGameOver) => {
    let text = `Số lần nhấp: ${count}`;
    let color = '2563EB'; // Màu xanh
    
    if (isGameOver) {
        text = `HOÀN THÀNH! ${count} Lần`;
        color = 'DC2626'; // Màu đỏ
    } else if (count === 0) {
        text = 'Bắt đầu đếm!';
        color = '10B981'; // Màu xanh lá
    }

    const width = 600;
    const height = 315;
    // Đảm bảo URL là duy nhất cho mỗi trạng thái bằng cách thêm timestamp
    const timestamp = Date.now();
    const placeholderUrl = `https://placehold.co/${width}x${height}/${color}/ffffff?text=${encodeURIComponent(text)}&t=${timestamp}`;
    return placeholderUrl;
};

// Hàm tạo các thẻ meta OpenGraph cần thiết cho Farcaster Frame
const generateFrameHtml = (count, baseUrl) => {
    const MAX_CLICKS = 5;
    const nextCount = count + 1;
    const isGameOver = count >= MAX_CLICKS;
    
    // 1. Tạo URL ảnh động theo trạng thái hiện tại
    const imageUrl = generateImageUrl(count, isGameOver);
    
    // 2. Xác định URL POST tiếp theo
    // Sử dụng URL cơ sở (baseUrl) để đảm bảo Frame gọi đúng endpoint POST
    const action = `${baseUrl}/api/index`; 

    // 3. Xây dựng các thẻ meta
    let html = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Farcaster Click Game</title>
        <meta property="fc:frame" content="vNext" />
        <meta property="fc:frame:image" content="${imageUrl}" />
        <meta property="og:image" content="${imageUrl}" />
    `;
    
    if (isGameOver) {
        // Trạng thái Game Over: Chỉ hiển thị nút Reset
        // Post về trạng thái count=0 để bắt đầu lại
        html += `
            <meta property="fc:frame:button:1" content="Chơi Lại" />
            <meta property="fc:frame:post_url" content="${action}?count=0" />
            <meta property="fc:frame:button:1:action" content="post" />
        `;
    } else {
        // Trạng thái đang chơi: Hiển thị nút Click
        // Post về trạng thái tiếp theo (nextCount)
        html += `
            <meta property="fc:frame:button:1" content="Nhấp vào đây (${count}/${MAX_CLICKS})" />
            <meta property="fc:frame:post_url" content="${action}?count=${nextCount}" />
            <meta property="fc:frame:button:1:action" content="post" />
        `;
    }

    html += `
    </head>
    <body>
        <h1>Mini Game Farcaster đơn giản</h1>
        <p>Đây là giao diện của máy chủ. Frame sẽ hiển thị trong Warpcast/Farcaster client.</p>
        <p>Trạng thái hiện tại (Server side): ${count} / ${MAX_CLICKS}</p>
    </body>
    </html>
    `;
    return html;
};

// Middleware cần thiết để Express đọc body JSON từ request của Farcaster
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// 1. ROUTE XỬ LÝ GET VÀ POST CỦA FRAME (Chỉ dùng một route cho Vercel Serverless)
app.use('/api/index', (req, res) => {
    // Base URL của dự án, cần để tạo URL POST chính xác
    const baseUrl = `https://${req.headers.host}`;
    
    let count = 0;
    
    if (req.method === 'GET') {
        // Trường hợp 1: Frame được tải lần đầu (GET request)
        count = 0;
        console.log('GET /api/index - Khởi tạo Frame (Count = 0)');
    } else if (req.method === 'POST') {
        // Trường hợp 2: Người dùng nhấp nút (POST request)
        
        // Lấy trạng thái mới (newCount) từ query parameter trong URL
        // Ví dụ: /api/index?count=1
        count = parseInt(req.query.count || '0', 10);
        console.log(`POST /api/index - Trạng thái mới: ${count}`);
    } else {
        // Phương thức không được hỗ trợ
        return res.status(405).send('Method Not Allowed');
    }

    // 2. Tạo Frame HTML mới với trạng thái mới
    const html = generateFrameHtml(count, baseUrl);
    
    // 3. Trả về Frame HTML mới
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
});

// ROUTE GỐC (Trang chủ) - chuyển hướng đến API Frame cho Validator
app.get('/', (req, res) => {
    const baseUrl = `https://${req.headers.host}`;
    // Validator cần tải URL gốc, nhưng logic nằm ở /api/index
    // Chúng ta trả về Frame HTML ở đây để tiện sử dụng URL gốc cho Farcaster
    const html = generateFrameHtml(0, baseUrl); 
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
});


// Xuất ứng dụng Express (BẮT BUỘC cho Vercel Serverless Function)
// Vercel sẽ tự động chạy ứng dụng này khi có request đến /api/index hoặc /
export default app; 
