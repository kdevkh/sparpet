export default function (req, res, next) {
  if (req.cookies.isVerified === 'false') {
    return res.status(400).json({ message: '인증되지 않은 사용자입니다.' });
  }
  next();
}
