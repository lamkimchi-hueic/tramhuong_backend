/**
 * Update image_url của Product & Category trong DB:
 * từ "/uploads/products/xxx.jpg" → URL Cloudinary
 *
 * Đọc mapping từ cloudinary-mapping.json
 * Usage: cd backend; node scripts/update-image-urls-to-cloudinary.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', 'server', '.env') });
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

(async () => {
    const mappingPath = path.join(__dirname, '..', 'cloudinary-mapping.json');
    if (!fs.existsSync(mappingPath)) {
        console.error('❌ Không tìm thấy cloudinary-mapping.json. Chạy upload-to-cloudinary.js trước.');
        process.exit(1);
    }
    const mapping = JSON.parse(fs.readFileSync(mappingPath, 'utf8'));
    console.log(`📋 Mapping có ${Object.keys(mapping).length} ảnh\n`);

    // Helper: từ image_url cũ (vd "/uploads/products/product-xxx.jpg") → cloudinary URL
    const resolve = (oldUrl) => {
        if (!oldUrl) return null;
        if (oldUrl.startsWith('http')) return null; // đã là URL ngoài
        const filename = path.basename(oldUrl);
        return mapping[filename] || null;
    };

    // --- Products ---
    const products = await prisma.product.findMany();
    let pUpdated = 0;
    for (const p of products) {
        const newUrl = resolve(p.image_url);
        if (newUrl && newUrl !== p.image_url) {
            await prisma.product.update({
                where: { id_product: p.id_product },
                data: { image_url: newUrl },
            });
            console.log(`  ✓ Product #${p.id_product}: ${p.image_url} → ${newUrl}`);
            pUpdated++;
        }
    }
    console.log(`\n📦 Products: ${pUpdated}/${products.length} đã update\n`);

    // --- Categories ---
    const categories = await prisma.category.findMany();
    let cUpdated = 0;
    for (const c of categories) {
        const newUrl = resolve(c.image_url);
        if (newUrl && newUrl !== c.image_url) {
            await prisma.category.update({
                where: { id_category: c.id_category },
                data: { image_url: newUrl },
            });
            console.log(`  ✓ Category #${c.id_category}: ${c.image_url} → ${newUrl}`);
            cUpdated++;
        }
    }
    console.log(`\n🏷️  Categories: ${cUpdated}/${categories.length} đã update`);

    await prisma.$disconnect();
})();
