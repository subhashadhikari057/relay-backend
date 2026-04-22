import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';

@Injectable()
export class PasswordService {
  hashPassword(plainPassword: string) {
    return argon2.hash(plainPassword, { type: argon2.argon2id });
  }

  verifyPassword(passwordHash: string, plainPassword: string) {
    return argon2.verify(passwordHash, plainPassword);
  }
}
