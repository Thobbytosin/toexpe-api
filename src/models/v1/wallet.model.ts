import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
} from "sequelize-typescript";
import User from "./user.model";

@Table({
  tableName: "wallets",
  timestamps: true,
  indexes: [],
})
export default class Wallet extends Model {
  @Column({
    type: DataType.UUID,
    primaryKey: true,
    defaultValue: DataType.UUIDV4,
    allowNull: false,
  })
  id!: string;

  @Column({ type: DataType.DECIMAL(15, 2), allowNull: false, defaultValue: 0 })
  incomeBalance!: number;

  @Column({ type: DataType.DECIMAL(15, 2), allowNull: false, defaultValue: 0 })
  expenseBalance!: number;

  @Column({ type: DataType.STRING, defaultValue: "NGN" })
  currency!: string;

  @ForeignKey(() => User)
  @Column({ type: DataType.UUID, allowNull: false })
  userId!: string | null;

  @BelongsTo(() => User)
  user!: User;
}
