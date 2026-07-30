import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

export interface CategoryField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'select';
  options?: string[];
  required?: boolean;
}

@Entity('item_categories')
export class ItemCategory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ type: 'jsonb', default: [] })
  fields: CategoryField[];
}
