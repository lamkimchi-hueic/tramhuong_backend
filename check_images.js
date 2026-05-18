require('dotenv').config({ path: 'server/.env' });
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
    const products = await p.product.findMany({
        select: { id_product: true, product_name: true, image_url: true },
    });
    console.log('=== PRODUCTS ===');
    products.forEach(x => console.log(`#${x.id_product} | ${x.image_url}`));

    const categories = await p.category.findMany({
        select: { id_category: true, category_name: true, image_url: true },
    });
    console.log('\n=== CATEGORIES ===');
    categories.forEach(x => console.log(`#${x.id_category} | ${x.image_url}`));

    await p.$disconnect();
}
main();
