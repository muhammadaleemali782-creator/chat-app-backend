// Resend.com ka HTTP API use kar rahe hain - Nodemailer/SMTP ki jagah.
// Wajah: Render (aur kai free hosting) SMTP ports (jo Gmail use karta hai) block kar dete
// hain, jisse email bhejne wali request hamesha "hang"/atki rehti hai. Resend HTTPS API
// use karta hai (normal web request jaisa), isliye ye Render pe bhi kaam karta hai.
// Free account: https://resend.com - credit card ki zarurat nahi.

const RESEND_API_URL = "https://api.resend.com/emails";

async function sendOtpEmail(toEmail, otp) {
  const controller = new AbortController();
  // 10 second se zyada wait nahi karenge - taaki request kabhi hamesha ke liye na atke
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL || "ChatApp <onboarding@resend.dev>",
        to: [toEmail],
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
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errBody = await response.text();
      throw new Error(`Resend API error (${response.status}): ${errBody}`);
    }

    return await response.json();
  } catch (err) {
    clearTimeout(timeout);
    if (err.name === "AbortError") {
      throw new Error("Email bhejne mein zyada time lag raha hai (timeout)");
    }
    throw err;
  }
}

module.exports = { sendOtpEmail };
