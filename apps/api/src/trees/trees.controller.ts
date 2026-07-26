import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Res,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import type { Response } from 'express';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../auth/current-user.decorator';
import { TreesService } from './trees.service';
import { AddNodeDto, EditNodeDto, MoveNodeDto } from './dto/node.dto';
import { UploadCsvDto } from './dto/upload.dto';
import { ActivateDto } from './dto/activate.dto';

@Controller('trees')
export class TreesController {
  constructor(private readonly trees: TreesService) {}

  @Roles(Role.ADMIN, Role.MEMBER)
  @Get('it-cyber')
  getItCyber(@CurrentUser() user: AuthenticatedUser) {
    return this.trees.getItCyber(user);
  }

  // --- Feature 009: admin editing ---

  @Roles(Role.ADMIN)
  @Post('it-cyber/nodes')
  add(@Body() dto: AddNodeDto, @CurrentUser() user: AuthenticatedUser) {
    return this.trees.addNode(dto, user);
  }

  @Roles(Role.ADMIN)
  @Patch('it-cyber/nodes/:id')
  edit(@Param('id') id: string, @Body() dto: EditNodeDto, @CurrentUser() user: AuthenticatedUser) {
    return this.trees.editNode(id, dto, user);
  }

  @Roles(Role.ADMIN)
  @Delete('it-cyber/nodes/:id')
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.trees.removeNode(id, user);
  }

  @Roles(Role.ADMIN)
  @Post('it-cyber/nodes/:id/move')
  @HttpCode(HttpStatus.OK)
  move(@Param('id') id: string, @Body() dto: MoveNodeDto, @CurrentUser() user: AuthenticatedUser) {
    return this.trees.moveNode(id, dto.direction, user);
  }

  @Roles(Role.ADMIN)
  @Post('it-cyber/upload')
  @HttpCode(HttpStatus.OK)
  upload(@Body() dto: UploadCsvDto, @CurrentUser() user: AuthenticatedUser) {
    return this.trees.uploadCsv(dto.csv, user);
  }

  // --- Initiate Call Tree: broadcast/cascade alert (Admin + Member) ---
  @Roles(Role.ADMIN, Role.MEMBER)
  @Post('it-cyber/activate')
  @HttpCode(HttpStatus.OK)
  activate(@Body() dto: ActivateDto, @CurrentUser() user: AuthenticatedUser) {
    return this.trees.activate(dto.scope, dto.message, user);
  }

  @Roles(Role.ADMIN)
  @Get('it-cyber/export.csv')
  async export(@Res() res: Response) {
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="it-cyber-matrix.csv"');
    res.send(await this.trees.exportCsv());
  }

  @Roles(Role.ADMIN)
  @Get('it-cyber/template.csv')
  template(@Res() res: Response) {
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="it-cyber-template.csv"');
    res.send(this.trees.sampleTemplate());
  }
}
