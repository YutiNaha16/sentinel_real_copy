import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../auth/current-user.decorator';
import { IncidentsService } from './incidents.service';
import { EmailService } from '../email/email.service';
import { CreateIncidentDto } from './dto/create-incident.dto';
import { AcknowledgeDto } from './dto/acknowledge.dto';
import { CloseDto } from './dto/close.dto';
import { OverrideDto } from './dto/override.dto';

@Controller('incidents')
export class IncidentsController {
  constructor(
    private readonly incidents: IncidentsService,
    private readonly email: EmailService,
  ) {}

  @Roles(Role.ADMIN, Role.MEMBER, Role.REPORTER)
  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateIncidentDto) {
    return this.incidents.create(user, dto);
  }

  @Roles(Role.ADMIN, Role.MEMBER, Role.REPORTER, Role.AUDITOR)
  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.incidents.list(user);
  }

  // --- Feature 002: live tree + acknowledgement (Admin/Member only) ---

  @Roles(Role.ADMIN, Role.MEMBER)
  @Get('active')
  active() {
    return this.incidents.getActive();
  }

  @Roles(Role.ADMIN, Role.MEMBER)
  @Get(':reference/tree')
  tree(@Param('reference') reference: string) {
    return this.incidents.getTree(reference);
  }

  @Roles(Role.ADMIN, Role.MEMBER)
  @Get(':reference/emails')
  emails(@Param('reference') reference: string) {
    return this.email.getInbox(reference);
  }

  @Roles(Role.ADMIN, Role.MEMBER)
  @Post(':reference/ack')
  @HttpCode(HttpStatus.OK)
  acknowledge(
    @Param('reference') reference: string,
    @Body() dto: AcknowledgeDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.incidents.acknowledge(reference, dto.nodeId, user);
  }

  // --- Feature 004: lifecycle ---

  @Roles(Role.ADMIN, Role.MEMBER)
  @Post(':reference/close')
  @HttpCode(HttpStatus.OK)
  close(
    @Param('reference') reference: string,
    @Body() dto: CloseDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.incidents.close(reference, dto.reason, user);
  }

  @Roles(Role.ADMIN, Role.MEMBER)
  @Post(':reference/override')
  @HttpCode(HttpStatus.OK)
  override(
    @Param('reference') reference: string,
    @Body() dto: OverrideDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.incidents.override(reference, dto.severity, dto.reason, user);
  }

  @Roles(Role.ADMIN, Role.MEMBER, Role.REPORTER)
  @Post(':reference/reopen')
  @HttpCode(HttpStatus.OK)
  reopen(@Param('reference') reference: string, @CurrentUser() user: AuthenticatedUser) {
    return this.incidents.reopen(reference, user);
  }
}
