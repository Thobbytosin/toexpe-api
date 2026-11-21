import {
  Table,
  Column,
  Model,
  DataType,
  HasMany,
  HasOne,
} from "sequelize-typescript";
import Transaction from "./transaction.model";
import Wallet from "./wallet.model";

@Table({
  tableName: "users",
  timestamps: true,
})
export default class User extends Model {
  @Column({
    type: DataType.UUID,
    primaryKey: true,
    defaultValue: DataType.UUIDV4,
    allowNull: false,
  })
  id!: string;

  @Column({ type: DataType.STRING, allowNull: true, defaultValue: null })
  currentSessionId!: string | null;

  @Column({ type: DataType.STRING, allowNull: false })
  fullName!: string;

  @Column({ type: DataType.STRING, allowNull: false, unique: true })
  email!: string;

  @Column({ type: DataType.STRING, allowNull: false })
  password!: string;

  @Column({ type: DataType.BOOLEAN, defaultValue: false })
  flagged!: boolean;

  @Column({ type: DataType.STRING, allowNull: true })
  flaggedReason!: string;

  @Column({ type: DataType.BOOLEAN, defaultValue: false })
  deleted!: boolean;

  @Column({ type: DataType.BOOLEAN, defaultValue: false })
  accountVerified!: boolean;

  @Column({ type: DataType.BOOLEAN, defaultValue: false })
  acceptedTerms!: boolean;

  @Column({ type: DataType.BOOLEAN, defaultValue: false })
  resetTokenVerified!: boolean;

  @Column({ type: DataType.BOOLEAN, defaultValue: false })
  deactivated!: boolean;

  @Column({
    type: DataType.INTEGER,
    defaultValue: 0,
  })
  deactivatedCount!: number;

  @Column({
    type: DataType.DATE,
    defaultValue: null,
  })
  deactivatedTime!: Date | null;

  @Column({ type: DataType.BOOLEAN, defaultValue: false })
  onboardingComplete!: boolean;

  @Column({
    type: DataType.DATE,
    defaultValue: null,
  })
  lastLogin!: Date | null;

  @Column({
    type: DataType.DATE,
    defaultValue: null,
  })
  lastLogout!: Date | null;

  @Column({
    type: DataType.DATE,
    defaultValue: null,
  })
  lastPasswordReset?: Date;

  @Column({
    type: DataType.DATE,
    defaultValue: null,
  })
  lastEmailReset?: Date;

  @Column({
    type: DataType.INTEGER,
    defaultValue: 0,
    allowNull: false,
  })
  passwordResetAttempt!: number;

  @Column({
    type: DataType.ENUM("user"),
    defaultValue: "user",
  })
  role!: "user";

  @Column({
    type: DataType.INTEGER,
    defaultValue: 0,
  })
  loginLockedTimes!: number;

  @Column({
    type: DataType.INTEGER,
    defaultValue: 0,
  })
  loginCount!: number;

  @Column({
    type: DataType.INTEGER,
    defaultValue: 0,
  })
  loginAttempts!: number;

  @Column({
    type: DataType.DATE,
    defaultValue: null,
  })
  lockoutUntil!: Date | null;

  @Column({
    type: DataType.STRING,
    allowNull: true,
    defaultValue: null,
  })
  googleId!: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
    defaultValue: null,
  })
  authProvider!: string; // 'email', 'google', or 'apple'

  @Column({
    type: DataType.STRING,
    allowNull: true,
    defaultValue: null,
  })
  avatar!: string;

  @HasOne(() => Wallet)
  wallet!: Wallet;

  @HasMany(() => Transaction)
  transactions!: Transaction[];
}
