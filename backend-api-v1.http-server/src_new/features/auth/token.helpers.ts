import jwt from "jsonwebtoken";
import { singleton } from "tsyringe";
const { JWT_SECRET } = process.env;

type TokenData = {
  id: string;
  email: string;
  username: string;
};

@singleton()
export class Token {
  generate(data: TokenData) {
    const token = jwt.sign(
      {
        id: data.id,
        email: data.email,
        username: data.username,
        iat: new Date().getTime(),
        exp: Date.now() + 1000 * 60 * 60,
      },
      JWT_SECRET ? JWT_SECRET : ""
    );
    return token;
  }
}
