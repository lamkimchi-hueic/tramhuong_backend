/**
 * Upload ảnh gốc từ thư mục image/ lên Cloudinary và cập nhật DB
 * Usage: cd backend && node scripts/restore-product-images.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', 'server', '.env') });
const cloudinary = require('cloudinary').v2;
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

if (!process.env.CLOUDINARY_URL) {
    console.error('❌ Thiếu CLOUDINARY_URL');
    process.exit(1);
}

// Mapping: file ảnh gốc → product ID
const IMAGE_MAP = [
    // Products
    { file: 'thac.jpg',     id_product: 29, name: 'Thác khói trầm hương' },
    { file: 'tuong.jpg',    id_product: 30, name: 'Tượng Trầm' },
    { file: 'nhangtam.jpg', id_product: 21, name: 'Nhang có tăm' },
    { file: 'kt.jpg',       id_product: 22, name: 'Nhang không tăm' },
    { file: 'trn.jpg',      id_product: 23, name: 'Trầm Nụ' },
    { file: 'trm.jpg',      id_product: 24, name: 'Trầm Miếng / Trầm Ổ' },
    { file: 'kh.jpg',       id_product: 25, name: 'Nhang Vòng (Trầm Khoanh)' },
    { file: 'vong.jpg',     id_product: 26, name: 'Vòng tay Trầm Hương' },
    { file: 'day.jpg',      id_product: 27, name: 'Dây chuyền Trầm Hương' },
    { file: 'lu.jpg',       id_product: 28, name: 'Lư xông trầm' },
    { file: 'loai1.jpg',    id_product: 31, name: 'Cây cảnh Trầm Hương' },
    { file: 'pl.jpg',       id_product: 1,  name: 'Trầm Hương' },
];

const imageDir = path.join(__dirname, '..', '..', 'image');

async function uploadAndUpdate(item) {
    const filePath = path.join(imageDir, item.file);
    const filename = path.basename(item.file, path.extname(item.file));
    const publicId = `tramhuong/products/${filename}`;

    try {
        const res = await cloudinary.uploader.upload(filePath, {
            public_id: publicId,
            overwrite: true,
            resource_type: 'image',
        });
        const url = res.secure_url;

        await prisma.product.update({
            where: { id_product: item.id_product },
            data: { image_url: url },
        });

        console.log(`  ✅ #${item.id_product} ${item.name} → ${url}`);
        return true;
    } catch (e) {
        console.error(`  ❌ #${item.id_product} ${item.name}: ${e.message}`);
        return false;
    }
}

(async () => {
    console.log('🔧 Khôi phục ảnh sản phẩm từ thư mục image/...\n');

    let ok = 0, fail = 0;
    for (const item of IMAGE_MAP) {
        const result = await uploadAndUpdate(item);
        if (result) ok++; else fail++;
    }

    console.log(`\n✅ Hoàn tất: ${ok} thành công, ${fail} lỗi`);
    await prisma.$disconnect();
})();
