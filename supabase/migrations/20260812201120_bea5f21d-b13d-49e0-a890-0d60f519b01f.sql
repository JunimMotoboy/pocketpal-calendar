CREATE TYPE public.audit_event AS ENUM (
  'login','login_failed','logout','password_reset','permission_change','sensitive_data_access','data_export','account_suspension','profile_update'
);

CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  actor_email text,
  event public.audit_event NOT NULL,
  description text NOT NULL,
  resource text,
  target_user_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  ip_address text,
  user_agent text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users insert own audit logs"
ON public.audit_logs FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users read own audit logs"
ON public.audit_logs FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "admins read all audit logs"
ON public.audit_logs FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_audit_logs_user_created ON public.audit_logs (user_id, created_at DESC);
CREATE INDEX idx_audit_logs_event ON public.audit_logs (event);
CREATE INDEX idx_audit_logs_created ON public.audit_logs (created_at DESC);