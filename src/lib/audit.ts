import { recordAuditEvent } from "@/lib/audit.functions";

export type AuditEvent =
  | "login"
  | "login_failed"
  | "logout"
  | "password_reset"
  | "permission_change"
  | "sensitive_data_access"
  | "data_export"
  | "account_suspension"
  | "profile_update";

export const AUDIT_LABELS: Record<AuditEvent, string> = {
  login: "Login",
  login_failed: "Login falhou",
  logout: "Logout",
  password_reset: "Redefinição de senha",
  permission_change: "Mudança de permissão",
  sensitive_data_access: "Acesso a dado sensível",
  data_export: "Exportação de dados",
  account_suspension: "Suspensão de conta",
  profile_update: "Atualização de perfil",
};

/** Registra um evento de auditoria sem interromper o fluxo do usuário. */
export async function logAudit(
  event: AuditEvent,
  description: string,
  opts?: { resource?: string; targetUserId?: string; metadata?: Record<string, unknown> }
) {
  try {
    await recordAuditEvent({
      data: {
        event,
        description,
        ...(opts?.resource ? { resource: opts.resource } : {}),
        ...(opts?.targetUserId ? { targetUserId: opts.targetUserId } : {}),
        ...(opts?.metadata ? { metadata: opts.metadata } : {}),
      },
    });
  } catch {
    // auditoria nunca deve quebrar a experiência
  }
}
