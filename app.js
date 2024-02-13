import express from 'express';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import refreshRouter from './routers/refresh.router.js';
import userRouter from './routers/user.router.js';
import postRouter from './routers/post.router.js';
import commentRouter from './routers/comment.router.js';
import likeRouter from './routers/like.router.js';
import errorHandlingMiddleware from './middleware/error-handling.middleware.js';
import 'dotenv/config'
import session from 'express-session';
import passport from 'passport';

const app = express();
const PORT = 3000;

app.use(bodyParser.json());
app.use(cookieParser());

// passport-naver
app.use(session({ secret: 'secret_key'}));
app.use(passport.initialize());
app.use(passport.session());
app.use(express.static('public'));

// app.get('/', function(req, res){
// 	res.render('index', { user: req.user });
// });


// app.get('/login', function(req, res){
// 	res.render('login', { user: req.user });
// });

// Setting the naver oauth routes
app.get('/auth/naver', 
	passport.authenticate('naver', null), function(req, res) { // @todo Additional handler is necessary. Remove?
    	console.log('/auth/naver failed, stopped');
    });

// creates an account if no account of the new user
app.get('/auth/naver/callback', 
	passport.authenticate('naver', {
        failureRedirect: '#!/auth/login'
    }), function(req, res) {
    	res.redirect('/'); 
    });

app.get('/logout', function(req, res){
	req.logout();
	res.redirect('/');
});

// passport-kakao
app.get('/auth/kakao', passport.authenticate('kakao', { state: 'myStateValue' }));
app.get(
  '/auth/kakao/callback',
  passport.authenticate('kakao', {
    failureRedirect: '/',
  }),
  (req, res) => {
    res.redirect('/');
  }
);

app.use('/refresh', refreshRouter);
app.use('/users', userRouter);
app.use('/posts', postRouter, commentRouter);
app.use('/like', likeRouter);
app.use(errorHandlingMiddleware);

app.listen(PORT, () => {
  console.log(`sparpet app listening on port ${PORT}`);
});