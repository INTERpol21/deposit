import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { numericTransformer } from '../common/numeric.transformer';

@Entity('tariffs')
export class Tariff {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ name: 'base_period_days' })
  basePeriodDays: number;

  @Column({
    name: 'base_period_rate',
    type: 'numeric',
    precision: 6,
    scale: 3,
    transformer: numericTransformer,
  })
  basePeriodRate: number;

  @Column({ name: 'overdue_period_days', type: 'int', nullable: true })
  overduePeriodDays: number | null;

  @Column({
    name: 'overdue_rate',
    type: 'numeric',
    precision: 6,
    scale: 3,
    transformer: numericTransformer,
  })
  overdueRate: number;
}
