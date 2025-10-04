// --- KHỞI TẠO MÁY CHỦ VÀ CÁC THƯ VIỆN CẦN THIẾT ---
import express from 'express';
// Trong môi trường Node.js thực tế, bạn cần cài đặt:
// npm install express
// npm install node-fetch (hoặc sử dụng fetch API có sẵn nếu Node > 18)

// Hàm này để tạo URL hình ảnh cho Frame.
// Trong môi trường thực tế, bạn sẽ dùng các dịch vụ như Vercel OG image/Sharp.js
// Ở đây, chúng ta dùng một placeholder image URL đơn giản để demo.
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

    // Sử dụng dịch vụ placeholder ảnh để tạo ảnh động với số đếm
    const width = 600;
    const height = 315;
    const placeholderUrl = `https://placehold.co/${width}x${height}/${color}/ffffff?text=${encodeURIComponent(text)}`;
    return placeholderUrl;
};

// Hàm tạo các thẻ meta OpenGraph cần thiết cho Farcaster Frame
const generateFrameHtml = (count) => {
    const MAX_CLICKS = 5;
    const nextCount = count + 1;
    const isGameOver = count >= MAX_CLICKS;
    
    // 1. Tạo URL ảnh động theo trạng thái hiện tại
    const imageUrl = generateImageUrl(count, isGameOver);
    
    // 2. Xác định hành động (Action) tiếp theo
    let action = '/next-click'; // Đường dẫn POST khi nhấp nút

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
        html += `
            <meta property="fc:frame:button:1" content="Chơi Lại" />
            <meta property="fc:frame:post_url" content="${action}?count=0" />
            <meta property="fc:frame:button:1:action" content="post" />
        `;
    } else {
        // Trạng thái đang chơi: Hiển thị nút Click
        // Chúng ta truyền trạng thái tiếp theo (nextCount) trong URL post_url
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

// --- CẤU HÌNH EXPRESS.JS ---
const app = express();
const port = process.env.PORT || 3000;

// Middleware cần thiết để Express đọc body JSON từ request của Farcaster
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// 1. ROUTE ĐỂ KHỞI TẠO FRAME (GET '/')
// Đây là điểm vào ban đầu, khi người dùng thấy Cast lần đầu tiên.
app.get('/', (req, res) => {
    console.log('GET / - Khởi tạo Frame (Count = 0)');
    // Luôn bắt đầu game với số đếm là 0
    const html = generateFrameHtml(0); 
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
});


// 2. ROUTE XỬ LÝ NHẤP CHUỘT (POST '/next-click')
// Farcaster sẽ gửi POST request tới đây khi người dùng nhấp nút.
app.post('/next-click', (req, res) => {
    // 1. Lấy trạng thái mới (newCount) từ query parameter trong URL mà chúng ta đã thiết lập
    // Ví dụ: /next-click?count=1
    const newCount = parseInt(req.query.count || '0', 10);
    
    console.log(`POST /next-click - Trạng thái mới: ${newCount}`);
    
    // 2. Tạo Frame HTML mới với trạng thái mới
    const html = generateFrameHtml(newCount);
    
    // 3. Trả về Frame HTML mới
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
});


// --- KHỞI CHẠY MÁY CHỦ ---
app.listen(port, () => {
    console.log(`Server Frame đang chạy tại http://localhost:${port}`);
    console.log('LƯU Ý: Để chạy Frame thực tế, bạn cần deploy code này lên một URL công khai (ví dụ: Vercel).');
});
