import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Client } from '../clients/client.entity';
import { numericTransformer } from '../common/numeric.transformer';
import { Tariff } from '../tariffs/tariff.entity';
import { PledgeItem } from './pledge-item.entity';

export enum PledgeStatus {
  Active = 'active',
  Redeemed = 'redeemed',
}

@Entity('pledges')
export class Pledge {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Tariff, { nullable: false })
  @JoinColumn({ name: 'tariff_id' })
  tariff: Tariff;

  @Column({ name: 'tariff_id' })
  tariffId: number;

  @ManyToOne(() => Client, { nullable: false })
  @JoinColumn({ name: 'client_id' })
  client: Client;

  @Column({ name: 'client_id' })
  clientId: number;

  @Column({ name: 'created_at', type: 'date' })
  createdAt: string;

  @Column({ name: 'due_date', type: 'date' })
  dueDate: string;

  @Column({
    name: 'loan_amount',
    type: 'numeric',
    precision: 12,
    scale: 2,
    transformer: numericTransformer,
  })
  loanAmount: number;

  @Column({ type: 'enum', enum: PledgeStatus, default: PledgeStatus.Active })
  status: PledgeStatus;

  @Column({ name: 'redeemed_at', type: 'timestamptz', nullable: true })
  redeemedAt: Date | null;

  @Column({
    name: 'redemption_amount',
    type: 'numeric',
    precision: 12,
    scale: 2,
    nullable: true,
    transformer: numericTransformer,
  })
  redemptionAmount: number | null;

  @OneToMany(() => PledgeItem, (item) => item.pledge, { cascade: true })
  items: PledgeItem[];
}
