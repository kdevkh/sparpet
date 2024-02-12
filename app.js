import express from 'express';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import refreshRouter from './routers/refresh.router.js';
import userRouter from './routers/user.router.js';
import postRouter from './routers/post.router.js';
import commentRouter from './routers/comment.router.js';

const app = express();
const PORT = 3000;

app.use(bodyParser.json());
app.use(cookieParser());

app.use('/refresh', refreshRouter);
app.use('/users', userRouter);
app.use('/posts', postRouter, commentRouter);

app.listen(PORT, () => {
  console.log(`sparpet app listening on port ${PORT}`);
});
