import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PledgeItem } from './pledge-item.entity';
import { Pledge } from './pledge.entity';
import { PledgesController } from './pledges.controller';
import { PledgesService } from './pledges.service';

@Module({
  imports: [TypeOrmModule.forFeature([Pledge, PledgeItem])],
  controllers: [PledgesController],
  providers: [PledgesService],
})
export class PledgesModule {}
