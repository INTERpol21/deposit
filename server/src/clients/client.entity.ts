import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('clients')
export class Client {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'full_name' })
  fullName: string;

  @Column()
  phone: string;

  @Column({ type: 'varchar', nullable: true })
  passport: string | null;
}
