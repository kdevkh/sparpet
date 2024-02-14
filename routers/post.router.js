import express from 'express';
import { PrismaClient } from '@prisma/client';
import jwtValidate from '../middleware/jwtValidate.middleware.js';
import multer from 'multer';
import multerS3 from 'multer-s3';
import { s3, randomName, bucketName } from '../utils/aws.js';
import { GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import verifiedEmail from '../middleware/verifiedEmail.middleware.js';

//===========================================================
const upload = multer({
  storage: multerS3({
    s3,
    bucket: bucketName,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key: (req, file, cb) => {
      const ext = file.mimetype.split('/')[1];
      cb(null, `posts/${randomName()}.${ext}`);
    },
  }),
  limits: { fileSize: 1024 * 1024 * 1024 }, // 1GB
});
//===========================================================

const prisma = new PrismaClient();
const router = express.Router();

/** 내가 팔로잉한 유저들의 게시물 목록 조회 */
router.get('/following', jwtValidate, verifiedEmail, async (req, res, next) => {
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

  if (!orderKey) {
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
      view : true
    },
    orderBy: [
      {
        [orderKey]: orderValue
      },
    ],
  });

  return res.render('main.ejs',{ data: posts });
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

  await prisma.posts.update({
    where: {
      id: Number(postId),
    },
    data: {
      view: {
        increment: 1,
      },
    },
  });

  const post = await prisma.posts.findFirst({
    where: {
      id: Number(postId),
    },
    select: {
      id: true,
      title: true,
      content: true,
      attachFile: true,
      user: {
        select: {
          name: true,
          id: true,
        },
      },
      countlike: true,
      createdAt: true,
      view: true,

    },
  });
  if (!post) {
    return res.json({ data: {} });
  }

  let attachFileUrlList = []; // 첨부파일들 임시 url 리스트
  if (post.attachFile) {
    const fileNameList = post.attachFile.split(',');

    for (let i = 0; i < fileNameList.length; i++) {
      const command = new GetObjectCommand({
        Bucket: bucketName,
        Key: fileNameList[i],
      });
      const signedUrl = await getSignedUrl(s3, command, { expiresIn: 3600 }); // 1h후 만료
      attachFileUrlList.push(signedUrl);
    }
  }
  post.attachFile = attachFileUrlList;

  const comments = await prisma.comments.findMany({
    where: { postId: Number(postId) },
    orderBy: { createdAt: 'desc' },
  });

  return res.render('detail.ejs',{ post: post, comment: comments });
});

// 게시글 생성
router.post(
  '/',
  jwtValidate,
  upload.array('attachFile', 5),
  async (req, res, next) => {
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


    // s3에 저장된 파일명을 ,로 이은 문자열 형태로 DB에 저장
    const attachFilesString = req.files.map((file) => file.key).join(',');

    const data = await prisma.posts.create({
      data: {
        title,
        content,
        userId: user.id,
        attachFile: attachFilesString,
      },
    });
    return res.status(201).redirect('/posts');
  }
);

// 게시글 수정
router.patch(
  '/:postId',
  jwtValidate,
  verifiedEmail,
  upload.array('attachFile', 5),
  async (req, res, next) => {
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

    // 사용자가 attachFile을 수정하려고 하면,
    /** 근데 이렇게 하면 기존 거는 다 지워지고 새 걸로 전부 교체됨... 기존 걸 유지하면서 새 것도 업데이트하려면 db에 컬럼을 여러개 놔야하나? attachFile1, attachFile2..이런식으로? */
    if (req.files) {
      // s3에 저장된 기존 것 삭제
      const existFileNameList = post.attachFile.split(',');

      for (let i = 0; i < existFileNameList.length; i++) {
        const command = new DeleteObjectCommand({
          Bucket: bucketName,
          Key: existFileNameList[i],
        });
        try {
          await s3.send(command);
        } catch (err) {
          next(err);
        }
      }
    }

    // s3에 저장된 파일명을 ,로 이은 문자열 형태로 DB에 저장
    const attachFilesString = req.files.map((file) => file.key).join(',');

    const data = await prisma.posts.update({
      where: {
        id: Number(postId),
      },
      data: {
        title,
        content,
        attachFile: attachFilesString,
      },
    });

    return res.status(201).json({ data });
    //return res.status(201).end();
  }
);

// 게시글 삭제
router.delete(
  '/:postId',
  jwtValidate,
  verifiedEmail,
  async (req, res, next) => {
    console.log("제발");
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

    // s3에서 삭제
    if (post.attachFile) {
      const existFileNameList = post.attachFile.split(',');
      for (let i = 0; i < existFileNameList.length; i++) {
        for (let i = 0; i < existFileNameList.length; i++) {
          const command = new DeleteObjectCommand({
            Bucket: bucketName,
            Key: existFileNameList[i],
          });
          try {
            await s3.send(command);
          } catch (err) {
            next(err);
          }
        }
      }
    }

    await prisma.posts.delete({
      where: { id: Number(postId) },
    });

    // return res.status(201).end();
    return res.status(201).redirect('/posts');
  }
);

// 팔로우 & 언팔로우
router.post(
  '/:postId/follow',
  jwtValidate,
  verifiedEmail,
  async (req, res, next) => {
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
  }
);

export default router;
