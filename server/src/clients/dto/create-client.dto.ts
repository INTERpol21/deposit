import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreateClientDto {
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  phone: string;

  @Transform(trim)
  @IsOptional()
  @IsString()
  passport?: string;
}
