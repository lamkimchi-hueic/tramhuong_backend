/**
 * Đồng bộ dữ liệu từ MySQL local → Neon (PostgreSQL)
 *
 * Yêu cầu trong server/.env:
 *   MYSQL_URL=mysql://user:pass@localhost:3306/tram_huong
 *   DATABASE_URL=postgresql://...neon...   (đã có sẵn cho Prisma)
 *
 * Cách chạy:
 *   1. Đảm bảo schema Neon đã được tạo: npx prisma db push
 *   2. node scripts/sync-mysql-to-neon.js
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../server/.env') });

const mysql = require('mysql2/promise');
const { PrismaClient } = require('@prisma/client');

const MYSQL_URL = process.env.MYSQL_URL;
const NEON_URL = process.env.DATABASE_URL;

if (!MYSQL_URL) {
    console.error('Thiếu MYSQL_URL trong server/.env');
    process.exit(1);
}
if (!NEON_URL || !NEON_URL.startsWith('postgres')) {
    console.error('DATABASE_URL phải trỏ tới Neon (postgresql://...)');
    process.exit(1);
}

const prisma = new PrismaClient();

const log = (msg) => console.log(`[sync] ${msg}`);

// Helper: convert MySQL tinyint(1) -> boolean
const toBool = (v) => (v === null || v === undefined ? null : Boolean(v));

async function fetchAll(conn, table) {
    const [rows] = await conn.query(`SELECT * FROM \`${table}\``);
    return rows;
}

async function main() {
    log('Kết nối MySQL local...');
    const mysqlConn = await mysql.createConnection(MYSQL_URL);
    log('Kết nối Neon (qua Prisma)...');
    await prisma.$connect();

    // ========== 1. Đọc data từ MySQL ==========
    log('Đọc dữ liệu từ MySQL...');
    const users = await fetchAll(mysqlConn, 'Users');
    const categories = await fetchAll(mysqlConn, 'categories');
    const products = await fetchAll(mysqlConn, 'Products');
    let variants = [];
    try { variants = await fetchAll(mysqlConn, 'product_variants'); } catch { log('  (bỏ qua product_variants - chưa có)'); }
    const orders = await fetchAll(mysqlConn, 'orders');
    const productOrders = await fetchAll(mysqlConn, 'products_orders');
    let settings = [];
    try { settings = await fetchAll(mysqlConn, 'site_settings'); } catch { log('  (bỏ qua site_settings - chưa có)'); }

    log(`  Users: ${users.length}, Categories: ${categories.length}, Products: ${products.length}`);
    log(`  Variants: ${variants.length}, Orders: ${orders.length}, ProductOrders: ${productOrders.length}, Settings: ${settings.length}`);

    // ========== 2. MERGE (insert-only) theo thứ tự FK ==========
    // Chỉ insert khi ID chưa tồn tại trên Neon. Bỏ qua nếu đã có (KHÔNG update).

    const insertResult = (label, r) => log(`  ${label}: thêm mới ${r.count}, bỏ qua ${r.skipped}`);

    // Helper: lấy danh sách ID đã có trên Neon, lọc rows mới, rồi createMany
    const insertNew = async (modelName, rows, idField, mapRow) => {
        if (!rows.length) return { count: 0, skipped: 0 };
        const existing = await prisma[modelName].findMany({ select: { [idField]: true } });
        const existingIds = new Set(existing.map(r => r[idField]));
        const toInsert = rows.filter(r => !existingIds.has(r[idField])).map(mapRow);
        if (!toInsert.length) return { count: 0, skipped: rows.length };
        const res = await prisma[modelName].createMany({ data: toInsert, skipDuplicates: true });
        return { count: res.count, skipped: rows.length - res.count };
    };

    log('Insert Users (chưa có)...');
    insertResult('Users', await insertNew('user', users, 'id_user', u => ({
        id_user: u.id_user, username: u.username, password: u.password,
        phone: u.phone, address: u.address, role: u.role,
        createdAt: u.createdAt, updatedAt: u.updatedAt, deletedAt: u.deletedAt,
    })));

    log('Insert Categories (chưa có)...');
    insertResult('Categories', await insertNew('category', categories, 'id_category', c => ({
        id_category: c.id_category, category_name: c.category_name, image_url: c.image_url ?? null,
        createdAt: c.createdAt, updatedAt: c.updatedAt, deletedAt: c.deletedAt,
    })));

    log('Insert Products (chưa có)...');
    insertResult('Products', await insertNew('product', products, 'id_product', p => ({
        id_product: p.id_product, product_name: p.product_name, product_price: p.product_price,
        id_category: p.id_category, product_status: toBool(p.product_status), image_url: p.image_url,
        createdAt: p.createdAt, updatedAt: p.updatedAt, deletedAt: p.deletedAt,
    })));

    if (variants.length) {
        log('Insert ProductVariants (chưa có)...');
        insertResult('Variants', await insertNew('productVariant', variants, 'id_variant', v => ({
            id_variant: v.id_variant, id_product: v.id_product, size: v.size,
            price: v.price, stock: v.stock, createdAt: v.createdAt, updatedAt: v.updatedAt,
        })));
    }

    log('Insert Orders (chưa có)...');
    insertResult('Orders', await insertNew('order', orders, 'id_order', o => ({
        id_order: o.id_order, id_user: o.id_user, order_date: o.order_date,
        total_amount: o.total_amount, status: o.status,
        shipping_address: o.shipping_address, shipping_phone: o.shipping_phone,
        createdAt: o.createdAt, updatedAt: o.updatedAt, deletedAt: o.deletedAt,
    })));

    // ProductOrders: composite PK (id_order, id_product) → cần check theo cặp
    log('Insert ProductOrders (chưa có)...');
    {
        const existing = await prisma.productOrder.findMany({ select: { id_order: true, id_product: true } });
        const existingKeys = new Set(existing.map(r => `${r.id_order}_${r.id_product}`));
        const toInsert = productOrders
            .filter(po => !existingKeys.has(`${po.id_order}_${po.id_product}`))
            .map(po => ({
                id_order: po.id_order, id_product: po.id_product,
                product_quantity: po.product_quantity, product_price: po.product_price,
            }));
        if (toInsert.length) {
            const res = await prisma.productOrder.createMany({ data: toInsert, skipDuplicates: true });
            insertResult('ProductOrders', { count: res.count, skipped: productOrders.length - res.count });
        } else {
            insertResult('ProductOrders', { count: 0, skipped: productOrders.length });
        }
    }

    if (settings.length) {
        log('Insert SiteSettings (chưa có)...');
        insertResult('Settings', await insertNew('siteSetting', settings, 'id', s => ({
            id: s.id, key: s.key, value: s.value,
            createdAt: s.createdAt, updatedAt: s.updatedAt,
        })));
    }

    // ========== 4. Reset PostgreSQL sequences (auto-increment) ==========
    log('Reset PostgreSQL sequences...');
    const sequences = [
        { table: 'Users', col: 'id_user' },
        { table: 'categories', col: 'id_category' },
        { table: 'Products', col: 'id_product' },
        { table: 'product_variants', col: 'id_variant' },
        { table: 'orders', col: 'id_order' },
        { table: 'site_settings', col: 'id' },
    ];
    for (const { table, col } of sequences) {
        try {
            await prisma.$executeRawUnsafe(
                `SELECT setval(pg_get_serial_sequence('"${table}"', '${col}'), COALESCE((SELECT MAX("${col}") FROM "${table}"), 1), true)`
            );
        } catch (e) {
            log(`  (bỏ qua sequence ${table}.${col}: ${e.message})`);
        }
    }

    log('✅ Đồng bộ thành công!');
    await mysqlConn.end();
    await prisma.$disconnect();
}

main().catch(async (e) => {
    console.error('❌ Lỗi:', e);
    await prisma.$disconnect();
    process.exit(1);
});
