export const STATS_PERIOD = ["day", "week", "month", "year"] as const;
export type StatsPeriod = typeof STATS_PERIOD;

export type StatsPoint = { label: string; value: number };

export type StatsTopItem = {
  id: string;
  title: string;
  categoryId: string;
  type: "income" | "expense";
  date: string;
  amount: number;
};

export type StatsResponse = {
  period: StatsPeriod;
  type: "income" | "expense";
  timeZone: string;
  chart: StatsPoint[];
  topItems: StatsTopItem[];
  total: number;
  currentIndex: number;
};
