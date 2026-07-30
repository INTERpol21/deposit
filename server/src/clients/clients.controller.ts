import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { Client } from './client.entity';
import { CreateClientDto } from './dto/create-client.dto';

@Controller('clients')
export class ClientsController {
  constructor(
    @InjectRepository(Client) private readonly clients: Repository<Client>,
  ) {}

  @Get()
  search(@Query('search') search?: string) {
    const query = search?.trim();
    if (!query) {
      return this.clients.find({ order: { fullName: 'ASC' }, take: 20 });
    }
    const pattern = `%${query.replace(/[\\%_]/g, '\\$&')}%`;
    return this.clients.find({
      where: [
        { fullName: ILike(pattern) },
        { phone: ILike(pattern) },
        { passport: ILike(pattern) },
      ],
      order: { fullName: 'ASC' },
      take: 20,
    });
  }

  @Post()
  create(@Body() dto: CreateClientDto) {
    return this.clients.save(this.clients.create(dto));
  }
}
