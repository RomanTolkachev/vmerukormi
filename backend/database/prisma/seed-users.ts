import { PrismaClient } from "@prisma/client";
import { randomBytes, scryptSync } from "node:crypto";
import { pathToFileURL } from "node:url";

export async function seedTestUsers(prisma: PrismaClient) {
  for (const number of [1, 2]) {
    const salt = randomBytes(16).toString("base64url");
    const passwordHash = "scrypt$" + salt + "$" + scryptSync("123456", salt, 64).toString("base64url");
    const id = "seed-user-" + number;
    await prisma.user.upsert({
      where: { id }, update: {},
      create: { id, username: id, name: "Тестовый пользователь " + number, email: "user" + number + "@vetenergy.test", passwordHash, role: "USER" },
    });
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const prisma = new PrismaClient();
  seedTestUsers(prisma).then(() => console.log("Тестовые пользователи созданы; существующие пароли не изменены."))
    .catch(() => { console.error("Не удалось создать тестовых пользователей"); process.exitCode = 1; })
    .finally(() => prisma.$disconnect());
}
