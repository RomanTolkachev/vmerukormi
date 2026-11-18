import { withRequestAudit } from "@backend/http/request-handler";
import { listWorkspace, createWorkspace } from "@backend/http/workspace/handlers";

export const GET = withRequestAudit(listWorkspace);
export const POST = withRequestAudit(createWorkspace);
