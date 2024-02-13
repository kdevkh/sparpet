import express from 'express';
import { PrismaClient } from '@prisma/client';
import sha256 from 'crypto-js/sha256.js';
import jwt from 'jsonwebtoken';
import jwtValidate from '../middleware/jwtValidate.middleware.js';

import dotenv from 'dotenv';

import multer from 'multer';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import crypto from 'crypto';
import sharp from 'sharp';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

import nodemailer from 'nodemailer';

dotenv.config();

const bucketName = process.env.BUCKET_NAME;
const bucketRegion = process.env.BUCKET_REGION;
const accessKey = process.env.AWS_ACCESS_KEY;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

const s3 = new S3Client({
  credentials: {
    accessKeyId: accessKey,
    secretAccessKey: secretAccessKey,
  },
  region: bucketRegion,
});

// multer
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const prisma = new PrismaClient();
const router = express.Router();

/** 랜덤 문자열 생성 함수 for 'unique' imageName to put in s3 bucket */
const randomImageName = (bytes = 32) =>
  crypto.randomBytes(bytes).toString('hex');

// 회원가입 email 인증
router.post('/sendcode', async (req, res, next) => {
  const { email } = req.body;
  const user = await prisma.users.findUnique({ where: { email } });

  if (!user.isVerified) {
    const verifyToken = createVerifyToken(user.email);
    res.cookie('verification', `Bearer ${verifyToken}`);
    await emailSender(email, verifyToken);
    try {
      res.json({
        ok: true,
        msg: '이메일이 성공적으로 전송되었습니다.',
        token: verifyToken,
      });
    } catch (error) {
      console.error('이메일 전송에 실패했습니다:', error);
      res.status(500).json({ ok: false, msg: '이메일 전송에 실패했습니다.' });
    }
  } else {
    res.status(400).json({ ok: false, msg: '이미 인증 완료된 이메일입니다.' });
  }
});

//   // 인증번호 생성
//   let generatedCode = function generateRandomCode() {
//     const min = 100000;
//     const max = 999999;
//     return Math.floor(Math.random() * (max - min + 1)) + min;
//   };

//   const transporter = nodemailer.createTransport({
//     service: 'gmail',
//     auth: {
//       user: 'nodejs.testermail@gmail.com',
//       pass: 'lbyz etni yrts fndy',
//     },
//   });

//   const mailOptions = {
//     from: 'nodejs.testermail@gmail.com',
//     to: email,
//     subject: '스파르펫 회원가입 인증코드',
//     text: `회원가입 인증 코드는 ${generatedCode}입니다`,
//   };

//   transporter.sendMail(mailOptions, (error, info) => {
//     console.log('info', info);
//     if (error) {
//       res.json({
//         success: false,
//         message: ' 메일 전송에 실패하였습니다. ',
//       });
//       transporter.close();
//       return;
//     } else {
//       res.json({ success: true, message: ' 메일 전송에 성공하였습니다. ' });
//       transporter.close();
//       return;
//     }
//   });
// });

// 회원가입
router.post(
  '/sign-up',
  upload.single('profileImage'),
  async (req, res, next) => {
    const {
      email,
      password,
      passwordConfirm,
      name,
      phone,
      gender,
      birth,
      // verificationCode,
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
      return res
        .status(400)
        .json({ message: '비밀번호는 최소 6자 이상입니다.' });
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
    // if (verificationCode !== generatedCode.toString()) {
    //   return res
    //     .status(400)
    //     .json({ message: '인증 코드가 올바르지 않습니다.' });
    // }

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

    // profileImage가 req에 존재하면,
    const imageName = randomImageName();
    if (req.file) {
      // s3에 저장
      // 그 전에 320x320px로 리사이징
      const imageBuffer = await sharp(req.file.buffer)
        .resize({ height: 320, width: 320, fit: 'contain' })
        .toBuffer();
      const params = {
        Bucket: bucketName,
        Key: imageName,
        Body: imageBuffer,
        ContentType: req.file.mimetype,
      };
      const command = new PutObjectCommand(params);
      await s3.send(command); // command를 s3으로 보낸다.
    }

    await prisma.users.create({
      data: {
        email,
        password: sha256(password).toString(),
        name,
        phone,
        gender,
        birth,
        profileImage: imageName,
      },
    });

    return res.status(201).json({ message: '회원가입이 완료되었습니다.' });
  }
);

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
  // 쿠키에 저장
  res.cookie('accessToken', accessToken);
  res.cookie('refreshToken', refreshToken);

  return res.json({ message: '로그인 성공' });
});

// 로그아웃
router.post('/sign-out', async (req, res, next) => {
  res.clearCookie('accessToken');
  res.clearCookie('refreshToken');
  return res.json({ message: '로그아웃 되었습니다.' });
});

// 내 정보 조회
router.get('/profile', jwtValidate, async (req, res, next) => {
  const user = res.locals.user;

  let imageUrl = '';
  if (user.profileImage) {
    // s3에서 image 이름으로 사용자가 해당 이미지에 액세스할 수 있는 한시적인 url 생성
    const getObjectParams = {
      Bucket: bucketName,
      Key: user.profileImage,
    };
    const command = new GetObjectCommand(getObjectParams);
    imageUrl = await getSignedUrl(s3, command, { expiresIn: 3600 }); // 1h후 만료
  }

  return res.json({
    profileImage: user.profileImage,
    email: user.email,
    name: user.name,
    phone: user.phone,
    gender: user.gender,
    birth: user.birth,
    profileImageUrl: imageUrl,
  });
});

// 내 정보 수정
router.patch('/profile', jwtValidate, async (req, res, next) => {
  const userId = res.locals.user.id;
  const {
    profileImage,
    name,
    phone,
    gender,
    birth,
    newPassword,
    newPasswordConfirm,
  } = req.body;

  if (
    !profileImage &&
    !name &&
    !phone &&
    !gender &&
    !birth &&
    !newPassword &&
    !newPasswordConfirm
  ) {
    return res.status(400).json({ message: '수정할 정보를 입력해주세요.' });
  }

  if (newPassword !== newPasswordConfirm) {
    return res.status(400).json({ message: '비밀번호가 일치하지 않습니다.' });
  }

  const user = await prisma.users.findFirst({
    where: { id: userId },
  });
  if (!user) {
    return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
  }

  const hashedNewPassword = sha256(newPassword).toString();

  await prisma.users.update({
    where: { id: userId },
    data: {
      profileImage,
      name,
      phone,
      gender,
      birth,
      password: hashedNewPassword,
    },
  });

  return res.json({ message: '사용자 정보가 업데이트되었습니다.' });
});

export default router;
