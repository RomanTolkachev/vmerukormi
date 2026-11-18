import { listArchive, restoreRecord } from "@backend/http/archive/handlers";
import { withRequestAudit } from "@backend/http/request-handler";

export const GET = withRequestAudit(listArchive);
export const POST = withRequestAudit(restoreRecord);
