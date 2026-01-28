import bcrypt from "bcryptjs";
import { PrismaClient, GlobalRole } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const teams = ["U19 herrelandsholdet", "U17 herrelandsholdet"];

  for (const name of teams) {
    await prisma.team.upsert({
      where: { name },
      update: {
        themePrimary: "RED",
        themeSecondary: "WHITE",
      },
      create: {
        name,
        themePrimary: "RED",
        themeSecondary: "WHITE",
      },
    });
  }

  const adminEmail = process.env.ADMIN_EMAIL ?? "admin@floorball.local";
  const adminPassword = process.env.ADMIN_PASSWORD ?? "SkiftMig123!";
  const passwordHash = await bcrypt.hash(adminPassword, 12);

  const desiredUsername = "admin";
  const existingByUsername = await prisma.user.findUnique({
    where: { username: desiredUsername },
  });

  if (!existingByUsername) {
    await prisma.user.create({
      data: {
        globalRole: GlobalRole.ADMIN,
        email: adminEmail,
        username: desiredUsername,
        passwordHash,
      },
    });
    return;
  }

  const emailOwner = await prisma.user.findUnique({
    where: { email: adminEmail },
    select: { id: true },
  });

  const canSetEmail = !emailOwner || emailOwner.id === existingByUsername.id;

  await prisma.user.update({
    where: { id: existingByUsername.id },
    data: {
      globalRole: GlobalRole.ADMIN,
      passwordHash,
      ...(canSetEmail ? { email: adminEmail } : {}),
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
