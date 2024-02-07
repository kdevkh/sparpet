import express from 'express';

const router = express.Router();

router.post('/sign-up', (Req, res, next) => {
  const { email, password, passwordConfirm, name } = req.body;
  if (!email) {
    return res.status(400).json({ message: '이메일은 필수값입니다.' });
  }
  if (!password) {
    return res.status(400).json({ message: '비밀번호는 필수값입니다.' });
  }
  if (!passwordConfirm) {
    return res.status(400).json({ message: '비밀번호 확인은 필수값입니다.' });
  }
  if (!name) {
    return res.status(400).json({ message: '이름은 필수값입니다.' });
  }
  if (password.email < 6) {
    return res.status(400).json({ message: '비밀번호는 최소 6자 이상입니다.' });
  }
  if (password !== passwordConfirm) {
    return res.status(400).json({ message: '비밀번호가 일치하지 않습니다.' });
  }
});

export default router;
