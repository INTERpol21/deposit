import { Transform, Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  ValidateNested,
} from 'class-validator';

export class CreatePledgeItemDto {
  @IsInt()
  categoryId: number;

  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsObject()
  attributes?: Record<string, string | number>;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Max(100_000_000)
  amount: number;
}

export class CreatePledgeDto {
  @IsInt()
  tariffId: number;

  @IsInt()
  clientId: number;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreatePledgeItemDto)
  items: CreatePledgeItemDto[];
}
