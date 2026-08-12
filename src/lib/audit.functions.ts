import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const eventEnum = z.enum([
  "login",
  "login_failed",
  "logout",
  "password_reset",
  "permission_change",
  "sensitive_data_access",
  "data_export",
  "account_suspension",
  "profile_update",
]);

export const recordAuditEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        event: eventEnum,
        description: z.string().min(1).max(300),
        resource: z.string().max(120).optional(),
        targetUserId: z.string().uuid().optional(),
        metadata: z.record(z.string(), z.unknown()).optional(),
      })
      .parse(d)
  )
  .handler(async ({ context, data }) => {
    const ip =
      getRequestHeader("cf-connecting-ip") ??
      getRequestHeader("x-forwarded-for")?.split(",")[0]?.trim() ??
      null;
    const { error } = await context.supabase.from("audit_logs").insert({
      user_id: context.userId,
      actor_email: (context.claims as { email?: string }).email ?? null,
      event: data.event,
      description: data.description,
      resource: data.resource ?? null,
      target_user_id: data.targetUserId ?? null,
      metadata: (data.metadata ?? {}) as Record<string, never>,
      ip_address: ip,
      user_agent: getRequestHeader("user-agent") ?? null,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listAuditLogs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        event: eventEnum.optional(),
        userId: z.string().uuid().optional(),
        search: z.string().max(120).optional(),
        days: z.number().int().min(1).max(365).default(30),
        limit: z.number().int().min(1).max(500).default(200),
      })
      .parse(d ?? {})
  )
  .handler(async ({ context, data }) => {
    const { data: adminRow } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    const isAdmin = !!adminRow;

    const since = new Date(Date.now() - data.days * 86400000).toISOString();
    let query = context.supabase
      .from("audit_logs")
      .select(
        "id, user_id, actor_email, event, description, resource, target_user_id, ip_address, user_agent, created_at"
      )
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(data.limit);

    if (!isAdmin) query = query.eq("user_id", context.userId);
    else if (data.userId) query = query.eq("user_id", data.userId);
    if (data.event) query = query.eq("event", data.event);
    if (data.search) query = query.ilike("description", `%${data.search}%`);

    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    return { isAdmin, logs: rows ?? [] };
  });
