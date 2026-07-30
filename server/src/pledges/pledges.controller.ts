import {
  Body,
  Controller,
  Get,
  Param,
  ParseEnumPipe,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import { CreatePledgeDto } from './dto/create-pledge.dto';
import { PledgeStatus } from './pledge.entity';
import { PledgesService } from './pledges.service';

@Controller('pledges')
export class PledgesController {
  constructor(private readonly pledgesService: PledgesService) {}

  @Post()
  create(@Body() dto: CreatePledgeDto) {
    return this.pledgesService.create(dto);
  }

  @Get()
  findByClient(
    @Query('clientId', ParseIntPipe) clientId: number,
    @Query('status', new ParseEnumPipe(PledgeStatus, { optional: true }))
    status?: PledgeStatus,
  ) {
    return this.pledgesService.findByClient(clientId, status);
  }

  @Get(':id/redemption')
  getQuote(@Param('id', ParseIntPipe) id: number) {
    return this.pledgesService.getQuote(id);
  }

  @Post(':id/redeem')
  redeem(@Param('id', ParseIntPipe) id: number) {
    return this.pledgesService.redeem(id);
  }
}
