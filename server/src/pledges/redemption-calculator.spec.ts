import {
  addDays,
  calculateRedemption,
  daysBetween,
  todayString,
} from './redemption-calculator';

describe('redemption-calculator', () => {
  const tariff = { basePeriodRate: 2.158, overdueRate: 0.5 };

  it('выкуп до даты «до» — только базовый процент', () => {
    const quote = calculateRedemption(10000, tariff, '2026-08-04', '2026-08-01');
    expect(quote.baseInterest).toBe(215.8);
    expect(quote.overdueDays).toBe(0);
    expect(quote.overdueInterest).toBe(0);
    expect(quote.total).toBe(10215.8);
  });

  it('выкуп ровно в дату «до» — просрочки нет', () => {
    const quote = calculateRedemption(10000, tariff, '2026-08-04', '2026-08-04');
    expect(quote.overdueDays).toBe(0);
    expect(quote.total).toBe(10215.8);
  });

  it('просрочка считается по дням', () => {
    const quote = calculateRedemption(10000, tariff, '2026-08-04', '2026-08-07');
    expect(quote.overdueDays).toBe(3);
    expect(quote.overdueInterest).toBe(150);
    expect(quote.total).toBe(10365.8);
  });

  it('проценты округляются до копейки, без float-хвостов', () => {
    const quote = calculateRedemption(10000.55, tariff, '2026-08-04', '2026-08-04');
    expect(quote.baseInterest).toBe(215.81);
    expect(quote.total).toBe(10216.36);
  });

  it('копеечная сумма не ломает расчёт', () => {
    const quote = calculateRedemption(0.01, tariff, '2026-08-04', '2026-08-10');
    expect(quote.baseInterest).toBe(0);
    expect(quote.overdueInterest).toBe(0);
    expect(quote.total).toBe(0.01);
  });

  it('daysBetween работает через границы месяца и года', () => {
    expect(daysBetween('2026-01-31', '2026-02-01')).toBe(1);
    expect(daysBetween('2025-12-31', '2026-01-01')).toBe(1);
    expect(daysBetween('2026-08-04', '2026-08-01')).toBe(-3);
  });

  it('daysBetween учитывает високосный год', () => {
    expect(daysBetween('2024-02-28', '2024-03-01')).toBe(2);
    expect(daysBetween('2026-02-28', '2026-03-01')).toBe(1);
  });

  it('addDays переваливает через месяц и год', () => {
    expect(addDays('2026-07-30', 5)).toBe('2026-08-04');
    expect(addDays('2026-12-30', 5)).toBe('2027-01-04');
    expect(addDays('2026-08-04', -5)).toBe('2026-07-30');
  });

  it('todayString отдаёт локальную дату в формате YYYY-MM-DD', () => {
    expect(todayString()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
