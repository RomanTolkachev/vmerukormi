import { Prisma, PrismaClient } from "@prisma/client";
import { databaseContext } from "./context";
import { redactAudit } from "@backend/domain/audit/redact";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
export const rawPrisma = globalForPrisma.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = rawPrisma;

type Arguments = Record<string, unknown>;
type Row = Record<string, unknown>;
type Delegate = Record<string, (args?: Arguments) => Promise<unknown>>;
const models = Prisma.dmmf.datamodel.models;
const softModels = new Set(models.filter(model => model.fields.some(field => field.name === "deletedAt")).map(model => model.name));
const reads = new Set(["findMany", "findFirst", "findFirstOrThrow", "findUnique", "findUniqueOrThrow", "count", "aggregate", "groupBy"]);
const mutations = new Set(["create", "createMany", "update", "updateMany", "upsert", "delete", "deleteMany"]);

function delegateFor(model: string): Delegate {
  const client = databaseContext.getStore()?.transaction ?? rawPrisma;
  return (client as unknown as Record<string, Delegate>)[model];
}

function nestedSelection(modelName: string, input: Arguments): Arguments {
  const result = { ...input };
  const model = models.find(candidate => candidate.name === modelName);
  for (const selection of ["include", "select"]) {
    if (!input[selection] || typeof input[selection] !== "object") continue;
    const fields = { ...input[selection] as Arguments };
    for (const relation of model?.fields.filter(field => field.kind === "object") ?? []) {
      if (!fields[relation.name]) continue;
      const options = typeof fields[relation.name] === "object" ? fields[relation.name] as Arguments : {};
      const child = nestedSelection(relation.type, options);
      if (relation.isList && softModels.has(relation.type)) child.where = { deletedAt: null, ...child.where as Arguments };
      if (Object.keys(child).length) fields[relation.name] = child;
    }
    if (fields._count && typeof fields._count === "object") {
      const counts = { ...fields._count as Arguments };
      const countSelection = { ...counts.select as Arguments };
      for (const relation of model?.fields.filter(field => field.kind === "object" && field.isList && softModels.has(field.type)) ?? []) {
        if (countSelection[relation.name] === true) countSelection[relation.name] = { where: { deletedAt: null } };
      }
      counts.select = countSelection;
      fields._count = counts;
    }
    result[selection] = fields;
  }
  return result;
}

function plainWhere(modelName: string, where: Arguments = {}): Arguments {
  const model = models.find(candidate => candidate.name === modelName)!;
  const compoundNames = [...model.uniqueFields, ...(model.primaryKey ? [model.primaryKey.fields] : [])].map(fields => fields.join("_"));
  return Object.fromEntries(Object.entries(where).flatMap(([key, value]) => compoundNames.includes(key) ? Object.entries(value as Arguments) : [[key, value]]));
}

function rejectNestedDeletion(value: unknown) {
  if (!value || typeof value !== "object") return;
  for (const [key, nested] of Object.entries(value)) {
    if (key === "delete" || key === "deleteMany") throw new Error("Nested physical deletion of business records is forbidden");
    rejectNestedDeletion(nested);
  }
}

function json(value: unknown) {
  return JSON.parse(JSON.stringify(redactAudit(value))) as Prisma.InputJsonValue;
}

function recordIdentity(modelName: string, row?: Row | null) {
  if (!row) return undefined;
  if (typeof row.id === "string") return row.id;
  const keys = models.find(model => model.name === modelName)?.primaryKey?.fields;
  if (!keys || keys.some(key => row[key] === undefined)) return undefined;
  return JSON.stringify(Object.fromEntries(keys.map(key => [key, row[key]])));
}

export async function auditEvent(action: string, entityType: string, entityId?: string, after?: unknown) {
  const context = databaseContext.getStore();
  const client = context?.transaction ?? rawPrisma;
  await client.auditEvent.create({ data: {
    action, entityType, entityId, actorId: context?.actor?.id, actorEmail: context?.actor?.email,
    requestId: context?.requestId, ...(after === undefined ? {} : { after: json(after) }),
  } });
}

export const prisma: PrismaClient = new Proxy(rawPrisma, {
  get(target, property) {
    if (property === "$transaction") {
      return async (operation: (client: PrismaClient) => Promise<unknown>, options?: Arguments) => {
        if (typeof operation !== "function") throw new Error("Use callback transactions with the audited database client");
        const execute = () => operation(prisma);
        if (databaseContext.getStore()) return execute();
        return target.$transaction(transaction => databaseContext.run({ transaction }, execute), options);
      };
    }
    if (typeof property !== "string") return Reflect.get(target, property);
    const modelName = property[0]?.toUpperCase() + property.slice(1);
    if (!softModels.has(modelName)) {
      const client = databaseContext.getStore()?.transaction ?? target;
      const value = Reflect.get(client, property);
      return typeof value === "function" ? value.bind(client) : value;
    }
    return new Proxy({}, {
      get(_delegate, method) {
        if (typeof method !== "string") return undefined;
        return async (input: Arguments = {}) => {
          const delegate = delegateFor(property);
          const args = nestedSelection(modelName, input);
          if (reads.has(method) || ["update", "updateMany", "delete", "deleteMany"].includes(method)) args.where = { deletedAt: null, ...args.where as Arguments };
          if (!mutations.has(method)) return delegate[method](args);
          for (const key of ["data", "create", "update"]) rejectNestedDeletion(args[key]);
          const context = databaseContext.getStore();
          const before = context?.actor && !method.startsWith("create")
            ? await delegate.findMany({ where: plainWhere(modelName, args.where as Arguments) }) as Row[] : [];
          const softDelete = method === "delete" || method === "deleteMany";
          const operation = softDelete ? method === "delete" ? "update" : "updateMany" : method;
          if (softDelete) {
            const moment = new Date();
            args.data = { deletedAt: moment, deletedById: context?.actor?.id ?? null, ...(["Calculation", "Ration"].includes(modelName) ? { busEnd: moment } : {}) };
          }
          if (["Calculation", "Ration"].includes(modelName) && (args.data as Arguments | undefined)?.deletedAt === null) args.data = { ...args.data as Arguments, busEnd: null };
          const result = await delegate[operation](args);
          const emptyBatch = result && typeof result === "object" && "count" in result && result.count === 0;
          if (context?.actor && !emptyBatch) {
            const row = (Array.isArray(result) ? result[0] : result) as Row | null;
            const id = recordIdentity(modelName, row) ?? (before.length === 1 ? recordIdentity(modelName, before[0]) : undefined);
            const restored = before.some(value => value.deletedAt) && ((args.data ?? args.update) as Arguments | undefined)?.deletedAt === null;
            await context.transaction.auditEvent.create({ data: {
              actorId: context.actor.id, actorEmail: context.actor.email, requestId: context.requestId,
              action: softDelete ? "DELETE" : restored ? "RESTORE" : method.startsWith("create") || (method === "upsert" && !before.length) ? "CREATE" : "UPDATE",
              entityType: modelName, entityId: id,
              before: json(before.length === 1 ? before[0] : before),
              after: json({ record: result, changes: args.data ?? args.update ?? args.create }),
            } });
          }
          return result;
        };
      },
    });
  },
});
