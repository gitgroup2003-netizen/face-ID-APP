# GIT GROUP — Backend Package

## 1. Run the SQL first
Open your Supabase project → SQL Editor → New query → paste the entire
contents of `gitgroup_supabase_schema.sql` → Run.

This creates:
- schools, roles, profiles (accounts), children, guardians, guardian_child, scan_logs
- Row Level Security so each school only sees its own data
- A reserved "creator" role that bypasses school-scoping (for Frank Ssemakula / troubleshooting)
- Storage buckets: guardian-photos, child-photos, scan-captures, school-logos

## 2. Add the reports engine
Copy `src/lib/reports.ts` into your project's `src/lib/` folder.

Then install its dependencies:
    npm install xlsx docx file-saver
    npm install -D @types/file-saver

## 3. Connect Supabase in your app
    npm install @supabase/supabase-js

    // src/lib/supabase.ts
    import { createClient } from '@supabase/supabase-js'
    export const supabase = createClient(
      'https://psdlpmlqlzvnyzbvelbp.supabase.co',
      'sb_publishable_ju6735Jfn4qt6K3RlG5Dsw_SmGVy1Cw'
    )

Never expose your service_role key in frontend code — only the
publishable key above belongs in the browser.
