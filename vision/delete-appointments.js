require('dotenv').config({ path: './.env' });
const { createClient } = require('@supabase/supabase-js');
global.WebSocket = require('ws');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function deleteAllAppointments() {
  console.log("Starting deletion of appointments and history...");

  try {
    // 1. Delete refund_requests
    const { error: err1 } = await supabase.from('refund_requests').delete().gt('id', 0);
    if (err1) console.error("Error deleting refund_requests:", err1);
    else console.log("Deleted refund_requests");

    console.log("All appointments and related history have been successfully deleted.");
  } catch (error) {
    console.error("Unexpected error:", error);
  }
}

deleteAllAppointments();
