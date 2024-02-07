import express from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const router = express.Router();

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
      password,
      name,
      phone,
      gender,
      birth,
      profileImage,
    },
  });

  return res.status(201).json({ message: '회원가입이 완료되었습니다.' });
});

export default router;
