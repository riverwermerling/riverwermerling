-- Schedule the reminder function every 15 minutes.
-- Prerequisites (Dashboard -> Database -> Extensions): enable pg_cron and pg_net.
-- Store the secrets once (replace the placeholders), then schedule the job.

select vault.create_secret('https://YOUR-PROJECT-REF.supabase.co', 'project_url');
select vault.create_secret('YOUR-SERVICE-ROLE-KEY',               'service_role_key');

select cron.schedule(
  'french-drill-reminders',
  '*/15 * * * *',
  $$
  select net.http_post(
    url     := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/send-reminders',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
    ),
    body    := '{}'::jsonb
  );
  $$
);

-- To stop:  select cron.unschedule('french-drill-reminders');
