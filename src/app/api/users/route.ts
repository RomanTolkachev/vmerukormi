import { listUsers, createUser } from "@backend/http/users/handlers";
import { withRequestAudit } from "@backend/http/request-handler";

export const GET = withRequestAudit(listUsers);
export const POST = withRequestAudit(createUser);
