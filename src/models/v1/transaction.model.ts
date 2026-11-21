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
  tableName: "transactions",
  timestamps: true,
  indexes: [],
})
export default class Transaction extends Model {
  @Column({
    type: DataType.UUID,
    primaryKey: true,
    defaultValue: DataType.UUIDV4,
    allowNull: false,
  })
  id!: string;

  @Column({ type: DataType.UUID, allowNull: false })
  idempotencyKey!: string;

  @Column({ type: DataType.TEXT, allowNull: false })
  title!: string;

  @Column({ type: DataType.TEXT, allowNull: false })
  category!: string;

  @Column({
    type: DataType.DATE,
    allowNull: false,
  })
  date!: Date;

  @Column({ type: DataType.DECIMAL(15, 2), allowNull: false, defaultValue: 0 })
  amount!: number;

  @Column({
    type: DataType.ENUM("income", "expense"),
    defaultValue: "income",
  })
  type!: "income" | "expense";

  @Column({ type: DataType.STRING, defaultValue: "NGN" })
  currency!: string;

  @ForeignKey(() => User)
  @Column({ type: DataType.UUID, allowNull: false })
  userId!: string | null;

  @BelongsTo(() => User)
  user!: User;
}
