const nodemailer = require("nodemailer");

// Gmail ka free SMTP use kar rahe hain.
// Zaroori: normal Gmail password nahi chalega - "App Password" banana padega.
// Kaise banaye: README.md mein steps hain.
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

async function sendOtpEmail(toEmail, otp) {
  await transporter.sendMail({
    from: `"ChatApp" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: "Password reset OTP - ChatApp",
    html: `
      <div style="font-family: sans-serif; max-width: 420px; margin: auto;">
        <h2>Password Reset OTP</h2>
        <p>Aapka OTP hai:</p>
        <div style="font-size: 28px; font-weight: bold; letter-spacing: 6px; margin: 16px 0;">
          ${otp}
        </div>
        <p>Ye OTP 10 minute ke liye valid hai. Agar aapne ye request nahi ki, to is email ko ignore kar do.</p>
      </div>
    `,
  });
}

module.exports = { sendOtpEmail };
