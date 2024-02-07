import express from 'express';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import userRouter from './routers/user.router.js';
import postRouter from './routers/post.router.js';
import commentRouter from './routers/comment.router.js';

const app = express();
const PORT = 3000;

app.use(bodyParser.json());
app.use(cookieParser());

app.use('/users', userRouter);
app.use('/posts', postRouter);
app.use('/comments', commentRouter);

app.listen(PORT, () => {
  console.log(`sparpet app listening on port ${PORT}`);
});
