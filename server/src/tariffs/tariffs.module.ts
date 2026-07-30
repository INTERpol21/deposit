import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tariff } from './tariff.entity';
import { TariffsController } from './tariffs.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Tariff])],
  controllers: [TariffsController],
})
export class TariffsModule {}
