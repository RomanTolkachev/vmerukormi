import { prisma } from "../infrastructure/database/prisma";

async function main() {
  const pets = await prisma.pet.findMany({
    include: {
      breed: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  console.dir(pets, { depth: null });
}

main()
  .catch((error: unknown) => {
    console.error("Не удалось получить данные:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
