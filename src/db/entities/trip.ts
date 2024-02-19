import { Column, DeleteDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm'

@Entity()
export class Trip {
  @PrimaryGeneratedColumn()
  id!: number

  @Column()
  fullName!: string

  @Column({ nullable: true })
  userId!: number // Assuming you will manually handle user ID references

  @Column()
  pickupLocation!: string

  @Column()
  phoneNumber!: string

  @Column()
  destinationLocation!: string

  @Column({ nullable: true })
  requestTime!: Date

  @Column({ nullable: true })
  acceptedTime!: Date

  @Column({ nullable: true })
  driverId!: number // Assuming you will manually handle driver ID references

  @Column({
    type: 'enum',
    enum: ['Requested', 'Accepted', 'Completed', 'Cancelled'],
    default: 'Requested'
  })
  status!: 'Requested' | 'Accepted' | 'Completed' | 'Cancelled'

  @DeleteDateColumn({ nullable: true })
  deletedAt!: Date
}
