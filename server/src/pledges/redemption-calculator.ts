const DAY_MS = 86_400_000;

function toUtc(date: string): number {
  return Date.parse(`${date}T00:00:00Z`);
}

export function todayString(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

export function addDays(date: string, days: number): string {
  return new Date(toUtc(date) + days * DAY_MS).toISOString().slice(0, 10);
}

export function daysBetween(from: string, to: string): number {
  return Math.round((toUtc(to) - toUtc(from)) / DAY_MS);
}

export interface RedemptionQuote {
  loanAmount: number;
  baseInterest: number;
  overdueDays: number;
  overdueInterest: number;
  total: number;
}

export function calculateRedemption(
  loanAmount: number,
  tariff: { basePeriodRate: number; overdueRate: number },
  dueDate: string,
  onDate: string,
): RedemptionQuote {
  const loanKopecks = Math.round(loanAmount * 100);
  const baseInterest = Math.round((loanKopecks * tariff.basePeriodRate) / 100);
  const overdueDays = Math.max(0, daysBetween(dueDate, onDate));
  const overdueInterest = Math.round(
    (loanKopecks * tariff.overdueRate * overdueDays) / 100,
  );
  return {
    loanAmount,
    baseInterest: baseInterest / 100,
    overdueDays,
    overdueInterest: overdueInterest / 100,
    total: (loanKopecks + baseInterest + overdueInterest) / 100,
  };
}
