import { QueryTypes } from "sequelize";
import { getSequelize } from "../utils/sequelize"; // adjust the path
import { STATS_PERIOD, StatsPeriod, StatsResponse } from "../types/stats.types";
import { getPeriodRange, isValidTimeZone } from "../utils/stats-range";
import ErrorHandler from "../utils/errorHandler";

const DEFAULT_TIME_ZONE = process.env.DEFAULT_TIMEZONE ?? "Africa/Lagos";
const TOP_LIMIT = 5;

type Args = {
  userId: string;
  period: StatsPeriod[number];
  type: "income" | "expense";
  timeZone?: string;
};

export async function handleGetStats({
  userId,
  period,
  type,
  timeZone,
}: Args): Promise<StatsResponse> {
  const isStatsPeriod = (
    value: string | undefined,
  ): value is (typeof STATS_PERIOD)[number] =>
    STATS_PERIOD.some((validPeriod) => validPeriod === value);

  if (!isStatsPeriod(period)) {
    throw new ErrorHandler("Invalid period", 400);
  }
  if (type !== "expense" && type !== "income") {
    throw new ErrorHandler("Invalid type", 400);
  }

  const tz =
    timeZone && isValidTimeZone(timeZone) ? timeZone : DEFAULT_TIME_ZONE;
  const range = getPeriodRange(period, tz);
  const sequelize = getSequelize();

  const replacements = {
    userId,
    type,
    tz,
    start: range.start,
    end: range.end,
    limit: TOP_LIMIT,
  };

  // "start" and "end" are wall-clock times; AT TIME ZONE turns them into real instants
  const where = `
    t."userId" = :userId
    AND t."type" = :type
    AND t."date" >= (:start)::timestamp AT TIME ZONE :tz
    AND t."date" <  (:end)::timestamp AT TIME ZONE :tz`;

  const [bucketRows, topRows] = await Promise.all([
    // totals per bucket; ROUND(amount * 100) converts naira to minor units inside SQL,
    // so there is no floating-point drift
    sequelize.query<{ bucket: number; total: string }>(
      `SELECT ${range.bucketsql} AS bucket,
              COALESCE(SUM(ROUND(t."amount" * 100)), 0)::bigint AS total
       FROM "transactions" t
       WHERE ${where}
       GROUP BY bucket`,
      { replacements, type: QueryTypes.SELECT },
    ),

    // the biggest transactions in the same period
    sequelize.query<{
      id: string;
      title: string;
      category: string;
      type: "income" | "expense";
      date: string;
      amount: string;
    }>(
      `SELECT t."id", t."title", t."category", t."type", t."date",
              ROUND(t."amount")::bigint AS amount
       FROM "transactions" t
       WHERE ${where}
       ORDER BY t."amount" DESC, t."date" DESC, t."id" DESC
       LIMIT :limit`,
      { replacements, type: QueryTypes.SELECT },
    ),
  ]);

  // buckets with no transactions don't come back from SQL: fill them with 0
  const values: number[] = new Array(range.labels.length).fill(0);
  for (const row of bucketRows) {
    const i = Number(row.bucket);
    if (i >= 0 && i < values.length) values[i] = Number(row.total);
  }

  return {
    period: period as unknown as StatsResponse["period"],
    type,
    timeZone: tz,
    chart: range.labels.map((label, i) => ({
      label,
      value: values[i],
    })) as unknown as StatsResponse["chart"],
    topItems: topRows.map((r) => ({
      id: r.id,
      title: r.title,
      categoryId: r.category,
      type: r.type,
      date: new Date(r.date).toISOString(),
      amount: Number(r.amount),
    })),
    total: values.reduce((sum, v) => sum + v, 0),
    currentIndex: range.currentIndex,
  };
}
