import { withRequestAudit } from "@backend/http/request-handler";
import { mutateWorkspace } from "@backend/http/workspace/handlers";

export const PATCH = withRequestAudit(mutateWorkspace);
export const DELETE = withRequestAudit(mutateWorkspace);
