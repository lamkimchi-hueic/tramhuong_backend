/**
 * Upload ảnh danh mục Trầm Xông từ image/trx.jpg lên Cloudinary và cập nhật DB
 * Usage: cd backend && node scripts/restore_category_images.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', 'server', '.env') });
const cloudinary = require('cloudinary').v2;
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://neondb_owner:npg_PbHwD3ft0eYV@ep-aged-term-aorltpcp-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require'
    }
  }
});

if (!process.env.CLOUDINARY_URL) {
    console.error('❌ Thiếu CLOUDINARY_URL');
    process.exit(1);
}

// Config Cloudinary
cloudinary.config({
    cloudinary_url: process.env.CLOUDINARY_URL
});

const imagePath = path.join(__dirname, '..', '..', 'image', 'trx.jpg');

async function main() {
    console.log('📤 Uploading trx.jpg to Cloudinary...');
    try {
        const res = await cloudinary.uploader.upload(imagePath, {
            folder: 'tramhuong/categories',
            overwrite: true,
            resource_type: 'image',
        });
        const url = res.secure_url;
        console.log(`✓ Cloudinary Upload Success: ${url}`);

        console.log('💾 Updating Category #1 in DB...');
        const updated = await prisma.category.update({
            where: { id_category: 1 },
            data: { image_url: url }
        });
        console.log('✓ Database updated successfully:', updated);
    } catch (e) {
        console.error('❌ Error during upload/update:', e.message);
    }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
