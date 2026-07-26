import { Controller, Get } from '@nestjs/common';
import { CurrentUser, AuthenticatedUser } from '../auth/current-user.decorator';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  // Any authenticated user (Reporter is scoped to their own in the service).
  @Get()
  feed(@CurrentUser() user: AuthenticatedUser) {
    return this.notifications.feed(user);
  }
}
