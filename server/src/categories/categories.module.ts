import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CategoriesController } from './categories.controller';
import { ItemCategory } from './item-category.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ItemCategory])],
  controllers: [CategoriesController],
})
export class CategoriesModule {}
