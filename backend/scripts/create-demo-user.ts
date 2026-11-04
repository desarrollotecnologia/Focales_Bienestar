import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const username = 'prueba.local';
  const password = 'PruebaLocal2026*';
  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.upsert({
    where: { username },
    update: {
      passwordHash,
      fullName: 'Usuario de Prueba Local',
      email: 'prueba.local@focales.demo',
      role: 'ADMIN',
      active: true,
    },
    create: {
      username,
      passwordHash,
      fullName: 'Usuario de Prueba Local',
      email: 'prueba.local@focales.demo',
      role: 'ADMIN',
      active: true,
    },
  });

  console.log(`OK ${user.username}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
