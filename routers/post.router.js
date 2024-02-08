import express from 'express';
import { PrismaClient } from '@prisma/client';
import jwtValidate from '../middleware/jwtValidate.middleware.js';

const prisma = new PrismaClient();
const router = express.Router();

// 게시글 목록 조회
router.get('/', async (req, res, next) => {
  const orderKey = req.query.orderKey ?? 'id';
  const orderValue = req.query.orderValue ?? 'desc';

  if (!['id'].includes(orderKey)) {
    return res.status(400).json({
      success: false,
      message: 'orderKey가 올바르지 않습니다.',
    });
  }

  if (!['asc', 'desc'].includes(orderValue)) {
    return res.status(400).json({
      success: false,
      message: 'orderValue가 올바르지 않습니다.',
    });
  }

  const posts = await prisma.posts.findMany({
    select: {
      id: true,
      title: true,
      user: {
        select: {
          name: true,
        },
      },
      createdAt: true,
    },
    orderBy: [
      {
        [orderKey]: orderValue.toLowerCase(),
      },
    ],
  });

  return res.json({ data: posts });
});

// 게시글 상세 조회
router.get('/:postId', async (req, res, next) => {
  const postId = req.params.postId;
  if (!postId) {
    return res.status(400).json({
      success: false,
      message: 'postId는 필수값입니다.',
    });
  }

  const post = await prisma.posts.findFirst({
    where: {
      id: Number(postId),
    },
    select: {
      id: true,
      title: true,
      content: true,
      user: {
        select: {
          name: true,
        },
      },
      createdAt: true,
    },
  });
  if (!post) {
    return res.json({ data: {} });
  }

  return res.json({ data: post });
});

// 게시글 생성
router.post('/', jwtValidate, async (req, res, next) => {
  const user = res.locals.user;
  const { title, content } = req.body;
  if (!title) {
    return res.status(400).json({
      success: false,
      message: '게시글 제목은 필수값입니다.',
    });
  }
  if (!content) {
    return res.status(400).json({
      success: false,
      message: '게시글 내용을 입력해주세요.',
    });
  }
  await prisma.posts.create({
    data: {
      title,
      content,
      userId: user.id,
    },
  });
  return res.status(201).json({});
});

// 게시글 수정
router.patch('/:postId', jwtValidate, async (req, res, next) => {
  const user = res.locals.user;
  const postId = req.params.postId;
  const { title, content } = req.body;

  if (!postId) {
    return res.status(400).json({
      success: false,
      message: 'postId는 필수값입니다.',
    });
  }
  if (!title) {
    return res.status(400).json({
      success: false,
      message: '제목은 필수값입니다.',
    });
  }
  if (!content) {
    return res.status(400).json({
      success: false,
      message: '내용을 입력해주세요.',
    });
  }

  const post = await prisma.posts.findFirst({
    where: { id: Number(postId) },
  });
  if (!post) {
    return res.status(400).json({
      success: false,
      message: '게시글이 존재하지 않습니다.',
    });
  }
  if (post.userId !== user.id) {
    return res.status(400).json({
      success: false,
      message: '게시글 수정 권한이 없습니다.',
    });
  }

  await prisma.posts.update({
    where: {
      id: Number(postId),
    },
    data: {
      title,
      content,
    },
  });

  return res.status(201).end();
});

// 게시글 삭제
router.delete('/:postId', jwtValidate, async (req, res, next) => {
  const user = res.locals.user;
  const postId = req.params.postId;

  if (!postId) {
    return res.status(400).json({
      success: false,
      message: 'postId는 필수값입니다.',
    });
  }

  const post = await prisma.posts.findFirst({
    where: { id: Number(postId) },
  });
  if (!post) {
    return res.status(400).json({
      success: false,
      message: '게시글이 존재하지 않습니다.',
    });
  }
  if (post.userId !== user.id) {
    return res.status(400).json({
      success: false,
      message: '올바르지 않은 요청입니다.',
    });
  }

  await prisma.posts.delete({
    where: { id: Number(postId) },
  });

  return res.status(201).end();
});

export default router;
