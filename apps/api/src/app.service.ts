import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'GETX API · Get X. Get gaming. · Prompt 1: scaffold OK';
  }
}
