import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Redirect,
  ParseIntPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { FilesService } from './files.service';
import {
  UploadFileDto,
  FileFilterDto,
  UpdateFileDto,
  FileResponseDto,
  PaginatedFilesDto,
  FileUploadResponseDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../common/enums';

@Controller('files')
@UseGuards(JwtAuthGuard)
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body() uploadFileDto: UploadFileDto,
    @Request() req: any,
  ): Promise<FileUploadResponseDto> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    return this.filesService.uploadFile(file, uploadFileDto, req.user.id);
  }

  @Get()
  async findAll(
    @Query() filterDto: FileFilterDto,
    @Request() req: any,
  ): Promise<PaginatedFilesDto> {
    return this.filesService.findAll(filterDto, req.user.id);
  }

  @Get(':id')
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any,
  ): Promise<FileResponseDto> {
    return this.filesService.findOne(id, req.user.id);
  }

  @Get(':id/download')
  async downloadFile(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any,
  ): Promise<{ downloadUrl: string }> {
    const downloadUrl = await this.filesService.generateDownloadUrl(id, req.user.id);
    return { downloadUrl };
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateFileDto: UpdateFileDto,
    @Request() req: any,
  ): Promise<FileResponseDto> {
    return this.filesService.update(id, updateFileDto, req.user.id);
  }

  @Delete(':id')
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any,
  ): Promise<{ message: string }> {
    await this.filesService.remove(id, req.user.id);
    return { message: 'File deleted successfully' };
  }

  // Admin-only endpoints

  @Get('admin/all')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  async findAllAdmin(
    @Query() filterDto: FileFilterDto,
    @Request() req: any,
  ): Promise<PaginatedFilesDto> {
    // Admin can see all files regardless of role restrictions
    const adminFilterDto = { ...filterDto };
    return this.filesService.findAll(adminFilterDto, req.user.id);
  }

  @Delete('admin/:id/hard-delete')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  async hardDelete(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any,
  ): Promise<{ message: string }> {
    await this.filesService.remove(id, req.user.id);
    return { message: 'File permanently deleted' };
  }

  // Utility endpoints

  @Get('user/:userId')
  async findUserFiles(
    @Param('userId', ParseIntPipe) userId: number,
    @Query() filterDto: FileFilterDto,
    @Request() req: any,
  ): Promise<PaginatedFilesDto> {
    const userFilterDto = { ...filterDto, ownerId: userId };
    return this.filesService.findAll(userFilterDto, req.user.id);
  }

  @Get('stats/overview')
  async getFileStats(@Request() req: any): Promise<{
    totalFiles: number;
    totalSize: number;
    filesByType: { mimeType: string; count: number }[];
    recentUploads: FileResponseDto[];
  }> {
    // This could be implemented as a separate service method
    // For now, returning a basic response
    const files = await this.filesService.findAll({ limit: 100 }, req.user.id);
    
    const filesByType = files.files.reduce((acc, file) => {
      const existing = acc.find(item => item.mimeType === file.mimeType);
      if (existing) {
        existing.count++;
      } else {
        acc.push({ mimeType: file.mimeType, count: 1 });
      }
      return acc;
    }, [] as { mimeType: string; count: number }[]);

    const totalSize = files.files.reduce((sum, file) => sum + file.size, 0);

    return {
      totalFiles: files.total,
      totalSize,
      filesByType,
      recentUploads: files.files.slice(0, 5),
    };
  }
}