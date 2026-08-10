import type { TableBaseQuery, UniversalTableListResponse } from "@/shared/ui/universal-table";
import { apiFetch } from "@/shared/api/http";
export type WorkspaceRow = Record<string, unknown> & { id:string };
export async function getWorkspaceRows(resource:string,query:TableBaseQuery){const p=new URLSearchParams(Object.entries(query).filter(([,v])=>v!==undefined).map(([k,v])=>[k,String(v)]));const r=await fetch(`/api/workspace/${resource}?${p}`);if(!r.ok)throw new Error("Не удалось загрузить данные");return r.json() as Promise<UniversalTableListResponse<WorkspaceRow>>}
export async function createWorkspaceRow(resource:string,data:Record<string,unknown>){const r=await apiFetch(`/api/workspace/${resource}`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(data)});if(!r.ok)throw new Error("Не удалось сохранить запись");return r.json()}
export async function deleteWorkspaceRow(resource:string,id:unknown){const r=await apiFetch(`/api/workspace/${resource}/${String(id)}`,{method:"DELETE"});if(!r.ok)throw new Error("Не удалось удалить запись")}
