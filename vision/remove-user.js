require('dotenv').config({ path: './.env' });
const { createClient } = require('@supabase/supabase-js');
global.WebSocket = require('ws'); // Provide ws

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function removeUsers() {
  const emails = ['vinay24pal@gmail.com', 'ppal4334@gmail.com'];
  
  for (const email of emails) {
    console.log(`Removing ${email}...`);
    
    // 1. Delete consultation requests
    const { data: reqs, error: reqErr } = await supabase
      .from('consultation_requests')
      .delete()
      .eq('email', email)
      .select();
    
    if (reqErr) console.error("Error deleting requests:", reqErr);
    else console.log(`Deleted ${reqs?.length || 0} consultation requests for ${email}`);
    
    // 2. Find Auth user
    const { data: { users }, error: userErr } = await supabase.auth.admin.listUsers();
    if (userErr) {
      console.error("Error fetching users:", userErr);
      continue;
    }
    
    const user = users.find(u => u.email === email);
    if (user) {
      const { error: delErr } = await supabase.auth.admin.deleteUser(user.id);
      if (delErr) {
        console.error(`Error deleting auth user ${email}:`, delErr);
      } else {
        console.log(`Deleted auth user ${email}`);
      }
    } else {
      console.log(`Auth user ${email} not found.`);
    }
  }
}

removeUsers().then(() => console.log('Done')).catch(console.error);
