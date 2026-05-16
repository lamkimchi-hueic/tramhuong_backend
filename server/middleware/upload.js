const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cloudinary = require('cloudinary').v2;

// Configure Cloudinary from environment variable
if (process.env.CLOUDINARY_URL) {
    cloudinary.config({
        cloudinary_url: process.env.CLOUDINARY_URL
    });
}

// Ensure uploads directories exist
const productDir = path.join(__dirname, '../../uploads/products');
const categoryDir = path.join(__dirname, '../../uploads/categories');
if (!fs.existsSync(productDir)) fs.mkdirSync(productDir, { recursive: true });
if (!fs.existsSync(categoryDir)) fs.mkdirSync(categoryDir, { recursive: true });

const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Chỉ được upload ảnh (JPG, PNG, WEBP, GIF)!'), false);
    }
};

const productStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, productDir),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, `product-${uniqueSuffix}${path.extname(file.originalname)}`);
    }
});

const categoryStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, categoryDir),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, `category-${uniqueSuffix}${path.extname(file.originalname)}`);
    }
});

const upload = multer({ storage: productStorage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });
const uploadCategory = multer({ storage: categoryStorage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });

/**
 * Middleware helper to upload a local file to Cloudinary
 * @param {string} localPath 
 * @param {string} folder 
 * @returns {Promise<string|null>} Cloudinary URL or null
 */
const uploadToCloudinary = async (localPath, folder) => {
    if (!process.env.CLOUDINARY_URL || !localPath) return null;
    try {
        const result = await cloudinary.uploader.upload(localPath, {
            folder: `tramhuong/${folder}`,
            resource_type: 'auto'
        });
        return result.secure_url;
    } catch (error) {
        console.error('Cloudinary Upload Error:', error);
        return null;
    }
};

module.exports = { upload, uploadCategory, uploadToCloudinary };
