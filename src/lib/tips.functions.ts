import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const InputSchema = z.object({
  expenses: z
    .array(
      z.object({
        category: z.string(),
        amount: z.number(),
        description: z.string(),
        spent_on: z.string(),
      })
    )
    .max(500),
});

export const getFinancialTips = createServerFn({ method: "POST" })
  .inputValidator((d) => InputSchema.parse(d))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      return { tips: "", error: "AI não configurada." };
    }

    // Aggregate by category to keep prompt short
    const byCat: Record<string, number> = {};
    let total = 0;
    for (const e of data.expenses) {
      byCat[e.category] = (byCat[e.category] ?? 0) + e.amount;
      total += e.amount;
    }
    const summary = Object.entries(byCat)
      .sort((a, b) => b[1] - a[1])
      .map(([c, v]) => `- ${c}: R$ ${v.toFixed(2)}`)
      .join("\n");

    const userPrompt =
      data.expenses.length === 0
        ? "Ainda não há gastos registrados. Dê 4 dicas iniciais de organização financeira pessoal para quem está começando."
        : `Resumo dos gastos do usuário (total R$ ${total.toFixed(2)}):\n${summary}\n\nAnalise estes gastos e dê 4 a 6 dicas práticas, personalizadas e acionáveis em português para o usuário economizar e usar melhor o dinheiro. Seja direto, use bullet points em markdown e destaque valores quando relevante.`;

    try {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content:
                "Você é um consultor financeiro pessoal brasileiro, amigável e direto. Sempre responda em português do Brasil, em markdown, com dicas curtas e práticas.",
            },
            { role: "user", content: userPrompt },
          ],
        }),
      });

      if (!res.ok) {
        if (res.status === 429) return { tips: "", error: "Muitas requisições. Tente novamente em alguns instantes." };
        if (res.status === 402) return { tips: "", error: "Créditos de IA esgotados no workspace." };
        const t = await res.text();
        console.error("AI gateway error", res.status, t);
        return { tips: "", error: "Não foi possível gerar dicas no momento." };
      }
      const json = await res.json();
      const tips = json.choices?.[0]?.message?.content ?? "";
      return { tips, error: null as string | null };
    } catch (e) {
      console.error("tips error", e);
      return { tips: "", error: "Erro ao chamar a IA." };
    }
  });
