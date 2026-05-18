const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://neondb_owner:npg_PbHwD3ft0eYV@ep-aged-term-aorltpcp-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require'
    }
  }
});

// Dữ liệu điền vào cho các user còn trống
const fillData = {
  // === ACTIVE users (deletedAt = null) ===
  1:  { address: '45 Nguyễn Huệ, Quận 1, TP.HCM' },                          // nguyen_an: thiếu address
  10: { phone: '0912345678' },                                                  // testuser2: thiếu phone
  11: { phone: '0934567890', address: '78 Hai Bà Trưng, Quận 3, TP.HCM' },     // testuser3: thiếu cả 2
  12: { phone: '0945678901', address: '120 Lý Tự Trọng, Quận 1, TP.HCM' },     // testuser4: thiếu cả 2
  22: { address: '56 Phan Đăng Lưu, Quận Hải Châu, Đà Nẵng' },                // chuong: thiếu address

  // === SOFT-DELETED users (vẫn điền cho đầy đủ) ===
  3:  { address: '23 Trần Hưng Đạo, Quận 5, TP.HCM' },                        // le_chi: thiếu address
  4:  { phone: '0956789012', address: '89 Lê Duẩn, Quận Thanh Khê, Đà Nẵng' }, // pham_dung: thiếu cả 2
  5:  { phone: '0967890123', address: '34 Nguyễn Văn Linh, Quận 7, TP.HCM' },  // hoang_em: thiếu cả 2
  13: { phone: '0978901234', address: '67 Bạch Đằng, Quận Hải Châu, Đà Nẵng' },// testuser5: thiếu cả 2
  15: { phone: '0989012345', address: '12 Lê Lợi, TP. Huế' },                   // test_me_route: thiếu cả 2
  23: { address: '99 Điện Biên Phủ, Quận Thanh Khê, Đà Nẵng' },               // admin1: thiếu address
};

async function main() {
  console.log('=== Bắt đầu điền dữ liệu trống cho Users ===\n');

  for (const [idStr, data] of Object.entries(fillData)) {
    const id = parseInt(idStr);
    try {
      const updated = await prisma.user.update({
        where: { id_user: id },
        data: data,
      });
      console.log(`✅ User #${id} (${updated.username}) → phone: ${updated.phone}, address: ${updated.address}`);
    } catch (err) {
      console.error(`❌ User #${id}: ${err.message}`);
    }
  }

  console.log('\n=== Hoàn tất! Kiểm tra lại: ===\n');

  const users = await prisma.user.findMany({ orderBy: { id_user: 'asc' } });
  users.forEach(u => {
    const missing = [];
    if (!u.phone) missing.push('phone');
    if (!u.address) missing.push('address');
    const status = u.deletedAt ? ' [DELETED]' : '';
    const check = missing.length > 0 ? `⚠️ CÒN TRỐNG: ${missing.join(', ')}` : '✅ Đầy đủ';
    console.log(`User #${u.id_user} (${u.username})${status} → ${check}`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
