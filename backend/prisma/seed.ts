import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD must be set to seed the first admin');
  }

  const admin = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      name: process.env.ADMIN_NAME ?? 'Administrator',
      email,
      password: await bcrypt.hash(password, 12),
      role: Role.ADMIN,
    },
  });
  console.log(`Admin account ready: ${admin.email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
