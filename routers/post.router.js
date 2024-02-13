import express from 'express';
import { PrismaClient } from '@prisma/client';
import jwtValidate from '../middleware/jwtValidate.middleware.js';

const prisma = new PrismaClient();
const router = express.Router();

/** 내가 팔로잉한 유저들의 게시물 목록 조회 */
router.get('/following', jwtValidate, async (req, res, next) => {
  const followedByUserId = res.locals.user.id; // me
  let followingUsersIdList = await prisma.users.findMany({
    where: {
      following: {
        some: {
          followedById: +followedByUserId,
        },
      },
    },
    select: {
      id: true,
    },
  });

  if (followingUsersIdList.length == 0)
    return res.status(404).json({ message: '게시물이 없습니다.' });
  followingUsersIdList = followingUsersIdList.map((v) => v.id);

  const posts = await prisma.posts.findMany({
    where: {
      userId: { in: followingUsersIdList },
    },
  });
  return res.status(200).json({ posts });
});

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
      countlike: true,
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
          id: true,
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

// 팔로우 & 언팔로우
router.post('/:postId/follow', jwtValidate, async (req, res, next) => {
  try {
    const followingUser = await prisma.posts.findFirst({
      where: { id: +req.params.postId },
      select: { userId: true },
    }); // B
    const followingUserId = followingUser.userId;
    if (!followingUserId)
      return res.status(404).json({ message: '존재하지 않는 게시물입니다.' });

    const followedByUserId = res.locals.user.id; // A = me
    // 자기자신 팔로우 불가
    if (followingUserId == followedByUserId)
      return res
        .status(400)
        .json({ message: '자기자신을 팔로우할 수 없습니다.' });

    // 이미 팔로우한 user인지 확인 -> 언팔로우
    const isExistfollowingUser = await prisma.follows.findMany({
      where: {
        followedById: +followedByUserId,
        followingId: +followingUserId,
      },
    });
    if (isExistfollowingUser.length !== 0) {
      await prisma.follows.deleteMany({
        where: {
          followedById: +followedByUserId,
          followingId: +followingUserId,
        },
      });
      return res.status(201).json({ message: '언팔로우 성공' });
    }

    // A가 B를 팔로우
    const followUsers = await prisma.follows.create({
      data: {
        followingId: +followingUserId,
        followedById: +followedByUserId,
      },
    });
    return res.status(201).json({ message: '팔로우 성공', followUsers });
  } catch (err) {
    next(err);
  }
});

export default router;
