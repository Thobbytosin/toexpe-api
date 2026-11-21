import { Table, Column, Model, DataType } from "sequelize-typescript";

@Table({
  tableName: "verificationTokens",
  timestamps: true, // createdAt and updatedAt
  indexes: [
    // 🔹 Single-column index
    {
      fields: ["otp"],
    },
  ],
})
export default class VerificationTokens extends Model {
  @Column({
    type: DataType.UUID,
    primaryKey: true,
    defaultValue: DataType.UUIDV4,
    allowNull: false,
  })
  id!: string;

  @Column({ type: DataType.TEXT, allowNull: false })
  otp!: string;

  @Column({ type: DataType.STRING, allowNull: false })
  type!: string;

  @Column({
    type: DataType.DATE,
    allowNull: false,
  })
  expiresAt!: Date;
}
