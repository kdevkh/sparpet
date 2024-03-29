import express from 'express';
import { PrismaClient } from '@prisma/client';
import jwtValidate from '../middleware/jwtValidate.middleware.js';
import verifiedEmail from '../middleware/verifiedEmail.middleware.js';

const prisma = new PrismaClient();
const router = express.Router();

//댓글 생성
router.post(
  '/:postId/comments',
  jwtValidate,
  verifiedEmail,
  async (req, res, next) => {
    const user = res.locals.user;
    const postId = req.params.postId;
    const { content } = req.body;
    console.log("성공");

    if (!content) {
      return res.status(400).json({
        success: false,
        message: '댓글을 입력해주세요.',
      });
    }

    await prisma.comments.create({
      data: {
        content,
        postId: Number(postId),
        userId: user.id,
      },
    });
  return res.redirect('back');
});

// 댓글 조회
router.get('/:postId/comments', async (req, res, next) => {
  const postId = req.params.postId;
  if (!postId) {
    return res.status(400).json({
      success: false,
      message: 'postId는 필수값입니다.',
    });
  }

  const comments = await prisma.comments.findMany({
    where: { postId: Number(postId) },
    orderBy: { createdAt: 'desc' },
  });

  return res.json({ comment: comments });
});

// 댓글 수정
router.patch(
  '/:postId/comments/:commentId',
  jwtValidate,
  verifiedEmail,
  async (req, res, next) => {
    const user = res.locals.user;
    const { postId, commentId } = req.params;
    const { content } = req.body;

    if (!content) {
      // return res.status(400).json({
      //   success: false,
      //   message: '수정 내용을 입력해주세요.',
      // });
      return res.status(400).send(`<script>alert('수정 내용을 입력해주세요.');window.location.replace('/posts/${Number(postId)}')</script>`)

    }

    const updatedComment = await prisma.comments.findFirst({
      where: {
        id: Number(commentId),
        postId: Number(postId),
      },
    });

    if (!updatedComment) {
      return res.status(400).json({
        success: false,
        message: '해당 댓글을 찾을 수 없습니다.',
      });
    }

    if (updatedComment.userId !== user.id) {
      // return res.status(400).json({
      //   success: false,
      //   message: '댓글을 수정할 권한이 없습니다.',
      // });
      return res.status(400).send(`<script>alert('댓글을 수정할 권한이 없습니다.');window.location.replace('/posts/${Number(postId)}')</script>`)

    }

    await prisma.comments.update({
      where: {
        id: Number(commentId),
      },
      data: {
        content,
      },
    });

    return res.status(200).redirect(`/posts/${Number(postId)}`);
  }
);

// 댓글 삭제
router.delete(
  '/:postId/comments/:commentId',
  jwtValidate,
  verifiedEmail,
  async (req, res, next) => {
    const user = res.locals.user;
    const { postId, commentId } = req.params;

    const comment = await prisma.comments.findFirst({
      where: {
        id: Number(commentId),
        postId: Number(postId),
      },
    });

    if (!comment) {
      return res.status(400).json({
        success: false,
        message: '해당 댓글을 찾을 수 없습니다.',
      });
    }

    if (comment.userId !== user.id) {
      // return res.status(400).json({
      //   success: false,
      //   message: '댓글을 삭제할 권한이 없습니다.',
      // });
      return res.status(400).send(`<script>alert('댓글을 삭제할 권한이 없습니다.');window.location.replace('/posts/${Number(postId)}')</script>`)
    }

    await prisma.comments.delete({
      where: {
        id: Number(commentId),
      },
    });

    return res.status(200).redirect(`/posts/${Number(postId)}`)
  }
);

export default router;
