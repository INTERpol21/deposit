import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CategoriesModule } from './categories/categories.module';
import { ClientsModule } from './clients/clients.module';
import { PledgesModule } from './pledges/pledges.module';
import { TariffsModule } from './tariffs/tariffs.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres' as const,
        host: config.get<string>('DB_HOST', 'localhost'),
        port: Number(config.get('DB_PORT', 5433)),
        username: config.get<string>('DB_USER', 'lombard'),
        password: config.get<string>('DB_PASSWORD', 'lombard'),
        database: config.get<string>('DB_NAME', 'lombard'),
        autoLoadEntities: true,
        synchronize: true,
      }),
    }),
    TariffsModule,
    ClientsModule,
    CategoriesModule,
    PledgesModule,
  ],
})
export class AppModule {}
