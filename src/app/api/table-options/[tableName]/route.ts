import { withRequestAudit } from "@backend/http/request-handler";
import { getTableOptions, putTableOptions } from "@backend/http/table-options/handlers";

export const GET = withRequestAudit(getTableOptions);
export const PUT = withRequestAudit(putTableOptions);
