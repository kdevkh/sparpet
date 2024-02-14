import express from 'express';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import refreshRouter from './routers/refresh.router.js';
import userRouter from './routers/user.router.js';
import postRouter from './routers/post.router.js';
import commentRouter from './routers/comment.router.js';
import likeRouter from './routers/like.router.js';
import errorHandlingMiddleware from './middleware/error-handling.middleware.js';
import 'dotenv/config';
import session from 'express-session';
import passport from 'passport';

const app = express();
const PORT = 3000;

app.use(bodyParser.json());
app.use(cookieParser());

app.use('/refresh', refreshRouter);
app.use('/users', userRouter);
app.use('/posts', postRouter, commentRouter);
app.use('/like', likeRouter);
app.use(errorHandlingMiddleware);

app.listen(PORT, () => {
  console.log(`sparpet app listening on port ${PORT}`);
});
