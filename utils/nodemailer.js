import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'nodejs.testermail@gmail.com',
    pass: 'lbyz etni yrts fndy',
  },
});

export default function emailSender(email, token) {
  return new Promise((resolve, reject) => {
    const mailOptions = {
      from: 'nodejs.testermail@gmail.com',
      to: email,
      subject: '스파르펫 회원가입 인증코드',
      html: `<p>아래의 주소를 클릭하여 이메일을 인증하세요 : </p>
        <p> <a href="http://localhost:3000/users/?sendcode=${email}&token=${token}">이메일 인증하기</a></p>`,
    };
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        reject(error);
      } else {
        resolve(info);
      }
    });
  });
}
