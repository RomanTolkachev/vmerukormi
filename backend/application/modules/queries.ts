import "server-only";
import { getCurrentUser, type AuthUser } from "@backend/auth/session";
import { prisma } from "@backend/infrastructure/database/prisma";
import { isVersionCurrent } from "@backend/domain/nutrition/formula-versions";
import { getFormulaTemplate } from "@backend/domain/nutrition/parameters";
import type { Module, ModuleFormulaVersion } from "@prisma/client";
import type { CalculationModule, FormulaModuleDetails, FormulaVersion } from "@/entities/module";

function serialize(version: ModuleFormulaVersion, module: Module): FormulaVersion {
  return { id: version.id, versionId: version.id, moduleId: module.id, moduleName: version.nameSnapshot || module.name,
    name: version.nameSnapshot || module.name, species: module.species, speciesCodes: version.speciesCodes,
    formula: version.formula, description: version.description, templateKey: version.templateKey,
    techBegin: version.techBegin.toISOString(), techEnd: version.techEnd.toISOString(),
    current: isVersionCurrent(version.techBegin, version.techEnd) };
}
export async function getActiveCalculationModules(providedUser?: AuthUser): Promise<CalculationModule[]> {
  const user = providedUser ?? await getCurrentUser();
  if (!user) return [];
  const now = new Date();
  const modules = await prisma.module.findMany({ where: { archived: false }, include: { versions: { where: { templateKey: { not: null }, techBegin: { lte: now }, techEnd: { gt: now } }, orderBy: { techBegin: "desc" }, take: 1 } }, orderBy: { name: "asc" } });
  return modules.flatMap(module => module.versions.filter(version => getFormulaTemplate(version.templateKey)?.formula === version.formula).map(version => ({ ...serialize(version, module), id: module.id })));
}
export async function getFormulaVersionsPageData() {
  const user = await getCurrentUser();
  if (!user) return { user, versions: [] };
  const now = new Date();
  const versions = await prisma.moduleFormulaVersion.findMany({ where: { techBegin: { lte: now }, techEnd: { gt: now }, module: { deletedAt: null, archived: false } }, include: { module: true }, orderBy: { module: { name: "asc" } } });
  return { user, versions: versions.map(version => serialize(version, version.module)) };
}
export async function getFormulaModuleDetails(id: string): Promise<{ module: FormulaModuleDetails } | null> {
  if (!await getCurrentUser()) return null;
  const record = await prisma.module.findFirst({ where: { id }, include: { versions: { orderBy: { techBegin: "desc" } } } });
  if (!record) return null;
  return { module: { id, name: record.name, species: record.species, speciesCodes: record.speciesCodes, archived: record.archived, versions: record.versions.map(version => serialize(version, record)) } };
}
