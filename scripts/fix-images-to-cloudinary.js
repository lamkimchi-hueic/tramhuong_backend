/**
 * Fix tất cả image_url trong DB:
 * - Nếu file tồn tại local → upload lên Cloudinary → update DB
 * - Nếu file KHÔNG tồn tại local → set null (tránh ảnh vỡ)
 *
 * Usage: cd backend && node scripts/fix-images-to-cloudinary.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', 'server', '.env') });
const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

if (!process.env.CLOUDINARY_URL) {
    console.error('❌ Thiếu CLOUDINARY_URL trong server/.env');
    process.exit(1);
}

const uploadsBase = path.join(__dirname, '..');

async function uploadToCloudinary(localPath, folder) {
    const filename = path.basename(localPath, path.extname(localPath));
    const publicId = `tramhuong/${folder}/${filename}`;
    try {
        const res = await cloudinary.uploader.upload(localPath, {
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
        console.error(`  ✗ Upload lỗi ${localPath}:`, e.message);
        return null;
    }
}

async function fixImageUrls(model, idField, nameField, folder) {
    const records = await prisma[model].findMany();
    let fixed = 0, cleared = 0, skipped = 0;

    for (const record of records) {
        const url = record.image_url;
        const id = record[idField];
        const name = record[nameField] || `#${id}`;

        // Already a Cloudinary/external URL → skip
        if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
            console.log(`  ✓ ${name} — đã có Cloudinary URL`);
            skipped++;
            continue;
        }

        // No image → skip
        if (!url) {
            console.log(`  ⚪ ${name} — chưa có ảnh`);
            skipped++;
            continue;
        }

        // Local path → try to find and upload
        const localPath = path.join(uploadsBase, url.replace(/^\//, ''));

        if (fs.existsSync(localPath)) {
            console.log(`  ⬆️  ${name} — đang upload lên Cloudinary...`);
            const cloudUrl = await uploadToCloudinary(localPath, folder);
            if (cloudUrl) {
                await prisma[model].update({
                    where: { [idField]: id },
                    data: { image_url: cloudUrl },
                });
                console.log(`     → ${cloudUrl}`);
                fixed++;
            } else {
                // Upload failed, clear to avoid broken image
                await prisma[model].update({
                    where: { [idField]: id },
                    data: { image_url: null },
                });
                console.log(`     → Xóa URL (upload thất bại)`);
                cleared++;
            }
        } else {
            // File doesn't exist locally → clear broken URL
            console.log(`  ❌ ${name} — file mất: ${url}`);
            await prisma[model].update({
                where: { [idField]: id },
                data: { image_url: null },
            });
            console.log(`     → Đã xóa URL hỏng (cần upload lại ảnh)`);
            cleared++;
        }
    }

    return { total: records.length, fixed, cleared, skipped };
}

(async () => {
    console.log('🔧 Bắt đầu fix image URLs...\n');

    console.log('📦 === PRODUCTS ===');
    const pResult = await fixImageUrls('product', 'id_product', 'product_name', 'products');
    console.log(`\n   Tổng: ${pResult.total} | Upload: ${pResult.fixed} | Xóa URL hỏng: ${pResult.cleared} | Bỏ qua: ${pResult.skipped}\n`);

    console.log('🏷️  === CATEGORIES ===');
    const cResult = await fixImageUrls('category', 'id_category', 'category_name', 'categories');
    console.log(`\n   Tổng: ${cResult.total} | Upload: ${cResult.fixed} | Xóa URL hỏng: ${cResult.cleared} | Bỏ qua: ${cResult.skipped}\n`);

    console.log('✅ Hoàn tất!');
    if (pResult.cleared + cResult.cleared > 0) {
        console.log(`⚠️  Có ${pResult.cleared + cResult.cleared} ảnh bị mất vĩnh viễn — cần vào Admin upload lại.`);
    }

    await prisma.$disconnect();
})();
