import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('refund_requests')
export class RefundRequest {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  patient_name: string;

  @Column()
  amount: string;

  @Column()
  reason: string;

  @Column({ default: 'Pending' })
  status: string; // Pending | Processed

  @Column({ default: 'Razorpay' })
  gateway: string;

  @CreateDateColumn()
  created_at: Date;
}
