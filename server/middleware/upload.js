const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cloudinary = require('cloudinary').v2;

// Configure Cloudinary - explicit config from URL
if (process.env.CLOUDINARY_URL) {
    cloudinary.config({
        cloudinary_url: process.env.CLOUDINARY_URL
    });
    console.log('✓ Cloudinary configured successfully');
} else {
    console.warn('⚠️  CLOUDINARY_URL not set - image uploads will fail');
}

// Ensure uploads directories exist
const productDir = path.join(__dirname, '../../uploads/products');
const categoryDir = path.join(__dirname, '../../uploads/categories');
const heroDir = path.join(__dirname, '../../uploads/hero');
if (!fs.existsSync(productDir)) fs.mkdirSync(productDir, { recursive: true });
if (!fs.existsSync(categoryDir)) fs.mkdirSync(categoryDir, { recursive: true });
if (!fs.existsSync(heroDir)) fs.mkdirSync(heroDir, { recursive: true });

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

const heroStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, heroDir),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const filePrefix = file.fieldname === 'hero_image' ? 'hero' : 'logo';
        cb(null, `${filePrefix}-${uniqueSuffix}${path.extname(file.originalname)}`);
    }
});

const upload = multer({ storage: productStorage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });
const uploadCategory = multer({ storage: categoryStorage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });
const uploadHero = multer({ storage: heroStorage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });

/**
 * Middleware helper to upload a local file to Cloudinary
 * @param {string} localPath - File path from multer
 * @param {string} folder - Cloudinary folder name
 * @returns {Promise<string|null>} Cloudinary URL or null
 */
const uploadToCloudinary = async (localPath, folder) => {
    // Validate inputs
    if (!process.env.CLOUDINARY_URL) {
        console.error('❌ CLOUDINARY_URL not configured');
        return null;
    }
    
    if (!localPath) {
        console.error('❌ No file path provided');
        return null;
    }

    // Ensure absolute path
    const absolutePath = path.isAbsolute(localPath) ? localPath : path.resolve(localPath);
    
    // Check if file exists
    if (!fs.existsSync(absolutePath)) {
        console.error(`❌ File not found: ${absolutePath}`);
        return null;
    }

    try {
        console.log(`📤 Uploading to Cloudinary (with compression & auto format): ${path.basename(absolutePath)} -> ${folder}`);
        const result = await cloudinary.uploader.upload(absolutePath, {
            folder: `tramhuong/${folder}`,
            resource_type: 'image',
            transformation: [
                { width: 1200, crop: 'limit' },
                { quality: 'auto:good' },
                { fetch_format: 'auto' }
            ]
        });
        
        // Delete local file after successful upload
        try {
            fs.unlinkSync(absolutePath);
            console.log(`✓ Local file deleted: ${absolutePath}`);
        } catch (delErr) {
            console.warn(`⚠️  Could not delete local file: ${delErr.message}`);
        }
        
        console.log(`✓ Cloudinary upload success: ${result.secure_url}`);
        return result.secure_url;
    } catch (error) {
        console.error(`❌ Cloudinary upload error: ${error.message}`);
        if (error.http_code) console.error(`   HTTP Status: ${error.http_code}`);
        return null;
    }
};

module.exports = { upload, uploadCategory, uploadHero, uploadToCloudinary };
