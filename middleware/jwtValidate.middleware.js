import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const ACCESS_TOKEN_SECRET_KEY = 'secretKey';

const jwtValidate = async (req, res, next) => {
  try {
    const authorization = req.headers.authorization;
    if (!authorization) {
      throw new Error('인증 정보가 틀렸습니다.');
    }

    const [tokenType, tokenValue] = authorization.split(' ');
    if (tokenType !== 'Bearer') {
      throw new Error('인증 정보가 틀렸습니다.');
    }
    if (!tokenValue) {
      throw new Error('인증 정보가 틀렸습니다.');
    }

    const token = jwt.verify(tokenValue, ACCESS_TOKEN_SECRET_KEY);
    if (!token.userId) {
      throw new Error('인증 정보가 틀렸습니다.');
    }

    const user = await prisma.users.findFirst({
      where: { id: token.userId },
    });
    if (!user) {
      throw new Error('인증 정보가 틀렸습니다.');
    }

    res.locals.user = user;
    console.log(user);

    next();
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }
};

export default jwtValidate;
