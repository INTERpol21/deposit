import { Controller, Get } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tariff } from './tariff.entity';

@Controller('tariffs')
export class TariffsController {
  constructor(
    @InjectRepository(Tariff) private readonly tariffs: Repository<Tariff>,
  ) {}

  @Get()
  findAll() {
    return this.tariffs.find({ order: { id: 'ASC' } });
  }
}
