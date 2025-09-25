import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { PrismaService } from '../prisma/prisma.service';
import { HierarchyGuard } from './guards/hierarchy.guard';

@Module({
  controllers: [UsersController],
  providers: [UsersService, PrismaService, HierarchyGuard],
  exports: [UsersService],
})
export class UsersModule {}