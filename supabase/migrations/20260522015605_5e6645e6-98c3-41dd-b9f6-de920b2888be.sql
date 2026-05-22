CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

SELECT cron.unschedule('fixed-expense-daily-reminders')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'fixed-expense-daily-reminders');

SELECT cron.schedule(
  'fixed-expense-daily-reminders',
  '0 12 * * *',
  $$
  SELECT net.http_post(
    url := 'https://project--6a117670-d4c9-4ae9-9a27-de73756f4fbc.lovable.app/api/public/send-fixed-expense-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV5YnRsb3NwaXh3ZGNmY3N5bmxoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2NzE2NzMsImV4cCI6MjA5MzI0NzY3M30.NGwHUo4YzcKV8rmU6_drdJV-GQKxlFwzhD2N4fMqLXo'
    ),
    body := '{}'::jsonb
  );
  $$
);