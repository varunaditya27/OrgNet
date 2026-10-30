import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { FilesService } from './files.service';
import { FilesController } from './files.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    MulterModule.register({
      storage: undefined, // Use memory storage since we're uploading to S3
      limits: {
        fileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10), // 10MB default
      },
      fileFilter: (req, file, callback) => {
        const allowedTypes = process.env.ALLOWED_FILE_TYPES?.split(',') || [];

        if (allowedTypes.length > 0 && !allowedTypes.includes(file.mimetype)) {
          return callback(new Error('File type not allowed'), false);
        }

        callback(null, true);
      },
    }),
  ],
  controllers: [FilesController],
  providers: [FilesService],
  exports: [FilesService],
})
export class FilesModule {}
