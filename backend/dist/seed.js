"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcrypt = require("bcryptjs");
const uuid_1 = require("uuid");
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('🌱 Running startup seed/sync...');
    const envPhoneId = process.env.WA_PHONE_NUMBER_ID || '';
    const envWabaId = process.env.WA_WABA_ID || '';
    const verifyToken = process.env.WEBHOOK_VERIFY_TOKEN || 'apple';
    let hotel = await prisma.hotel.findFirst({ where: { deletedAt: null } });
    if (!hotel) {
        console.log('🆕 No hotel found — creating default hotel and admin user...');
        const hotelId = (0, uuid_1.v4)();
        hotel = await prisma.hotel.create({
            data: {
                id: hotelId,
                name: 'Demo Hotel',
                slug: 'demo-hotel',
                phoneNumberId: envPhoneId || 'CONFIGURE_IN_SETTINGS',
                wabaId: envWabaId || 'CONFIGURE_IN_SETTINGS',
                webhookVerifyToken: verifyToken,
                timezone: 'Asia/Kolkata',
                country: 'IN',
                plan: 'STARTER',
                isActive: true,
            },
        });
        const passwordHash = await bcrypt.hash('Admin@123', 12);
        await prisma.user.create({
            data: {
                id: (0, uuid_1.v4)(),
                hotelId: hotel.id,
                email: 'admin@demo.com',
                passwordHash,
                name: 'Admin User',
                role: 'ADMIN',
                isActive: true,
            },
        });
        console.log('─────────────────────────────────────────────────');
        console.log('✅ Default account created!');
        console.log('   Email   : admin@demo.com');
        console.log('   Password: Admin@123');
        console.log('   ⚠️  Change password after first login!');
        console.log('─────────────────────────────────────────────────');
    }
    else {
        console.log(`✅ Hotel exists: "${hotel.name}" (id=${hotel.id})`);
    }
    const needsUpdate = {};
    if (envPhoneId && hotel.phoneNumberId !== envPhoneId) {
        needsUpdate.phoneNumberId = envPhoneId;
        console.log(`🔄 Updating hotel.phoneNumberId: "${hotel.phoneNumberId}" → "${envPhoneId}"`);
    }
    if (envWabaId && hotel.wabaId !== envWabaId) {
        needsUpdate.wabaId = envWabaId;
        console.log(`🔄 Updating hotel.wabaId: "${hotel.wabaId}" → "${envWabaId}"`);
    }
    if (hotel.webhookVerifyToken !== verifyToken) {
        needsUpdate.webhookVerifyToken = verifyToken;
        console.log(`🔄 Updating hotel.webhookVerifyToken → "${verifyToken}"`);
    }
    if (Object.keys(needsUpdate).length > 0) {
        await prisma.hotel.update({ where: { id: hotel.id }, data: needsUpdate });
        console.log('✅ Hotel env vars synced');
    }
    else {
        console.log('✅ Hotel config already up to date');
    }
    const updated = await prisma.hotel.findFirst({ where: { id: hotel.id } });
    console.log('');
    console.log('📋 Current hotel config:');
    console.log(`   phoneNumberId      : ${updated?.phoneNumberId}`);
    console.log(`   wabaId             : ${updated?.wabaId}`);
    console.log(`   webhookVerifyToken : ${updated?.webhookVerifyToken}`);
    console.log('');
    if (!updated?.phoneNumberId || updated.phoneNumberId === 'CONFIGURE_IN_SETTINGS') {
        console.log('⚠️  WARNING: phoneNumberId is not configured!');
        console.log('   Incoming WhatsApp messages will NOT be received.');
        console.log('   Set WA_PHONE_NUMBER_ID in your .env and restart.');
        console.log('   OR go to Settings page and enter it there.');
        console.log('');
    }
}
main()
    .catch((e) => { console.error('Seed error:', e.message); })
    .finally(() => prisma.$disconnect());
//# sourceMappingURL=seed.js.map