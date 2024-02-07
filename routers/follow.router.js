import express from 'express';
import { prisma } from '../models/index.js';
import authMiddleware from '../middlewares/auth.middleware.js';

const router = express.Router();

/** 팔로우 하기 */
router.post('/:userId', authMiddleware, async (req, res, next) => {
  try {
    const followingUserId = req.params.userId; // B
    const followedByUserId = req.user.userId; // A = me

    if (!followingUserId)
      return res
        .status(400)
        .json({ message: '팔로우하시려는 유저아이디를 입력해주세요.' });
    // 자기자신 팔로우 불가
    if (followingUserId == followedByUserId)
      return res
        .status(400)
        .json({ message: '자기자신을 팔로우할 수 없습니다.' });
    // 팔로우 할 user가 존재하는지 확인
    const followingUser = await prisma.users.findFirst({
      where: { userId: +followingUserId },
    });
    if (!followingUser)
      return res.status(404).json({ message: '존재하지 않는 사용자입니다.' });
    // 이미 팔로우한 user인지 확인
    const isExistfollowingUser = await prisma.follows.findMany({
      where: {
        followedById: +followedByUserId,
        followingId: +followingUserId,
      },
    });
    if (isExistfollowingUser.length !== 0)
      return res.status(400).json({ message: '이미 팔로우된 사용자입니다.' });

    // A가 B를 팔로우
    const followUsers = await prisma.follows.create({
      data: {
        followedById: +followedByUserId,
        followingId: +followingUserId,
      },
    });
    return res.status(201).json({ message: '팔로우 성공', followUsers });
  } catch (err) {
    next(err);
  }
});

/** 언팔로우 하기 */
router.delete('/:userId', authMiddleware, async (req, res, next) => {
  try {
    const followingUserId = req.params.userId; // B
    const followedByUserId = req.user.userId; // A = me

    if (!followingUserId)
      return res
        .status(400)
        .json({ message: '언팔로우하시려는 유저아이디를 입력하세요.' });

    // 팔로우된 사용자인지 확인
    const followingUser = await prisma.follows.findMany({
      where: {
        followedById: +followedByUserId,
        followingId: +followingUserId,
      },
    }); // []

    if (followingUser.length == 0)
      return res.status(404).json({ message: '팔로우된 사용자가 아닙니다.' });

    // A가 B를 언팔로우
    await prisma.follows.deleteMany({
      where: {
        followedById: +followedByUserId,
        followingId: +followingUserId,
      },
    });
    return res.status(201).json({ message: '언팔로우 성공' });
  } catch (err) {
    next(err);
  }
});

/** 내가 팔로잉하는 유저 목록 조회 */
router.get('/following', authMiddleware, async (req, res, next) => {
  try {
    const followedByUserId = req.user.userId; // me
    const followingUsers = await prisma.users.findMany({
      where: {
        following: {
          some: {
            followedById: +followedByUserId,
          },
        },
      },
      select: {
        userId: true,
        clientId: true,
        email: true,
      },
    });
    return res.status(200).json({ followingUsers });
  } catch (err) {
    next(err);
  }
});

/** 내 팔로워 목록 조회 */
router.get('/follower', authMiddleware, async (req, res, next) => {
  try {
    const followingUserId = req.user.userId; // me
    const followers = await prisma.users.findMany({
      where: {
        followedBy: {
          some: {
            followingId: +followingUserId,
          },
        },
      },
      select: {
        userId: true,
        clientId: true,
        email: true,
      },
    });

    return res.status(200).json({ followers });
  } catch (err) {
    next(err);
  }
});

/** 내가 팔로잉한 유저들의 게시물 목록 조회 */
router.get('/following/posts', authMiddleware, async (req, res, next) => {
  const followedByUserId = req.user.userId; // me
  let followingUsersIdList = await prisma.users.findMany({
    where: {
      following: {
        some: {
          followedById: +followedByUserId,
        },
      },
    },
    select: {
      userId: true,
    },
  });

  if (followingUsersIdList.length == 0)
    return res.status(404).json({ message: '게시물이 없습니다.' });
  followingUsersIdList = followingUsersIdList.map((v) => v.userId);

  const posts = await prisma.posts.findMany({
    where: {
      userId: { in: followingUsersIdList },
    },
  });
  return res.status(200).json({ posts });
});
export default router;
