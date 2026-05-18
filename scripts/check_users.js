const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://neondb_owner:npg_PbHwD3ft0eYV@ep-aged-term-aorltpcp-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require'
    }
  }
});

async function main() {
  const users = await prisma.user.findMany();
  console.log(JSON.stringify(users, null, 2));
  console.log('\n--- TOTAL:', users.length, 'users ---');
  
  // Check for null/empty fields
  users.forEach(u => {
    const missing = [];
    if (!u.phone) missing.push('phone');
    if (!u.address) missing.push('address');
    if (missing.length > 0) {
      console.log(`User #${u.id_user} (${u.username}) - MISSING: ${missing.join(', ')}`);
    }
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
