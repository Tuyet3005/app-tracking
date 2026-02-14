# To develop

Run `npm run dev` to start the development server with auto reload. Make sure all dependencies are installed by running `npm install` first. The command automatically reload on code file changes, so don't try to restart the process by killing it. If there are already process running on port 3000, it means the user already started the dev server, so you can skip starting yourself.

# When updating database schema

Update `db/schema.ts` to reflect the new schema. If there are new table added that's contain critical information, also add them to the `backupTables` object. After making schema changes, run `npm run db:generate` to generate the new migration file, and `npm run db:migrate` to apply it to the database. Always use the `db/schema.ts` as the single source of truth for database schema, never attempt to do manual changes to the database. The command may needs manual confirmation (for renaming/dropping tables) to prevent accidental data loss, so make sure to read the prompt carefully before confirming.
