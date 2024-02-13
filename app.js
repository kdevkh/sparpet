import express from 'express';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import refreshRouter from './routers/refresh.router.js';
import userRouter from './routers/user.router.js';
import postRouter from './routers/post.router.js';
import commentRouter from './routers/comment.router.js';
import followRouter from './routers/follow.router.js';
import likeRouter from './routers/like.router.js';
import 'dotenv/config'

const app = express();
const PORT = 3000;

app.use(bodyParser.json());
app.use(cookieParser());
app.use(express.static('public'));

app.use('/refresh', refreshRouter);
app.use('/users', userRouter);
app.use('/posts', postRouter, commentRouter);
app.use('/follow', followRouter);
app.use('/like', likeRouter)

app.listen(PORT, () => {
  console.log(`sparpet app listening on port ${PORT}`);
});

app.get('/post/create', async (req,res,next) => {
  res.render('postcreate.ejs');
})

app.get('/sign-in', async (req,res,next) => {
  res.render('sign-in.ejs');
})