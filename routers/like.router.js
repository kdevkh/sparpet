import express from 'express';
import { PrismaClient } from '@prisma/client';
import jwtValidate from '../middleware/jwtValidate.middleware.js';
import verifiedEmail from '../middleware/verifiedEmail.middleware.js';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { s3 } from '../utils/aws.js';
const prisma = new PrismaClient();
const router = express.Router();

// 게시물 좋아요
router.post(
  '/post/:postId',
  jwtValidate,
  verifiedEmail,
  async (req, res, next) => {
    const postId = req.params.postId;
    const user = res.locals.user;

    const post = await prisma.posts.findFirst({ where: { id: +postId } });
    if (!post) {
      return res.send(
        `<script>alert('게시물 조회에 실패하였습니다.');window.location.replace('/posts')</script>`
      );
      // return res.status(404).json({ message: '게시물 조회에 실패하였습니다.' });
    }

    const duplication = await prisma.Likes.findFirst({
      where: { userId: user.id, postId: +postId },
    });
    if (duplication) {
      // return res.send(`<script>alert('이미 좋아요를 누른 게시물입니다.');window.location.replace('/posts/${Number(postId)}')</script>`)
      // return res
      //   .status(409)
      //   .json({ message: '이미 좋아요를 누른 게시물입니다.' });
      await prisma.Likes.delete({
        where: duplication,
      });

      await prisma.posts.update({
        where: post,
        data: {
          countlike: {
            decrement: 1,
          },
        },
      });
      return res.status(201).redirect(`/posts/${Number(postId)}`);
    }

    const like = await prisma.Likes.create({
      data: {
        userId: user.id,
        postId: +postId,
      },
    });

    await prisma.posts.update({
      where: post,
      data: {
        countlike: {
          increment: 1,
        },
      },
    });
    return res.status(201).redirect(`/posts/${Number(postId)}`);
  }
);

// 게시물에 좋아요 취소
router.delete(
  '/post/:postId',
  jwtValidate,
  verifiedEmail,
  async (req, res, next) => {
    const postId = req.params.postId;
    const user = res.locals.user;

    const post = await prisma.posts.findFirst({ where: { id: +postId } });
    if (!post) {
      return res.status(404).json({ message: '게시물 조회에 실패하였습니다.' });
    }

    const dontlikePost = await prisma.Likes.findFirst({
      where: { userId: user.id, postId: +postId },
    });
    if (!dontlikePost) {
      return res
        .status(404)
        .json({ message: '해당 게시물에 좋아요를 누른적이 없습니다.' });
    }

    await prisma.likes.delete({ where: dontlikePost });

    await prisma.posts.update({
      where: post,
      data: {
        countlike: {
          decrement: 1,
        },
      },
    });

    return res.status(200).json({ message: '좋아요 취소' });
  }
);

// 좋아요 누른 게시물 조회
router.get('/posts', jwtValidate, verifiedEmail, async (req, res, next) => {
  const user = res.locals.user;

  const likes = await prisma.Likes.findMany({
    where: {
      userId: user.id,
    },
  });

  let posts = await prisma.posts.findMany({
    where: {
      id: { in: likes.map((like) => like.postId) },
    },
    select: {
      id: true,
      title: true,
      user: {
        select: {
          name: true,
        },
      },
      countlike: true,
      createdAt: true,
      view: true,
      attachFile: true,
    },
  });

  for (let i = 0; i < posts.length; i++) {
    if (posts[i].attachFile !== null && posts[i].attachFile !== '') {
      const tmp = posts[i].attachFile
        .split(',')
        .filter((file) =>
          ['jpg', 'jpeg', 'png', 'gif'].includes(file.split('.')[1])
        );
      if (tmp.length === 0) {
        posts[i].attachFile =
          'https://s3.orbi.kr/data/file/united2/ee9383d48d17470daf04007152b83dc0.png';
      } else {
        const command = new GetObjectCommand({
          Bucket: process.env.BUCKET_NAME,
          Key: tmp[0],
        });

        const signedUrl = await getSignedUrl(s3, command, { expiresIn: 3600 }); // 1h후 만료

        posts[i].attachFile = signedUrl;
      }
    } else {
      posts[i].attachFile =
        'https://s3.orbi.kr/data/file/united2/ee9383d48d17470daf04007152b83dc0.png';
    }
  }

  if (posts.length < 1) {
    return res
      .status(404)
      .json({ message: '좋아요를 누른 게시물이 없습니다.' });
  }

  return res.status(200).render('main.ejs', { data: posts });
});

// 댓글 좋아요
router.post(
  '/post/:postId/comment/:commentId',
  jwtValidate,
  verifiedEmail,
  async (req, res, next) => {
    const { postId, commentId } = req.params;
    const user = res.locals.user;

    const post = await prisma.posts.findFirst({ where: { id: +postId } });
    if (!post) {
      return res.status(404).json({ message: '게시물 조회에 실패하였습니다.' });
    }

    const comment = await prisma.comments.findFirst({
      where: { id: +commentId, postId: +postId },
    });
    if (!comment) {
      return res.status(404).json({ message: '댓글 조회에 실패하였습니다.' });
    }

    const duplication = await prisma.Likes.findFirst({
      where: { userId: user.id, postId: +postId, commentId: +commentId },
    });
    if (duplication) {
      // return res
      //   .status(409)
      //   .json({ message: '이미 좋아요를 누른 댓글입니다.' });
      await prisma.Likes.delete({ where: duplication });

      await prisma.comments.update({
        where: comment,
        data: {
          countlike: {
            decrement: 1,
          },
        },
      });
      return res.status(201).redirect(`/posts/${Number(postId)}`);
    }

    const like = await prisma.likes.create({
      data: {
        userId: user.id,
        postId: +postId,
        commentId: +commentId,
      },
    });

    await prisma.Comments.update({
      where: comment,
      data: {
        countlike: {
          increment: 1,
        },
      },
    });

    return res.status(201).redirect(`/posts/${Number(postId)}`);
  }
);

// 댓글에 좋아요 취소
router.delete(
  '/post/:postId/comment/:commentId',
  jwtValidate,
  verifiedEmail,
  async (req, res, next) => {
    const { postId, commentId } = req.params;
    const user = res.locals.user;

    const post = await prisma.posts.findFirst({ where: { id: +postId } });
    if (!post) {
      return res.status(404).json({ message: '게시물 조회에 실패하였습니다.' });
    }

    const comment = await prisma.comments.findFirst({
      where: { id: +commentId, postId: +postId },
    });
    if (!comment) {
      return res.status(404).json({ message: '댓글 조회에 실패하였습니다.' });
    }

    const dontlikeComment = await prisma.Likes.findFirst({
      where: { userId: user.id, postId: +postId, commentId: +commentId },
    });
    if (!dontlikeComment) {
      return res
        .status(404)
        .json({ message: '해당 게시물에 좋아요를 누른적이 없습니다.' });
    }

    await prisma.Likes.delete({ where: dontlikeComment });

    await prisma.comments.update({
      where: comment,
      data: {
        countlike: {
          decrement: 1,
        },
      },
    });

    return res.status(200).json({ message: '좋아요 취소' });
  }
);

export default router;
