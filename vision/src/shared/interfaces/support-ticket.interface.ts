export interface SupportTicket {
  id: number;
  user_name: string;
  user_role: string; // Patient | Doctor
  issue: string;
  status: string; // Open | Investigating | Resolved
  priority: string; // Low | Medium | High
  created_at: Date;
  updated_at: Date;
}
