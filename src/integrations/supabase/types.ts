export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      card_installment_payments: {
        Row: {
          created_at: string
          id: string
          installment_id: string
          month_key: string
          paid_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          installment_id: string
          month_key: string
          paid_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          installment_id?: string
          month_key?: string
          paid_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "card_installment_payments_installment_id_fkey"
            columns: ["installment_id"]
            isOneToOne: false
            referencedRelation: "card_installments"
            referencedColumns: ["id"]
          },
        ]
      }
      card_installments: {
        Row: {
          card_id: string
          created_at: string
          description: string
          id: string
          installment_value: number
          remaining_count: number
          start_month: string
          user_id: string
        }
        Insert: {
          card_id: string
          created_at?: string
          description: string
          id?: string
          installment_value: number
          remaining_count?: number
          start_month?: string
          user_id: string
        }
        Update: {
          card_id?: string
          created_at?: string
          description?: string
          id?: string
          installment_value?: number
          remaining_count?: number
          start_month?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "card_installments_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
        ]
      }
      card_invoice_payments: {
        Row: {
          amount: number
          card_id: string
          created_at: string
          id: string
          month_key: string
          paid_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          card_id: string
          created_at?: string
          id?: string
          month_key: string
          paid_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          card_id?: string
          created_at?: string
          id?: string
          month_key?: string
          paid_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "card_invoice_payments_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
        ]
      }
      cards: {
        Row: {
          closing_day: number | null
          created_at: string
          due_day: number
          id: string
          initial_used: number
          limit_amount: number
          name: string
          notes: string | null
          user_id: string
        }
        Insert: {
          closing_day?: number | null
          created_at?: string
          due_day: number
          id?: string
          initial_used?: number
          limit_amount?: number
          name: string
          notes?: string | null
          user_id: string
        }
        Update: {
          closing_day?: number | null
          created_at?: string
          due_day?: number
          id?: string
          initial_used?: number
          limit_amount?: number
          name?: string
          notes?: string | null
          user_id?: string
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          card_id: string | null
          category: Database["public"]["Enums"]["expense_category"]
          created_at: string
          description: string
          id: string
          installments: number
          notes: string | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          spent_on: string
          user_id: string
        }
        Insert: {
          amount: number
          card_id?: string | null
          category?: Database["public"]["Enums"]["expense_category"]
          created_at?: string
          description: string
          id?: string
          installments?: number
          notes?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"]
          spent_on?: string
          user_id: string
        }
        Update: {
          amount?: number
          card_id?: string | null
          category?: Database["public"]["Enums"]["expense_category"]
          created_at?: string
          description?: string
          id?: string
          installments?: number
          notes?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"]
          spent_on?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
        ]
      }
      fixed_expense_payments: {
        Row: {
          created_at: string
          fixed_expense_id: string
          id: string
          month: number
          paid_on: string
          user_id: string
          year: number
        }
        Insert: {
          created_at?: string
          fixed_expense_id: string
          id?: string
          month: number
          paid_on?: string
          user_id: string
          year: number
        }
        Update: {
          created_at?: string
          fixed_expense_id?: string
          id?: string
          month?: number
          paid_on?: string
          user_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "fixed_expense_payments_fixed_expense_id_fkey"
            columns: ["fixed_expense_id"]
            isOneToOne: false
            referencedRelation: "fixed_expenses"
            referencedColumns: ["id"]
          },
        ]
      }
      fixed_expenses: {
        Row: {
          active: boolean
          amount: number
          category: Database["public"]["Enums"]["expense_category"]
          created_at: string
          due_day: number
          id: string
          last_notified_for: string | null
          name: string
          notes: string | null
          notify_email: string
          user_id: string
        }
        Insert: {
          active?: boolean
          amount: number
          category?: Database["public"]["Enums"]["expense_category"]
          created_at?: string
          due_day: number
          id?: string
          last_notified_for?: string | null
          name: string
          notes?: string | null
          notify_email: string
          user_id: string
        }
        Update: {
          active?: boolean
          amount?: number
          category?: Database["public"]["Enums"]["expense_category"]
          created_at?: string
          due_day?: number
          id?: string
          last_notified_for?: string | null
          name?: string
          notes?: string | null
          notify_email?: string
          user_id?: string
        }
        Relationships: []
      }
      goal_contributions: {
        Row: {
          amount: number
          contributed_on: string
          created_at: string
          goal_id: string
          id: string
          user_id: string
        }
        Insert: {
          amount: number
          contributed_on?: string
          created_at?: string
          goal_id: string
          id?: string
          user_id: string
        }
        Update: {
          amount?: number
          contributed_on?: string
          created_at?: string
          goal_id?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      goals: {
        Row: {
          completed: boolean
          created_at: string
          current_amount: number
          frequency: Database["public"]["Enums"]["goal_frequency"]
          id: string
          name: string
          target_amount: number
          user_id: string
        }
        Insert: {
          completed?: boolean
          created_at?: string
          current_amount?: number
          frequency?: Database["public"]["Enums"]["goal_frequency"]
          id?: string
          name: string
          target_amount: number
          user_id: string
        }
        Update: {
          completed?: boolean
          created_at?: string
          current_amount?: number
          frequency?: Database["public"]["Enums"]["goal_frequency"]
          id?: string
          name?: string
          target_amount?: number
          user_id?: string
        }
        Relationships: []
      }
      incomes: {
        Row: {
          amount: number
          created_at: string
          description: string
          id: string
          notes: string | null
          received_on: string
          source: Database["public"]["Enums"]["income_source"]
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description: string
          id?: string
          notes?: string | null
          received_on?: string
          source?: Database["public"]["Enums"]["income_source"]
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string
          id?: string
          notes?: string | null
          received_on?: string
          source?: Database["public"]["Enums"]["income_source"]
          user_id?: string
        }
        Relationships: []
      }
      investments: {
        Row: {
          amount: number
          created_at: string
          expected_return: number | null
          id: string
          invested_on: string
          name: string
          notes: string | null
          type: Database["public"]["Enums"]["investment_type"]
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          expected_return?: number | null
          id?: string
          invested_on?: string
          name: string
          notes?: string | null
          type?: Database["public"]["Enums"]["investment_type"]
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          expected_return?: number | null
          id?: string
          invested_on?: string
          name?: string
          notes?: string | null
          type?: Database["public"]["Enums"]["investment_type"]
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "user"
      expense_category:
        | "comida"
        | "contas"
        | "diversao"
        | "transporte"
        | "saude"
        | "educacao"
        | "compras"
        | "moradia"
        | "outros"
      goal_frequency: "diaria" | "semanal" | "quinzenal" | "mensal"
      income_source:
        | "salario"
        | "freelance"
        | "vendas"
        | "presente"
        | "reembolso"
        | "rendimento"
        | "outros"
      investment_type:
        | "renda_fixa"
        | "renda_variavel"
        | "cripto"
        | "fundos"
        | "tesouro"
        | "poupanca"
        | "imoveis"
        | "outros"
      payment_method:
        | "dinheiro"
        | "debito"
        | "credito"
        | "pix"
        | "boleto"
        | "transferencia"
        | "outros"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
      expense_category: [
        "comida",
        "contas",
        "diversao",
        "transporte",
        "saude",
        "educacao",
        "compras",
        "moradia",
        "outros",
      ],
      goal_frequency: ["diaria", "semanal", "quinzenal", "mensal"],
      income_source: [
        "salario",
        "freelance",
        "vendas",
        "presente",
        "reembolso",
        "rendimento",
        "outros",
      ],
      investment_type: [
        "renda_fixa",
        "renda_variavel",
        "cripto",
        "fundos",
        "tesouro",
        "poupanca",
        "imoveis",
        "outros",
      ],
      payment_method: [
        "dinheiro",
        "debito",
        "credito",
        "pix",
        "boleto",
        "transferencia",
        "outros",
      ],
    },
  },
} as const
