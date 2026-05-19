/**
 * Upload tất cả ảnh trong frontend/src/assets/images/ và backend/uploads/
 * lên Cloudinary, ghi mapping ra cloudinary-mapping.json
 *
 * Usage: cd backend; node scripts/upload-to-cloudinary.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', 'server', '.env') });
const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const path = require('path');

// CLOUDINARY_URL trong env tự được parse
if (!process.env.CLOUDINARY_URL) {
    console.error('❌ Thiếu CLOUDINARY_URL trong server/.env');
    process.exit(1);
}

const TARGETS = [
    {
        dir: path.join(__dirname, '..', '..', 'frontend', 'src', 'assets', 'images'),
        folder: 'tramhuong/assets',
    },
    {
        dir: path.join(__dirname, '..', 'uploads', 'products'),
        folder: 'tramhuong/products',
    },
    {
        dir: path.join(__dirname, '..', 'uploads', 'categories'),
        folder: 'tramhuong/categories',
    },
];

const IMG_EXT = ['.png', '.jpg', '.jpeg', '.webp', '.gif'];

async function uploadFile(filePath, folder) {
    const filename = path.basename(filePath, path.extname(filePath));
    const publicId = `${folder}/${filename}`;
    try {
        const res = await cloudinary.uploader.upload(filePath, {
            public_id: publicId,
            overwrite: true,
            resource_type: 'image',
            transformation: [
                { width: 1200, crop: "limit" },
                { quality: "auto" },
                { fetch_format: "auto" }
            ]
        });
        return res.secure_url;
    } catch (e) {
        console.error(`  ✗ ${filePath}:`, e.message);
        return null;
    }
}

(async () => {
    console.log('☁️  Bắt đầu upload lên Cloudinary...\n');
    const mapping = {};

    for (const { dir, folder } of TARGETS) {
        if (!fs.existsSync(dir)) {
            console.log(`⚠️  Bỏ qua (không tồn tại): ${dir}`);
            continue;
        }
        const files = fs.readdirSync(dir).filter(f => IMG_EXT.includes(path.extname(f).toLowerCase()));
        if (files.length === 0) {
            console.log(`📂 ${folder}: (rỗng)`);
            continue;
        }
        console.log(`📂 ${folder} (${files.length} ảnh):`);
        for (const file of files) {
            const full = path.join(dir, file);
            const url = await uploadFile(full, folder);
            if (url) {
                mapping[file] = url;
                console.log(`  ✓ ${file} → ${url}`);
            }
        }
        console.log();
    }

    const outPath = path.join(__dirname, '..', 'cloudinary-mapping.json');
    fs.writeFileSync(outPath, JSON.stringify(mapping, null, 2), 'utf8');
    console.log(`✅ Mapping đã lưu: ${outPath}`);
    console.log(`📊 Tổng: ${Object.keys(mapping).length} ảnh`);
})();
