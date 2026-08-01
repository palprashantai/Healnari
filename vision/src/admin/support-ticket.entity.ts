import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('support_tickets')
export class SupportTicket {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  user_name: string;

  @Column()
  user_role: string; // Patient | Doctor

  @Column('text')
  issue: string;

  @Column({ default: 'Open' })
  status: string; // Open | Investigating | Resolved

  @Column({ default: 'Medium' })
  priority: string; // Low | Medium | High

  @CreateDateColumn()
  created_at: Date;
}
