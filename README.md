# FairShare Setup

This project uses Supabase for authentication and PostgreSQL storage. To run the
application against your own Supabase project:

1. Create a Supabase project and obtain the values for:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - the connection string for `DATABASE_URL`

2. Edit `.env.local` and set these variables. A sample is provided:

```
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_ANON_KEY=...
DATABASE_URL=postgres://<user>:<password>@<host>:5432/postgres
```

3. Push the database schema to Supabase:

```bash
node db-push.js
```

4. Start the development server:

```bash
npm run dev
```

The app will now connect to Supabase using the credentials defined in
`DATABASE_URL`.

