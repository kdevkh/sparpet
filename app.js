import express from 'express';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import refreshRouter from './routers/refresh.router.js';
import userRouter from './routers/user.router.js';
import postRouter from './routers/post.router.js';
import commentRouter from './routers/comment.router.js';
import likeRouter from './routers/like.router.js';
import 'dotenv/config';
import session from 'express-session';
import passport from 'passport';
import methodOverride  from'method-override';
import { PrismaClient } from '@prisma/client';
import jwtValidate from './middleware/jwtValidate.middleware.js';
import verifiedEmail from './middleware/verifiedEmail.middleware.js';

const app = express();
const PORT = 3000;

const prisma = new PrismaClient();
app.use(methodOverride('_method'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static('public'));
app.use('/refresh', refreshRouter);
app.use('/users', userRouter);
app.use('/posts', postRouter, commentRouter);
app.use('/like', likeRouter);
// app.use(errorHandlingMiddleware);

app.get('/post/create', async (req,res,next) => {
  res.render('postcreate.ejs');
})

app.get('/post/:postId/edit', jwtValidate, verifiedEmail, async (req,res,next) => {
  const {postId} = req.params
  const user = res.locals.user;

  if (!postId) {
    return res.status(400).json({
      success: false,
      message: 'postId는 필수값입니다.',
    });
  }

  const post = await prisma.posts.findFirst({
    where: {
      id: Number(postId),
    }
  })
  if (post.userId !== user.id) {
    return res.status(400).send(`<script>alert('게시물 수정 권한이 없습니다.');window.location.replace('/posts/${post.id}')</script>`);
  }

  res.render('postedit.ejs',{ post: post });
})

app.get('/sign-in', async (req,res,next) => {
  res.render('sign-in.ejs');
})

app.get('/sign-up', async (req,res,next) => {
  res.render('sign-up.ejs');
})

// passport-naver
app.use(session({ secret: 'secret_key', resave: true, saveUninitialized: true,}));
app.use(passport.initialize());
app.use(passport.session());
app.use(express.static('public'));

passport.serializeUser(function (user, done) {
  done(null, user);
});

passport.deserializeUser(function (req, user, done) {
  req.session.sid = user.name;
  console.log('Session Check' + req.session.sid);
  done(null, user);
});

// Setting the naver oauth routes
app.get(
  '/auth/naver',
  passport.authenticate('naver', null),
  function (req, res) {
    // @todo Additional handler is necessary. Remove?
    console.log('/auth/naver failed, stopped');
  }
);

// creates an account if no account of the new user
app.get(
  '/auth/naver/callback',
  passport.authenticate('naver', {
    failureRedirect: '#!/auth/login',
  }),
  (req, res) => {
    res.redirect('/');
  }
);

// passport-kakao
app.get(
  '/auth/kakao',
  passport.authenticate('kakao', { state: 'myStateValue' })
);
app.get(
  '/auth/kakao/callback',
  passport.authenticate('kakao', {
    failureRedirect: '/',
  }),
  (req, res) => {
    res.redirect('/');
  }
);

// passport-google
app.get(
  '/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);
app.get(
  '/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/' }),
  (req, res) => {
    res.redirect('/');
  }
);
app.get('/logout', function (req, res) {
  req.logout();
  req.session.destroy();
  res.redirect('/');
});

app.listen(PORT, () => {
  console.log(`sparpet app listening on port ${PORT}`);
});