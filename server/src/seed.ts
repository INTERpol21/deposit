import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { AppModule } from './app.module';
import { ItemCategory } from './categories/item-category.entity';
import { Tariff } from './tariffs/tariff.entity';

const tariffs: Partial<Tariff>[] = [
  {
    name: 'Техника 5 дней 2,158%',
    basePeriodDays: 5,
    basePeriodRate: 2.158,
    overduePeriodDays: 30,
    overdueRate: 0.5,
  },
  {
    name: 'Техника 14 дней 5%',
    basePeriodDays: 14,
    basePeriodRate: 5,
    overduePeriodDays: 30,
    overdueRate: 0.6,
  },
  {
    name: 'Золото 30 дней 8%',
    basePeriodDays: 30,
    basePeriodRate: 8,
    overduePeriodDays: null,
    overdueRate: 0.3,
  },
];

const categories: Partial<ItemCategory>[] = [
  {
    name: 'Смартфоны',
    fields: [
      { key: 'model', label: 'Модель', type: 'text', required: true },
      {
        key: 'memory',
        label: 'Объём памяти',
        type: 'select',
        options: ['64 ГБ', '128 ГБ', '256 ГБ', '512 ГБ'],
      },
      {
        key: 'screen',
        label: 'Состояние экрана',
        type: 'select',
        options: ['Без дефектов', 'Мелкие царапины', 'Трещины'],
      },
    ],
  },
  {
    name: 'Мониторы',
    fields: [
      { key: 'diagonal', label: 'Диагональ, дюймы', type: 'number' },
      { key: 'resolution', label: 'Разрешение', type: 'text' },
      {
        key: 'scratches',
        label: 'Царапины',
        type: 'select',
        options: ['Нет', 'Есть'],
      },
    ],
  },
];

async function seed() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);

  const tariffRepo = dataSource.getRepository(Tariff);
  for (const tariff of tariffs) {
    const exists = await tariffRepo.findOneBy({ name: tariff.name });
    if (!exists) {
      await tariffRepo.save(tariffRepo.create(tariff));
    }
  }

  const categoryRepo = dataSource.getRepository(ItemCategory);
  for (const category of categories) {
    const exists = await categoryRepo.findOneBy({ name: category.name });
    if (!exists) {
      await categoryRepo.save(categoryRepo.create(category));
    }
  }

  await app.close();
  console.log('Справочники загружены');
}

seed();
