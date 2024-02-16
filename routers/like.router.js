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
    try {
      const postId = req.params.postId;
      const user = res.locals.user;

      const post = await prisma.posts.findFirst({ where: { id: +postId } });
      if (!post) {
        return res.send(
          `<script>alert('게시물 조회에 실패하였습니다.');window.location.replace('/posts')</script>`
        );
      }

      const duplication = await prisma.Likes.findFirst({
        where: { userId: user.id, postId: +postId },
      });
      if (duplication) {
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
    } catch (error) {
      return res.status(500).send(`<script>alert('서버 내부에서 오류가 발생했습니다.');window.location.replace('/posts')</script>`);
    }
  }
);


// 좋아요 누른 게시물 조회
router.get('/posts', jwtValidate, verifiedEmail, async (req, res, next) => {
  try {
    const user = res.locals.user;

    const like = await prisma.Likes.findMany({
      where: {
        userId: user.id,
      },
      select: {
        post: {
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
          }
        }
      }
    });

    const posts = [];
    for (let i = 0; i < like.length; i++) {

      posts.push(like[i].post);

      if (like[i].post.attachFile !== null && like[i].post.attachFile !== '') {
        const tmp = like[i].post.attachFile
          .split(',')
          .filter((file) =>
            ['jpg', 'jpeg', 'png', 'gif'].includes(file.split('.')[1])
          );
        if (tmp.length === 0) {
          like[i].post.attachFile =
            'https://s3.orbi.kr/data/file/united2/ee9383d48d17470daf04007152b83dc0.png';
        } else {
          const command = new GetObjectCommand({
            Bucket: process.env.BUCKET_NAME,
            Key: tmp[0],
          });

          const signedUrl = await getSignedUrl(s3, command, { expiresIn: 3600 }); // 1h후 만료

          like[i].post.attachFile = signedUrl;
        }
      } else {
        like[i].post.attachFile =
          'https://s3.orbi.kr/data/file/united2/ee9383d48d17470daf04007152b83dc0.png';
      }
    }

    if (like.length < 1) {
      return res
        .status(404)
        .json({ message: '좋아요를 누른 게시물이 없습니다.' });
    }
    
    return res.status(200).render('main.ejs', { data: posts });

  } catch (error) {
    return res.status(500).send(`<script>alert('서버 내부에서 오류가 발생했습니다.');window.location.replace('/posts')</script>`);
  }
});

// 댓글 좋아요
router.post(
  '/post/:postId/comment/:commentId',
  jwtValidate,
  verifiedEmail,
  async (req, res, next) => {
    try {
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

    } catch (error) {
      return res.status(500).send(`<script>alert('서버 내부에서 오류가 발생했습니다.');window.location.replace('/posts')</script>`);
    }
  }
);

export default router;
