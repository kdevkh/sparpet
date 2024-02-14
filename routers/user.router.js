import express from 'express';
import { PrismaClient } from '@prisma/client';
import sha256 from 'crypto-js/sha256.js';
import jwt from 'jsonwebtoken';
import jwtValidate from '../middleware/jwtValidate.middleware.js';
import nodemailer from 'nodemailer';
import verifiedEmail from '../middleware/verifiedEmail.middleware.js';

import multer from 'multer';
import {
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import sharp from 'sharp';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { s3, randomName, bucketName } from '../utils/aws.js';
import passport from 'passport';
import { Strategy as naverStrategy } from 'passport-naver';
import { Strategy as KakaoStrategy } from 'passport-kakao';
import { Strategy as googleStrategy} from 'passport-google-oauth20';
import dotenv from 'dotenv';

dotenv.config();

// passport-naver
const clientID = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;
const callbackURL = process.env.CALLBACK_URL;

passport.use(
  new naverStrategy(
    {
      clientID,
      clientSecret,
      callbackURL,
    },
    async (accessToken, refreshToken, profile, done) => {
      console.log(
        'naverProfile',
        'access',
        accessToken,
        're',
        refreshToken,
        profile
      );
      console.log(profile);
      try {
        const naverId = profile.id;
        const naverEmail = profile.emails && profile.emails[0].value;
        const naverDisplayName = profile.displayName;
        const naverGender = profile.gender;
        const naverBirth = profile.birthday;
        const naverPhone = profile.phone;

        const newUser = await prisma.users.create({
          data: {
            clientId: naverId,
            email: naverEmail,
            name: naverDisplayName,
            gender: naverGender,
            birth: naverBirth,
            phone: naverPhone,
          },
        });

        done(null, newUser);
      } catch (error) {
        console.error('Error creating user: ', error);
        done(error, null);
      }

      passport.serializeUser(function (user, done) {
        done(null, user);
      });

      passport.deserializeUser(function (req, user, done) {
        req.session.sid = user.name;
        console.log('Session Check' + req.session.sid);
        done(null, user);
      });
    }
  )
);

// multer
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const prisma = new PrismaClient();
const router = express.Router();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'nodejs.testermail@gmail.com',
    pass: 'lbyz etni yrts fndy',
  },
});

// 회원가입
router.post(
  '/sign-up',
  upload.single('profileImage'),
  async (req, res, next) => {
    const { email, password, passwordConfirm, name, phone, gender, birth } =
      req.body;
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
    const imageName = randomName();
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
        isVerified: false,
      },
    });

    const url = `http://localhost:3000/users/verification?email=${email}`;
    await transporter.sendMail({
      from: 'nodejs.testermail@gmail.com',
      to: email,
      subject: '[스파르펫] 회원가입 인증코드',
      html: `<h3>스파르펫 회원가입 인증코드</h3> <p>아래의 "이메일 인증" 링크를 클릭해주세요</p>
      <a href="${url}">이메일 인증해버리기</a>`,
    });

    return res.status(201).json({ message: '회원가입이 완료되었습니다.' });
  }
);

// 회원가입 email 인증
router.get('/verification', async (req, res, next) => {
  try {
    const { email } = req.query;
    if (!email)
      return res.status(412).send({ message: '비정상적인 접근입니다.' });

    const verifiedEmail = await prisma.users.findFirst({
      where: { email: email },
      select: {
        email: true,
        isVerified: true,
      },
    });

    if (!verifiedEmail)
      return res.status(412).send({
        message: '요청된 이메일이 아닙니다.',
      });
    if (verifiedEmail.isVerified)
      return res.status(412).send({ message: '이미 인증된 이메일 입니다.' });

    await prisma.users.update({
      where: { email: email },
      data: { isVerified: true },
    });

    return res.status(201).send({ message: '이메일 인증이 완료되었습니다.' });
  } catch (err) {
    console.error(err);
    return res.status(400).send({ message: '오류가 발생하였습니다.' });
  }
});

// 로그인
router.post('/sign-in', async (req, res, next) => {
  const { clientId, email, password } = req.body;
  let user;

  if (clientId) {
    user = await prisma.users.findFirst({
      where: {
        clientId,
      },
    });
    if (!user)
      return res.status(401).json({ message: '존재하지 않는 이메일입니다.' });
  } else {
    if (!email) {
      return res.status(400).json({ message: '이메일은 필수값입니다.' });
    }
    if (!password) {
      return res.status(400).json({ message: '비밀번호는 필수값입니다.' });
    }

    user = await prisma.users.findFirst({
      where: {
        email,
        password: sha256(password).toString(),
      },
    });
    if (!user) {
      return res.status(401).json({ message: '잘못된 로그인 정보입니다.' });
    }
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
  res.cookie('isVerified', user.isVerified);

  return res.json({ accessToken, refreshToken });
});

// 로그아웃
router.post('/sign-out', async (req, res, next) => {
  res.clearCookie('accessToken');
  res.clearCookie('refreshToken');
  return res.json({ message: '로그아웃 되었습니다.' });
});

// 내 정보 조회
router.get('/profile', jwtValidate, verifiedEmail, async (req, res, next) => {
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
router.patch(
  '/profile',
  jwtValidate,
  verifiedEmail,
  upload.single('profileImage'),
  async (req, res, next) => {
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

    let imageName = user.profileImage;
    // 사용자가 profileImage를 수정하려고 한다면,
    if (req.file) {
      let params, command;
      // 만약 이미 profileImage가 존재했다면,
      // s3에서 기존의 profileImage 저장된 것 삭제
      if (imageName) {
        params = {
          Bucket: bucketName,
          Key: imageName,
        };
        command = new DeleteObjectCommand(params);
        await s3.send(command);
      }
      // s3에 저장
      // 그 전에 320x320px로 리사이징
      const imageBuffer = await sharp(req.file.buffer)
        .resize({ height: 320, width: 320, fit: 'contain' })
        .toBuffer();
      imageName = randomName();
      params = {
        Bucket: bucketName,
        Key: imageName,
        Body: imageBuffer,
        ContentType: req.file.mimetype,
      };
      command = new PutObjectCommand(params);
      await s3.send(command); // command를 s3으로 보낸다.
    }

    const updatedUser = await prisma.users.update({
      where: { id: userId },
      data: {
        profileImage: imageName,
        name,
        phone,
        gender,
        birth,
        password: hashedNewPassword,
      },
    });

    return res.json({
      message: '사용자 정보가 업데이트되었습니다.',
      data: updatedUser,
    });
  }
);

/** 내가 팔로잉하는 유저 목록 조회 */
router.get('/following', jwtValidate, verifiedEmail, async (req, res, next) => {
  try {
    const followedByUserId = res.locals.user.id; // me
    const followingUsers = await prisma.users.findMany({
      where: {
        following: {
          some: {
            followedById: +followedByUserId,
          },
        },
      },
      select: {
        id: true,
        clientId: true,
        email: true,
      },
    });
    return res.status(200).json({ followingUsers });
  } catch (err) {
    next(err);
  }
});

/** 내 팔로워 목록 조회*/
router.get('/follower', jwtValidate, verifiedEmail, async (req, res, next) => {
  try {
    const followingUserId = res.locals.user.id; // me
    const followers = await prisma.users.findMany({
      where: {
        followedBy: {
          some: {
            followingId: +followingUserId,
          },
        },
      },
      select: {
        id: true,
        clientId: true,
        email: true,
      },
    });

    return res.status(200).json({ followers });
  } catch (err) {
    next(err);
  }
});

export default router;
