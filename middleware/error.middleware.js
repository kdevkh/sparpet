export default function (err, req, res, next) {
  console.error(err);
  if (err.name === 'MulterError') {
    return res
      .status(400)
      .json({ message: '최대 5개의 파일만 업로드 가능합니다.' });
  }
  res.status(500).json({ message: '서버 내부에서 에러가 발생했습니다.' });
}
