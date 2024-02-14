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

const app = express();
const PORT = 3000;

app.use(bodyParser.json());
app.use(cookieParser());

// passport-naver
app.use(session({ secret: 'secret_key' }));
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

app.use('/refresh', refreshRouter);
app.use('/users', userRouter);
app.use('/posts', postRouter, commentRouter);
app.use('/like', likeRouter);

app.listen(PORT, () => {
  console.log(`sparpet app listening on port ${PORT}`);
});
