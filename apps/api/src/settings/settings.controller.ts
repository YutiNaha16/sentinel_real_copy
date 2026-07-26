import { Body, Controller, Get, Put } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../auth/current-user.decorator';
import { SettingsService } from './settings.service';
import { UpdateEscalationDto, UpdateGeneralDto, UpdateMappingDto } from './settings.dto';

@Controller('config')
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Roles(Role.ADMIN)
  @Get()
  get() {
    return this.settings.get();
  }

  @Roles(Role.ADMIN)
  @Put('escalation')
  updateEscalation(@Body() dto: UpdateEscalationDto, @CurrentUser() user: AuthenticatedUser) {
    return this.settings.updateEscalation(dto.levels, user);
  }

  @Roles(Role.ADMIN)
  @Put('severity-mapping')
  updateMapping(@Body() dto: UpdateMappingDto, @CurrentUser() user: AuthenticatedUser) {
    return this.settings.updateMapping(dto.mapping, user);
  }

  @Roles(Role.ADMIN)
  @Put('general')
  updateGeneral(@Body() dto: UpdateGeneralDto, @CurrentUser() user: AuthenticatedUser) {
    return this.settings.updateGeneral(dto, user);
  }
}
