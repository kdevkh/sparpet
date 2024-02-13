import jwt from 'jsonwebtoken';

export function createVerifyToken(email) {
  try {
    const verifyToken = jwt.sign({ email }, 'validation', {
      expiresIn: '5m',
    });
    return verifyToken;
  } catch (error) {
    throw new Error('토큰 생성 에러.' + error.message);
  }
}
