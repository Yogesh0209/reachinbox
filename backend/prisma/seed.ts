import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  const user = await prisma.user.upsert({
    where: { email: 'demo@reachinbox.dev' },
    update: {},
    create: {
      name: 'Demo User',
      email: 'demo@reachinbox.dev',
      avatar: null,
    },
  });

  console.log('Created demo user:', user.email);

  const sender = await prisma.sender.upsert({
    where: { userId_email: { userId: user.id, email: 'sender@reachinbox.dev' } },
    update: {},
    create: {
      userId: user.id,
      name: 'ReachInbox Sender',
      email: 'sender@reachinbox.dev',
      hourlyLimit: 100,
      delaySeconds: 2,
    },
  });

  console.log('Created demo sender:', sender.email);
  console.log('Seed completed.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
