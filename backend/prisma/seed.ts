/**
 * Prisma Seed Script
 * Creates a default hotel + admin user if none exist.
 * Run: npx ts-node prisma/seed.ts
 * Or:  docker-compose exec backend node_modules/.bin/ts-node prisma/seed.ts
 */

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Check if any hotel already exists
  const existingHotel = await prisma.hotel.findFirst({ where: { deletedAt: null } });

  if (existingHotel) {
    console.log(`✅ Hotel already exists: "${existingHotel.name}" — skipping seed`);
    return;
  }

  // Create default hotel
  const hotelId = uuidv4();
  const hotel = await prisma.hotel.create({
    data: {
      id: hotelId,
      name: 'Demo Hotel',
      slug: 'demo-hotel',
      phoneNumberId: process.env.WA_PHONE_NUMBER_ID || 'CONFIGURE_IN_SETTINGS',
      wabaId: process.env.WA_WABA_ID || 'CONFIGURE_IN_SETTINGS',
      webhookVerifyToken: process.env.WEBHOOK_VERIFY_TOKEN || 'apple',
      timezone: 'Asia/Kolkata',
      country: 'IN',
      plan: 'STARTER',
      isActive: true,
    },
  });

  console.log(`🏨 Created hotel: "${hotel.name}" (${hotel.id})`);

  // Create admin user
  const passwordHash = await bcrypt.hash('Admin@123', 12);
  const user = await prisma.user.create({
    data: {
      id: uuidv4(),
      hotelId: hotel.id,
      email: 'admin@demo.com',
      passwordHash,
      name: 'Admin User',
      role: 'ADMIN',
      isActive: true,
    },
  });

  console.log(`👤 Created admin user: ${user.email}`);
  console.log('');
  console.log('─────────────────────────────────────────');
  console.log('🔑 DEFAULT LOGIN CREDENTIALS');
  console.log('   Email   : admin@demo.com');
  console.log('   Password: Admin@123');
  console.log('─────────────────────────────────────────');
  console.log('⚠️  Change these credentials after first login!');
  console.log('');
  console.log('✅ Seed complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
