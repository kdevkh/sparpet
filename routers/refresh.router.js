import express from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const router = express.Router();

router.post('/token', async (req, res, next) => {
  const { refreshToken } = req.body;

  const token = jwt.verify(refreshToken, 'refreshKey');
  if (!token.userId) {
    return res.status(401).end();
  }

  const user = await prisma.users.findFirst({
    where: {
      id: token.userId,
    },
  });

  if (!user) {
    return res.status(401).end();
  }

  const newAccessToken = jwt.sign({ userId: user.id }, 'secretKey', {
    expiresIn: '12h',
  });
  const newRefreshToken = jwt.sign({ userId: user.id }, 'refreshKey', {
    expiresIn: '7d',
  });

  return res.json({
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
  });
});

export default router;
