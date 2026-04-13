# Supabase Setup

## Security first

- Do not use the Supabase secret key in browser code.
- Do not commit real Supabase keys to git.
- Keep `assets/js/supabase-config.js` keyless in the repository.
- Use `assets/js/supabase-config.example.js` as the template for your real values.

## 1) Apply database schema

1. Open your Supabase project SQL editor.
2. Paste and run the file at [supabase/schema.sql](supabase/schema.sql).

## 2) Auth settings

1. In Authentication > Providers, ensure Email provider is enabled.
2. In Authentication > URL Configuration, add your site URL.
3. If you want instant login after signup, disable email confirmation.

## 3) Front-end config

Supabase config is stored in [assets/js/supabase-config.js](assets/js/supabase-config.js).

- URL: set your project URL locally before deployment
- publishableKey: set your publishable key locally before deployment

## 4) Tables used by the app

- profiles
- clients
- invoices

## 5) Hosting notes

- Host as static files.
- Ensure clean paths like /invoice/, /help/, /history/, and /guide/ are supported by your host.
