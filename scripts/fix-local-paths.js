/**
 * Script dọn dẹp các đường dẫn cục bộ (/uploads/...) trong database.
 * Thích hợp để chạy ở local dev hoặc trước khi deploy.
 */
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../server/.env') });
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
    console.log('🧹 Bắt đầu dọn dẹp các đường dẫn cục bộ trong database...');
    let updatedSettingsCount = 0;
    let updatedProductsCount = 0;
    let updatedCategoriesCount = 0;

    try {
        // 1. Site Settings
        const settings = await prisma.siteSetting.findMany();
        for (const setting of settings) {
            if (setting.value && setting.value.startsWith('/uploads/')) {
                let newValue = '';
                if (setting.key === 'hero_image_url') {
                    newValue = 'https://res.cloudinary.com/dcywlpxwi/image/upload/v1778780041/tramhuong/assets/thac.jpg';
                } else if (setting.key === 'logo_url') {
                    newValue = ''; // Trống để kích hoạt logo SVG mặc định
                }
                
                await prisma.siteSetting.update({
                    where: { id: setting.id },
                    data: { value: newValue }
                });
                updatedSettingsCount++;
                console.log(`  [setting] Reset ${setting.key} thành: "${newValue}"`);
            }
        }

        // 2. Products
        const products = await prisma.product.findMany();
        for (const product of products) {
            if (product.image_url && product.image_url.startsWith('/uploads/')) {
                const placeholder = 'https://images.unsplash.com/photo-1545048702-79362596cdc9?auto=format&fit=crop&w=1200&q=85';
                await prisma.product.update({
                    where: { id_product: product.id_product },
                    data: { image_url: placeholder }
                });
                updatedProductsCount++;
                console.log(`  [product] Reset ảnh sản phẩm "${product.product_name}" về placeholder`);
            }
        }

        // 3. Categories
        const categories = await prisma.category.findMany();
        for (const category of categories) {
            if (category.image_url && category.image_url.startsWith('/uploads/')) {
                const placeholder = 'https://images.unsplash.com/photo-1545048702-79362596cdc9?auto=format&fit=crop&w=1200&q=85';
                await prisma.category.update({
                    where: { id_category: category.id_category },
                    data: { image_url: placeholder }
                });
                updatedCategoriesCount++;
                console.log(`  [category] Reset ảnh danh mục "${category.category_name}" về placeholder`);
            }
        }

        console.log('\n✅ Dọn dẹp hoàn tất!');
        console.log(`- Cài đặt đã sửa: ${updatedSettingsCount}`);
        console.log(`- Sản phẩm đã sửa: ${updatedProductsCount}`);
        console.log(`- Danh mục đã sửa: ${updatedCategoriesCount}`);
    } catch (error) {
        console.error('❌ Lỗi dọn dẹp:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
