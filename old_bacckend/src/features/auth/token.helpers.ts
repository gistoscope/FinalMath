import jwt, { JwtPayload } from "jsonwebtoken";
import { singleton } from "tsyringe";

type TokenData = {
  id: string;
  role: string;
  username: string;
};
const { JWT_SECRET } = process.env;
@singleton()
export class Token {
  generate(data: TokenData) {
    const token = jwt.sign(
      {
        id: data.id,
        role: data.role,
        username: data.username,
        iat: new Date().getTime(),
        exp: Date.now() + 1000 * 60 * 60,
      },
      JWT_SECRET ? JWT_SECRET : ""
    );
    return token;
  }

  validateToken(token: string): TokenData | null {
    try {
      const decoded = jwt.verify(
        token,
        JWT_SECRET ? JWT_SECRET : ""
      ) as JwtPayload & TokenData;

      return {
        id: decoded.id,
        role: decoded.role,
        username: decoded.username,
      };
    } catch (error) {
      // Token is expired, malformed, or signature is invalid
      return null;
    }
  }
}
