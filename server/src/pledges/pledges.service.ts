import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { ItemCategory } from '../categories/item-category.entity';
import { Client } from '../clients/client.entity';
import { Tariff } from '../tariffs/tariff.entity';
import { CreatePledgeDto } from './dto/create-pledge.dto';
import { PledgeItem } from './pledge-item.entity';
import { Pledge, PledgeStatus } from './pledge.entity';
import {
  addDays,
  calculateRedemption,
  RedemptionQuote,
  todayString,
} from './redemption-calculator';

@Injectable()
export class PledgesService {
  constructor(
    @InjectRepository(Pledge) private readonly pledges: Repository<Pledge>,
    private readonly dataSource: DataSource,
  ) {}

  async create(dto: CreatePledgeDto): Promise<Pledge> {
    return this.dataSource.transaction(async (manager) => {
      const tariff = await manager.findOneBy(Tariff, { id: dto.tariffId });
      if (!tariff) {
        throw new NotFoundException('Тариф не найден');
      }
      const client = await manager.findOneBy(Client, { id: dto.clientId });
      if (!client) {
        throw new NotFoundException('Клиент не найден');
      }
      const categoryIds = [...new Set(dto.items.map((item) => item.categoryId))];
      const categories = await manager.findBy(ItemCategory, {
        id: In(categoryIds),
      });
      if (categories.length !== categoryIds.length) {
        throw new NotFoundException('Группа товаров не найдена');
      }
      const createdAt = todayString();
      const loanKopecks = dto.items.reduce(
        (sum, item) => sum + Math.round(item.amount * 100),
        0,
      );
      const pledge = manager.create(Pledge, {
        tariffId: tariff.id,
        clientId: client.id,
        createdAt,
        dueDate: addDays(createdAt, tariff.basePeriodDays),
        loanAmount: loanKopecks / 100,
        status: PledgeStatus.Active,
        items: dto.items.map((item) =>
          manager.create(PledgeItem, {
            categoryId: item.categoryId,
            name: item.name,
            attributes: item.attributes ?? {},
            amount: item.amount,
          }),
        ),
      });
      return manager.save(pledge);
    });
  }

  findByClient(clientId: number, status?: PledgeStatus): Promise<Pledge[]> {
    return this.pledges.find({
      where: { clientId, ...(status ? { status } : {}) },
      relations: { tariff: true, items: { category: true } },
      order: { id: 'DESC' },
    });
  }

  async getQuote(id: number): Promise<RedemptionQuote & { pledge: Pledge }> {
    const pledge = await this.pledges.findOne({
      where: { id },
      relations: { tariff: true, client: true },
    });
    if (!pledge) {
      throw new NotFoundException('Залог не найден');
    }
    if (pledge.status === PledgeStatus.Redeemed) {
      throw new ConflictException('Залог уже выкуплен');
    }
    const quote = calculateRedemption(
      pledge.loanAmount,
      pledge.tariff,
      pledge.dueDate,
      todayString(),
    );
    return { ...quote, pledge };
  }

  async redeem(id: number): Promise<Pledge> {
    return this.dataSource.transaction(async (manager) => {
      const pledge = await manager.findOne(Pledge, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!pledge) {
        throw new NotFoundException('Залог не найден');
      }
      if (pledge.status === PledgeStatus.Redeemed) {
        throw new ConflictException('Залог уже выкуплен');
      }
      const tariff = await manager.findOneByOrFail(Tariff, {
        id: pledge.tariffId,
      });
      const quote = calculateRedemption(
        pledge.loanAmount,
        tariff,
        pledge.dueDate,
        todayString(),
      );
      pledge.status = PledgeStatus.Redeemed;
      pledge.redeemedAt = new Date();
      pledge.redemptionAmount = quote.total;
      return manager.save(pledge);
    });
  }
}
