// @ts-nocheck
import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

export const Route = createFileRoute("/api/public/send-fixed-expense-reminders")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const anonKey = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;
        const apiKey = request.headers.get("apikey");
        if (!apiKey || apiKey !== anonKey) {
          return new Response("Unauthorized", { status: 401 });
        }

        const supabase = createClient(
          process.env.SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // Compute "tomorrow" in São Paulo timezone
        const now = new Date();
        const sp = new Date(now.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
        const tomorrow = new Date(sp);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const targetDay = tomorrow.getDate();
        const monthName = tomorrow.toLocaleDateString("pt-BR", { month: "long" });
        const dateLabel = tomorrow.toLocaleDateString("pt-BR");

        const { data: items, error } = await supabase
          .from("fixed_expenses")
          .select("id, name, amount, due_day, notify_email, category")
          .eq("active", true)
          .eq("due_day", targetDay);

        if (error) {
          return Response.json({ error: error.message }, { status: 500 });
        }

        let enqueued = 0;
        for (const it of items ?? []) {
          const amountBRL = Number(it.amount).toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL",
          });
          const messageId = `fixed-reminder-${it.id}-${tomorrow.getFullYear()}-${tomorrow.getMonth() + 1}-${targetDay}`;

          // Idempotency: skip if already sent
          const { data: existing } = await supabase
            .from("email_send_log")
            .select("id")
            .eq("message_id", messageId)
            .in("status", ["sent", "pending"])
            .maybeSingle();
          if (existing) continue;

          const html = `<!doctype html><html><body style="font-family:Arial,sans-serif;background:#fff;padding:24px;color:#111">
            <div style="max-width:560px;margin:0 auto;border:1px solid #eee;border-radius:12px;padding:24px">
              <h1 style="font-size:20px;margin:0 0 12px">Lembrete de despesa fixa</h1>
              <p style="margin:0 0 8px">Olá! Sua despesa <strong>${it.name}</strong> vence amanhã (${dateLabel}).</p>
              <p style="margin:0 0 16px;font-size:24px;font-weight:bold">${amountBRL}</p>
              <p style="margin:0;color:#666;font-size:13px">Categoria: ${it.category} · Dia ${it.due_day} de ${monthName}</p>
            </div>
          </body></html>`;

          const text = `Lembrete: ${it.name} vence amanhã (${dateLabel}). Valor: ${amountBRL}.`;

          const payload = {
            to: it.notify_email,
            from: `Nix Wallet <notificacoes@notify.junimtech.com.br>`,
            sender_domain: "notify.junimtech.com.br",
            subject: `Vence amanhã: ${it.name} (${amountBRL})`,
            html,
            text,
            purpose: "transactional",
            label: "fixed_expense_reminder",
            message_id: messageId,
            idempotency_key: messageId,
            queued_at: new Date().toISOString(),
          };

          await supabase.rpc("enqueue_email", {
            queue_name: "transactional_emails",
            payload,
          });
          await supabase.from("email_send_log").insert({
            message_id: messageId,
            template_name: "fixed_expense_reminder",
            recipient_email: it.notify_email,
            status: "pending",
          });
          enqueued++;
        }

        return Response.json({ enqueued, checked_day: targetDay });
      },
    },
  },
});
