import express from 'express';
import { PrismaClient } from '@prisma/client';
import sha256 from 'crypto-js/sha256.js';
import jwt from 'jsonwebtoken';
import jwtValidate from '../middleware/jwtValidate.middleware.js';

const prisma = new PrismaClient();
const router = express.Router();

// 회원가입
router.post('/sign-up', async (req, res, next) => {
  const {
    email,
    password,
    passwordConfirm,
    name,
    phone,
    gender,
    birth,
    profileImage,
  } = req.body;
  if (!email) {
    return res.status(400).json({ message: '이메일은 필수값입니다.' });
  }
  if (!password) {
    return res.status(400).json({ message: '비밀번호는 필수값입니다.' });
  }
  if (!passwordConfirm) {
    return res.status(400).json({ message: '비밀번호 확인은 필수값입니다.' });
  }
  if (password.email < 6) {
    return res.status(400).json({ message: '비밀번호는 최소 6자 이상입니다.' });
  }
  if (password !== passwordConfirm) {
    return res.status(400).json({ message: '비밀번호가 일치하지 않습니다.' });
  }
  if (!name) {
    return res.status(400).json({ message: '이름은 필수값입니다.' });
  }
  if (!gender) {
    return res.status(400).json({ message: '성별을 입력해주세요.' });
  }
  if (!birth) {
    return res.status(400).json({ message: '생년월일을 입력해주세요.' });
  }

  const user = await prisma.users.findFirst({
    where: {
      email,
    },
  });
  if (user) {
    return res
      .status(400)
      .json({ success: false, message: '사용할 수 없는 이메일입니다.' });
  }
  await prisma.users.create({
    data: {
      email,
      password: sha256(password).toString(),
      name,
      phone,
      gender,
      birth,
      profileImage,
    },
  });

  return res.status(201).json({ message: '회원가입이 완료되었습니다.' });
});

// 로그인
router.post('/sign-in', async (req, res, next) => {
  const { email, password } = req.body;
  if (!email) {
    return res.status(400).json({ message: '이메일은 필수값입니다.' });
  }
  if (!password) {
    return res.status(400).json({ message: '비밀번호는 필수값입니다.' });
  }

  const user = await prisma.users.findFirst({
    where: {
      email,
      password: sha256(password).toString(),
    },
  });
  if (!user) {
    return res.status(401).json({ message: '잘못된 로그인 정보입니다.' });
  }
  const accessToken = jwt.sign({ userId: user.id }, 'secretKey', {
    expiresIn: '12h',
  });
  const refreshToken = jwt.sign({ userId: user.id }, 'refreshKey', {
    expiresIn: '7d',
  });
  return res.json({ accessToken, refreshToken });
});

// 내 정보 조회
router.get('/profile', jwtValidate, (req, res, next) => {
  const user = res.locals.user;

  return res.json({
    profileImage: user.profileImage,
    email: user.email,
    name: user.name,
    phone: user.phone,
    gender: user.gender,
    birth: user.birth,
  });
});

export default router;
