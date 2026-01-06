import bcrypt from "bcryptjs";
import { injectable } from "tsyringe";
const SALT_ROUND = process.env.SALT_ROUND;
const FORGOT_PASS_SECRET = process.env.FORGOT_PASS_SECRET;

@injectable()
export class PasswordHash {
  private salt_round = SALT_ROUND ? parseInt(SALT_ROUND) : 10;
  verify(plain: string, hash: string) {
    return bcrypt.compareSync(plain, hash);
  }

  hash(text: string) {
    return bcrypt.hashSync(text, bcrypt.genSaltSync(this.salt_round));
  }

  otpHash(text: string) {
    return bcrypt.hashSync(
      text + FORGOT_PASS_SECRET,
      bcrypt.genSaltSync(this.salt_round)
    );
  }
}
