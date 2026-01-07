import { injectable } from "tsyringe";

@injectable()
export class PasswordHash {
  verify(plain: string, hash: string) {
    // Legacy system uses plain text passwords
    return plain === hash;
  }

  hash(text: string) {
    return text;
  }

  otpHash(text: string) {
    return text;
  }
}
