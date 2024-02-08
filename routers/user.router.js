import express from 'express';
import passport from 'passport';
import session from 'express-session';
import { Strategy as naverStrategy } from 'passport-naver';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import jwtValidate from '../middleware/jwtValidate.middleware.js';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();
const router = express.Router();

const ACCESS_TOKEN_SECRET_KEY = 'secretKey';

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
    where: { email, password },
  });
  if (!user) {
    return res.status(401).json({ message: '잘못된 로그인 정보입니다.' });
  }
  const accessToken = jwt.sign({ userId: user.id }, ACCESS_TOKEN_SECRET_KEY, {
    expiresIn: '12h',
  });
  return res.json({ accessToken });
});

// 내 정보 조회
router.get('/profile', jwtValidate, (req, res, next) => {
  const user = res.locals.user;

  return res.json({
    email: user.email,
    name: user.name,
  });
});

// naver 로그인 연동

const clientID = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;
const callbackURL = process.env.CALLBACK_URL

passport.use(new naverStrategy({
  clientID,
  clientSecret,
  callbackURL
}, async (accessToken, refreshToken, profile, done) => {
  try{  
    const naverId = profile.id;
    const naverEmail = profile.email[0].value;
    const naverDisplayName = profile.displayname;
    // const provider = 'naver',
    // const naver = profile._json
  
  const newUser = await prisma.users.create({
    data: {
      userId: naverId,
      email: naverEmail,
      name: naverDisplayName,
    }
  });
  
  done(null, newUser);

  } catch (error){
    console.error('Error creating user: ', error);
    done(error, null);
  }

  passport.serializeUser(function(user, done) {
    done(null, user);
  });
  
  passport.deserializeUser(function(req, user, done) {
    req.session.sid = user.name;
    console.log("Session Check" +req.session.sid);
    done(null, user);
  });

}));
// function(accessToken, refreshToken, profile, done) {
//   console.log("naver profile", accessToken, refreshToken, profile);
//   User.findOne({
//       'naver.id': profile.id
//   }, function(err, user) {
//       if (!user) {
//           user = new user({
//               name: profile.displayName,
//               email: profile.emails[0].value,
//               username: profile.displayName,
//               provider: 'naver',
//               naver: profile._json
//           });
//           user.save(function(err) {
//               if (err) console.log(err);
//               return done(err, user);
//           });
//       } else {
//           return done(err, user);
//       }
//   });
// }
// ));



export default router;
