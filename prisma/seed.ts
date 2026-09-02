import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
dotenv.config();

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL || "admin@courierhub.com";
  const adminPassword = process.env.ADMIN_PASSWORD || "Admin@12345";

  const adminHashed = await bcrypt.hash(adminPassword, 12);
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: { name: "Platform Admin", email: adminEmail, password: adminHashed, role: "ADMIN" },
  });
  console.log(`✅ Admin ready: ${admin.email} / ${adminPassword}`);

  const courierHashed = await bcrypt.hash("Courier@123", 12);
  const courier = await prisma.user.upsert({
    where: { email: "courier@courierhub.com" },
    update: {},
    create: { name: "Demo Courier", email: "courier@courierhub.com", password: courierHashed, role: "COURIER" },
  });

  const customerHashed = await bcrypt.hash("Customer@123", 12);
  const customer = await prisma.user.upsert({
    where: { email: "customer@courierhub.com" },
    update: {},
    create: { name: "Demo Customer", email: "customer@courierhub.com", password: customerHashed, role: "CUSTOMER" },
  });

  const hubDhaka = await prisma.hub.upsert({
    where: { id: "00000000-0000-0000-0000-000000000001" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000001",
      name: "Dhaka Central Hub",
      city: "Dhaka",
      address: "Motijheel, Dhaka",
      managerId: admin.id,
    },
  }).catch(async () =>
    prisma.hub.create({
      data: { name: "Dhaka Central Hub", city: "Dhaka", address: "Motijheel, Dhaka", managerId: admin.id },
    })
  );

  const hubChattogram = await prisma.hub.create({
    data: { name: "Chattogram Hub", city: "Chattogram", address: "Agrabad, Chattogram", managerId: admin.id },
  }).catch(() => null);

  console.log(`✅ Seed data created: courier=${courier.email}, customer=${customer.email}, hub=${hubDhaka.name}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
