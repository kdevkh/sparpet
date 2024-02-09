import express from 'express';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import jwtValidate from '../middleware/jwtValidate.middleware.js';

const prisma = new PrismaClient();
const router = express.Router();

// 게시물 좋아요
router.post('/post/:postId', jwtValidate, async (req,res,next) => {
    const id = req.params.postId;
    const user = res.locals.user;

    const post = await prisma.posts.findFirst({where : { id : +id}})
    if (!post) {
        return res.status(404).json({ message: "이력서 조회에 실패하였습니다." });
    }

    const duplication = await prisma.Likes.findFirst({where : {userId : user.id, postId : +id}})
    if (duplication) {
        return res.status(409).json({ message : "이미 좋아요를 누른 게시물입니다." })
    }
    const userId = user.id;

    const like = await prisma.likes.create({
        data : {
            userId : userId,
            postId : +id
        }
    })

    await prisma.posts.update({
        where : post,
        data : {
            countlike : {
                increment: 1
            }
        }
    })

    return res.status(201).json({message : "좋아요 성공"});
})

// 게시물에 좋아요 취소
router.delete('/post/:postId/like', jwtValidate, async (req,res,next) => {
    const postId = req.params;
    const user = res.locals.user;

    const post = await prisma.posts.findFirst({where : { id : postId}})
    if (!post) {
        return res.status(404).json({ message: "이력서 조회에 실패하였습니다." });
    }

    const likePost = await prisma.Likes.findFirst({where : {userId : user.id, postId : postId}});
    if (!likePost) {
        return res.status(404).json({ message: "해당 게시물에 좋아요를 누른적이 없습니다." });
    }

    await prisma.Likes.delete({where : likePost})

    await prisma.posts.update({
        where : post,
        data : {
            countlike : {
                decrement: 1
            }
        }
    })

    return res.status(200).json({ message: "좋아요 취소" });
})

// 좋아요 누른 게시물 조회
router.get('/posts', jwtValidate, async (req,res,next) => {
    const user = res.locals.user;

    const likes = await prisma.Likes.findMany({
        where : {
            userId : user.id
        }
    });

    const posts = await prisma.posts.findMany({
        where : {
            id : {in : likes.map((like) => like.postId)}
        }
    });

    if (posts.length < 1) {
        return res.status(404).json({ message: "좋아요를 누른 게시물이 없습니다." }); 
    }

    return res.status(200).json({posts});
})

export default router;