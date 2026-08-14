import "server-only";

import { getCurrentUser } from "@backend/auth/session";
import { dateTime, isVersionCurrent } from "@backend/domain/nutrition/formula-versions";
import { prisma } from "@backend/infrastructure/database/prisma";
import type { CalculationModule, FormulaModuleDetails, FormulaVersion } from "@/entities/module/model/types";

function serializeVersion(version: { id: string; moduleId: string; formula: string; description: string | null; techBegin: Date; techEnd: Date; module: { name: string; species: "CAT" | "DOG" } }): FormulaVersion {
  const now = new Date();
  return {
    id: version.id,
    moduleId: version.moduleId,
    moduleName: version.module.name,
    species: version.module.species,
    formula: version.formula,
    description: version.description,
    techBegin: dateTime(version.techBegin),
    techEnd: dateTime(version.techEnd),
    current: isVersionCurrent(version.techBegin, version.techEnd, now),
  };
}

export async function getActiveCalculationModules(): Promise<CalculationModule[]> {
  const now = new Date();
  const modules = await prisma.module.findMany({
    where: { archived: false },
    include: { versions: { where: { techBegin: { lte: now }, techEnd: { gt: now } }, orderBy: { techBegin: "desc" }, take: 1 } },
    orderBy: { name: "asc" },
  });
  return modules.flatMap((module) => module.versions.map((version) => ({
    id: module.id,
    name: module.name,
    species: module.species,
    formula: version.formula,
    description: version.description,
    techBegin: dateTime(version.techBegin),
    techEnd: dateTime(version.techEnd),
  })));
}

export async function getFormulaVersionsPageData() {
  const user = await getCurrentUser();
  const now = new Date();
  const versions = await prisma.moduleFormulaVersion.findMany({
    where: { techBegin: { lte: now }, techEnd: { gt: now }, module: { archived: false } },
    include: { module: { select: { name: true, species: true } } },
    orderBy: { module: { name: "asc" } },
  });
  return { user, versions: versions.map(serializeVersion) };
}

export async function getFormulaModuleDetails(id: string): Promise<{ user: Awaited<ReturnType<typeof getCurrentUser>>; module: FormulaModuleDetails } | null> {
  const [user, module] = await Promise.all([
    getCurrentUser(),
    prisma.module.findUnique({ where: { id }, include: { versions: { include: { module: { select: { name: true, species: true } } }, orderBy: { techBegin: "desc" } } } }),
  ]);
  if (!module) return null;
  return { user, module: { id: module.id, name: module.name, species: module.species, archived: module.archived, versions: module.versions.map(serializeVersion) } };
}
