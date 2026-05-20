// Đây là file khởi tạo server chính.
// 
// Vai trò:
// 
// khởi tạo Express
// 
// cấu hình middleware
// 
// import routes
// 
// chạy server
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });//Nạp thư viện dotenv từ server/.env
const express = require('express');
const cors = require('cors');
const prisma = require('./config/db');
const routes = require('./routes');
const { initSiteSettings } = require('../scripts/init-site-settings');

const app = express();
const PORT = process.env.PORT || 3000;

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '../uploads/products');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded images as static files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.use('/api', routes);

// Health check route
app.get('/', (req, res) => {
    res.json({ message: 'Welcome to Tram Huong API nhóm 2!' });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Đã xảy ra lỗi server!' });
});

// Kết nối database và khởi động server
const startServer = async () => {
    try {
        await prisma.$connect();
        console.log('Kết nối database thành công!');

        // Initialize default site settings if needed
        await initSiteSettings(prisma);

        app.listen(PORT, () => {
            console.log(` Server đang chạy tại http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error(' Không thể kết nối database:', error);
        process.exit(1);
    }
};

startServer();
