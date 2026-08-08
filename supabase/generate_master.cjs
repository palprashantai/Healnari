const fs = require('fs');
const path = require('path');

const migrationsDir = path.join(__dirname, 'migrations');
const seedPath = path.join(__dirname, 'seed.sql');
const masterPath = path.join(__dirname, 'master_setup.sql');

// Get all migration files
const files = fs.readdirSync(migrationsDir)
  .filter(f => f.endsWith('.sql'))
  .sort()
  .map(f => path.join(migrationsDir, f));

let masterContent = '-- HEALNARI MASTER SETUP SCRIPT\n-- Auto-generated to combine all migrations and seed data into one run.\n\n';

for (const file of files) {
  masterContent += `\n\n-- ==========================================\n-- MIGRATION: ${path.basename(file)}\n-- ==========================================\n\n`;
  masterContent += fs.readFileSync(file, 'utf8');
}

let seedContent = fs.readFileSync(seedPath, 'utf8');

// We will inject a snippet to create the auth users automatically using pgcrypto
const authUsersSnippet = `
  -- Create auth.users manually using pgcrypto so you don't have to sign up first
  create extension if not exists pgcrypto;

  if not exists (select 1 from auth.users where email = 'sarah.mitchell@example.com') then
    insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token)
    values (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'sarah.mitchell@example.com', crypt('Password123!', gen_salt('bf')), now(), '{"role": "doctor", "full_name": "Dr. Sarah Mitchell"}', now(), now(), '', '', '', '');
  end if;

  if not exists (select 1 from auth.users where email = 'priya@example.com') then
    insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token)
    values (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'priya@example.com', crypt('Password123!', gen_salt('bf')), now(), '{"role": "patient", "full_name": "Priya Sharma"}', now(), now(), '', '', '', '');
  end if;

  if not exists (select 1 from auth.users where email = 'anita@example.com') then
    insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token)
    values (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'anita@example.com', crypt('Password123!', gen_salt('bf')), now(), '{"role": "patient", "full_name": "Anita Desai"}', now(), now(), '', '', '', '');
  end if;

  if not exists (select 1 from auth.users where email = 'kavita@example.com') then
    insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token)
    values (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'kavita@example.com', crypt('Password123!', gen_salt('bf')), now(), '{"role": "patient", "full_name": "Kavita Patel"}', now(), now(), '', '', '', '');
  end if;
`;

// Replace the skip check in seed.sql with our authUserSnippet
seedContent = seedContent.replace(
  `  if v_doctor_id is null or v_priya_id is null then\n    raise notice 'Skipping seed: create the doctor + patient accounts described above first, then re-run this file.';\n    return;\n  end if;`,
  `  if v_doctor_id is null or v_priya_id is null then\n${authUsersSnippet}\n    select id into v_doctor_id from auth.users where email = 'sarah.mitchell@example.com';\n    select id into v_priya_id  from auth.users where email = 'priya@example.com';\n    select id into v_anita_id  from auth.users where email = 'anita@example.com';\n    select id into v_kavita_id from auth.users where email = 'kavita@example.com';\n  end if;`
);

masterContent += `\n\n-- ==========================================\n-- SEED DATA\n-- ==========================================\n\n`;
masterContent += seedContent;

fs.writeFileSync(masterPath, masterContent);
console.log('Created master_setup.sql');
