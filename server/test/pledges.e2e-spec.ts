import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Client as PgClient } from 'pg';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { ItemCategory } from '../src/categories/item-category.entity';
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

describe('Создание залога и валидация (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let tariff: Tariff;
  let category: ItemCategory;
  let client: Client;

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

    tariff = await dataSource.getRepository(Tariff).save({
      name: 'Техника 5 дней 2,158%',
      basePeriodDays: 5,
      basePeriodRate: 2.158,
      overduePeriodDays: 30,
      overdueRate: 0.5,
    });
    category = await dataSource.getRepository(ItemCategory).save({
      name: 'Смартфоны',
      fields: [{ key: 'model', label: 'Модель', type: 'text' }],
    });
    client = await dataSource.getRepository(Client).save({
      fullName: 'Сидорова Анна Павловна',
      phone: '+7 922 111-22-33',
      passport: '7014 222333',
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('создаёт залог: сумма и дата «до» считаются на сервере', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/pledges')
      .send({
        tariffId: tariff.id,
        clientId: client.id,
        items: [
          { categoryId: category.id, name: 'iPhone 13', amount: 15000 },
          { categoryId: category.id, name: 'Galaxy S22', amount: 8000.5 },
        ],
      })
      .expect(201);

    expect(res.body.loanAmount).toBe(23000.5);
    expect(res.body.status).toBe('active');
    expect(res.body.createdAt).toBe(todayString());
    expect(res.body.dueDate).toBe(addDays(todayString(), 5));
    expect(res.body.items).toHaveLength(2);
  });

  it('отклоняет залог без товаров', () => {
    return request(app.getHttpServer())
      .post('/api/pledges')
      .send({ tariffId: tariff.id, clientId: client.id, items: [] })
      .expect(400);
  });

  it('отклоняет нулевую и отрицательную стоимость', async () => {
    for (const amount of [0, -100]) {
      await request(app.getHttpServer())
        .post('/api/pledges')
        .send({
          tariffId: tariff.id,
          clientId: client.id,
          items: [{ categoryId: category.id, name: 'x', amount }],
        })
        .expect(400);
    }
  });

  it('отклоняет стоимость с тремя знаками после запятой', () => {
    return request(app.getHttpServer())
      .post('/api/pledges')
      .send({
        tariffId: tariff.id,
        clientId: client.id,
        items: [{ categoryId: category.id, name: 'x', amount: 10.999 }],
      })
      .expect(400);
  });

  it('возвращает 404 на несуществующие тариф, клиента и группу', async () => {
    const item = { categoryId: category.id, name: 'x', amount: 100 };
    await request(app.getHttpServer())
      .post('/api/pledges')
      .send({ tariffId: 9999, clientId: client.id, items: [item] })
      .expect(404);
    await request(app.getHttpServer())
      .post('/api/pledges')
      .send({ tariffId: tariff.id, clientId: 9999, items: [item] })
      .expect(404);
    await request(app.getHttpServer())
      .post('/api/pledges')
      .send({
        tariffId: tariff.id,
        clientId: client.id,
        items: [{ ...item, categoryId: 9999 }],
      })
      .expect(404);
  });

  it('отклоняет неизвестный статус в фильтре списка', () => {
    return request(app.getHttpServer())
      .get(`/api/pledges?clientId=${client.id}&status=hacked`)
      .expect(400);
  });

  it('поиск клиентов экранирует спецсимволы ILIKE', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/clients?search=%')
      .expect(200);
    expect(res.body).toHaveLength(0);

    const byName = await request(app.getHttpServer())
      .get('/api/clients?search=Сидорова')
      .expect(200);
    expect(byName.body).toHaveLength(1);
  });

  it('обрезает пробелы и не пускает пустое ФИО', async () => {
    await request(app.getHttpServer())
      .post('/api/clients')
      .send({ fullName: '   ', phone: '+7 900' })
      .expect(400);

    const res = await request(app.getHttpServer())
      .post('/api/clients')
      .send({ fullName: '  Козлов Пётр  ', phone: ' +7 933 000-11-22 ' })
      .expect(201);
    expect(res.body.fullName).toBe('Козлов Пётр');
    expect(res.body.phone).toBe('+7 933 000-11-22');
  });

  it('параллельные выкупы одного залога: ровно один проходит', async () => {
    const pledge = await dataSource.getRepository(Pledge).save({
      tariffId: tariff.id,
      clientId: client.id,
      createdAt: todayString(),
      dueDate: addDays(todayString(), 5),
      loanAmount: 1000,
      status: PledgeStatus.Active,
    });

    const results = await Promise.all(
      Array.from({ length: 5 }, () =>
        request(app.getHttpServer()).post(`/api/pledges/${pledge.id}/redeem`),
      ),
    );

    const codes = results.map((r) => r.status).sort();
    expect(codes).toEqual([201, 409, 409, 409, 409]);

    const saved = await dataSource
      .getRepository(Pledge)
      .findOneByOrFail({ id: pledge.id });
    expect(saved.redemptionAmount).toBe(1021.58);
  });
});
