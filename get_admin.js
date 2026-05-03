const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function getAdmin() {
  try {
    const adminUser = await prisma.user.findFirst({
      where: { role: 'Admin' }
    });
    console.log("Admin user:", adminUser);
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await prisma.$disconnect();
  }
}
getAdmin();
