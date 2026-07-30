import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ItemCategory } from '../categories/item-category.entity';
import { numericTransformer } from '../common/numeric.transformer';
import { Pledge } from './pledge.entity';

@Entity('pledge_items')
export class PledgeItem {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Pledge, (pledge) => pledge.items, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'pledge_id' })
  pledge: Pledge;

  @ManyToOne(() => ItemCategory, { nullable: false })
  @JoinColumn({ name: 'category_id' })
  category: ItemCategory;

  @Column({ name: 'category_id' })
  categoryId: number;

  @Column()
  name: string;

  @Column({ type: 'jsonb', default: {} })
  attributes: Record<string, string | number>;

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    transformer: numericTransformer,
  })
  amount: number;
}
