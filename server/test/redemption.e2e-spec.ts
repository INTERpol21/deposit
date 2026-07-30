import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Client as PgClient } from 'pg';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { Client } from '../src/clients/client.entity';
import { Pledge, PledgeStatus } from '../src/pledges/pledge.entity';
import { addDays, todayString } from '../src/pledges/redemption-calculator';
import { Tariff } from '../src/tariffs/tariff.entity';

const DB = {
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 5433),
  user: process.env.DB_USER ?? 'lombard',
  password: process.env.DB_PASSWORD ?? 'lombard',
};
const TEST_DB_NAME = 'lombard_test';

async function ensureTestDatabase() {
  const client = new PgClient({ ...DB, database: 'lombard' });
  await client.connect();
  const existing = await client.query(
    'SELECT 1 FROM pg_database WHERE datname = $1',
    [TEST_DB_NAME],
  );
  if (existing.rowCount === 0) {
    await client.query(`CREATE DATABASE ${TEST_DB_NAME}`);
  }
  await client.end();
}

describe('Выкуп залога (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let techTariff: Tariff;
  let goldTariff: Tariff;
  let client: Client;

  const today = todayString();

  beforeAll(async () => {
    await ensureTestDatabase();
    process.env.DB_NAME = TEST_DB_NAME;

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    dataSource = app.get(DataSource);
    await dataSource.synchronize(true);

    techTariff = await dataSource.getRepository(Tariff).save({
      name: 'Техника 5 дней 2,158%',
      basePeriodDays: 5,
      basePeriodRate: 2.158,
      overduePeriodDays: 30,
      overdueRate: 0.5,
    });
    goldTariff = await dataSource.getRepository(Tariff).save({
      name: 'Золото 30 дней 8%',
      basePeriodDays: 30,
      basePeriodRate: 8,
      overduePeriodDays: null,
      overdueRate: 0.3,
    });
    client = await dataSource.getRepository(Client).save({
      fullName: 'Петров Пётр Петрович',
      phone: '+7 911 000-00-00',
      passport: '4004 567890',
    });
  });

  afterAll(async () => {
    await app.close();
  });

  function createPledge(tariff: Tariff, loanAmount: number, dueDate: string) {
    return dataSource.getRepository(Pledge).save({
      tariffId: tariff.id,
      clientId: client.id,
      createdAt: addDays(dueDate, -tariff.basePeriodDays),
      dueDate,
      loanAmount,
      status: PledgeStatus.Active,
    });
  }

  it('выкуп в пределах основного периода: сумма + процент за период', async () => {
    const pledge = await createPledge(techTariff, 10000, addDays(today, 3));

    const res = await request(app.getHttpServer())
      .post(`/api/pledges/${pledge.id}/redeem`)
      .expect(201);

    expect(res.body.status).toBe('redeemed');
    expect(res.body.redemptionAmount).toBe(10215.8);

    const saved = await dataSource
      .getRepository(Pledge)
      .findOneByOrFail({ id: pledge.id });
    expect(saved.status).toBe(PledgeStatus.Redeemed);
    expect(saved.redemptionAmount).toBe(10215.8);
    expect(saved.redeemedAt).not.toBeNull();
  });

  it('выкуп с просрочкой: базовый процент + процент за каждый день просрочки', async () => {
    const pledge = await createPledge(techTariff, 10000, addDays(today, -3));

    const quote = await request(app.getHttpServer())
      .get(`/api/pledges/${pledge.id}/redemption`)
      .expect(200);

    expect(quote.body.overdueDays).toBe(3);
    expect(quote.body.baseInterest).toBe(215.8);
    expect(quote.body.overdueInterest).toBe(150);
    expect(quote.body.total).toBe(10365.8);

    const res = await request(app.getHttpServer())
      .post(`/api/pledges/${pledge.id}/redeem`)
      .expect(201);
    expect(res.body.redemptionAmount).toBe(10365.8);
  });

  it('граничный случай: выкуп ровно в дату "до" — без просрочки', async () => {
    const pledge = await createPledge(techTariff, 10000, today);

    const res = await request(app.getHttpServer())
      .post(`/api/pledges/${pledge.id}/redeem`)
      .expect(201);

    expect(res.body.redemptionAmount).toBe(10215.8);
  });

  it('повторный выкуп возвращает 409 и не меняет сохранённую сумму', async () => {
    const pledge = await createPledge(techTariff, 5000, addDays(today, 2));

    await request(app.getHttpServer())
      .post(`/api/pledges/${pledge.id}/redeem`)
      .expect(201);

    const firstSaved = await dataSource
      .getRepository(Pledge)
      .findOneByOrFail({ id: pledge.id });

    await request(app.getHttpServer())
      .post(`/api/pledges/${pledge.id}/redeem`)
      .expect(409);

    const secondSaved = await dataSource
      .getRepository(Pledge)
      .findOneByOrFail({ id: pledge.id });
    expect(secondSaved.redemptionAmount).toBe(firstSaved.redemptionAmount);
    expect(secondSaved.redeemedAt).toEqual(firstSaved.redeemedAt);
  });

  it('разные тарифы дают разную сумму выкупа при одинаковом займе', async () => {
    const techPledge = await createPledge(techTariff, 10000, addDays(today, 3));
    const goldPledge = await createPledge(goldTariff, 10000, addDays(today, 3));

    const techRes = await request(app.getHttpServer())
      .post(`/api/pledges/${techPledge.id}/redeem`)
      .expect(201);
    const goldRes = await request(app.getHttpServer())
      .post(`/api/pledges/${goldPledge.id}/redeem`)
      .expect(201);

    expect(techRes.body.redemptionAmount).toBe(10215.8);
    expect(goldRes.body.redemptionAmount).toBe(10800);
    expect(goldRes.body.redemptionAmount).not.toBe(
      techRes.body.redemptionAmount,
    );
  });

  it('выкупленный залог пропадает из списка активных', async () => {
    const pledge = await createPledge(techTariff, 7000, addDays(today, 4));

    const before = await request(app.getHttpServer())
      .get(`/api/pledges?clientId=${client.id}&status=active`)
      .expect(200);
    expect(before.body.map((p: Pledge) => p.id)).toContain(pledge.id);

    await request(app.getHttpServer())
      .post(`/api/pledges/${pledge.id}/redeem`)
      .expect(201);

    const after = await request(app.getHttpServer())
      .get(`/api/pledges?clientId=${client.id}&status=active`)
      .expect(200);
    expect(after.body.map((p: Pledge) => p.id)).not.toContain(pledge.id);
  });
});
