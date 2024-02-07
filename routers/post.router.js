import express from 'express';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
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

export default router;
