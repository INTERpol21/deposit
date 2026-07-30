import { Controller, Get } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ItemCategory } from './item-category.entity';

@Controller('item-categories')
export class CategoriesController {
  constructor(
    @InjectRepository(ItemCategory)
    private readonly categories: Repository<ItemCategory>,
  ) {}

  @Get()
  findAll() {
    return this.categories.find({ order: { id: 'ASC' } });
  }
}
