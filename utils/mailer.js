import nodemailer from "nodemailer";

export const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
});

export async function sendOTP(email, otp) {
  await transporter.sendMail({
    from: `"MedAssist" <${process.env.GMAIL_USER}>`,
    to: email,
    subject: "Your OTP Code",
    html: `
      <h2>Your OTP</h2>
      <p>Your login code is:</p>
      <h1>${otp}</h1>
      <p>This code is valid for 5 minutes.</p>
    `,
  });
}
