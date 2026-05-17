// src/services/sendMailService.ts
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

export const sendApprovalEmail = async (to: string, studentName: string, courseName: string) => {
  const mailOptions = {
    from: `"Online Course LMS" <${process.env.MAIL_USER}>`,
    to,
    subject: "Đơn đăng ký khoá học đã được duyệt",
    html: `
      <h2>Xin chào ${studentName},</h2>
      <p>Đơn đăng ký của bạn vào khoá học <b>${courseName}</b> đã được <b>chấp thuận</b>.</p>
      <p>Bạn có thể đăng nhập và bắt đầu học ngay.</p>
      <br/><br/>
      <i>Chúc bạn học tốt!</i>
    `,
  };

  await transporter.sendMail(mailOptions);
};
export const sendRejectionEmail = async (to: string, studentName: string, courseName: string) => {
  const mailOptions = {
    from: `"Online Course LMS" <${process.env.MAIL_USER}>`,
    to,
    subject: "Đơn đăng ký khoá học đã bị từ chối",
    html: `
        <h2>Xin chào ${studentName},</h2>
        <p>Rất tiếc, đơn đăng ký của bạn vào khoá học <b>${courseName}</b> đã bị <b>từ chối</b>.</p>
        <p>Nếu bạn có thắc mắc, vui lòng liên hệ với chúng tôi để được hỗ trợ.</p>
        <br/><br/>
        <i>Chúc bạn mọi điều tốt lành!</i>
      `,
  };
  await transporter.sendMail(mailOptions);
};
