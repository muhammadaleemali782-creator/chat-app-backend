# Chat App Backend

## Setup (Local mein chalane ke liye)

### 1. MongoDB Atlas (free online database) banao
1. https://www.mongodb.com/cloud/atlas/register pe jaake free account banao
2. "Build a Database" → Free (M0) tier choose karo
3. Database user banao (username/password yaad rakho)
4. Network Access mein "Allow access from anywhere" (0.0.0.0/0) add karo
5. "Connect" → "Drivers" → connection string copy karo, jaisa dikhega:
   `mongodb+srv://myuser:mypass@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority`

### 2. Gmail App Password banao (OTP email bhejne ke liye)
1. Apne Gmail account mein "2-Step Verification" on karo (agar nahi hai): https://myaccount.google.com/security
2. Fir "App Passwords" pe jao: https://myaccount.google.com/apppasswords
3. Koi naam daalo (jaise "ChatApp") aur "Create" dabao
4. Jo 16-character password milega, use copy kar lo (spaces ke bina)

### 3. Environment file banao
```bash
cp .env.example .env
```
`.env` file kholke:
- `MONGO_URI` mein apna Atlas connection string daalo (end mein `/chatapp` add karna naa bhoolo database naam ke liye)
- `JWT_SECRET` mein koi bhi random lamba string daal do
- `FRONTEND_URL` abhi `http://localhost:5173` hi rehne do
- `EMAIL_USER` mein apna Gmail address daalo
- `EMAIL_PASS` mein wo 16-character App Password daalo (upar wala step)

### 4. Install aur run
```bash
npm install
npm run dev
```
Server `http://localhost:5000` pe chalega. Browser mein khol ke check karo - "Chat app backend chal raha hai ✅" dikhna chahiye.

## API Endpoints

| Method | Endpoint | Kaam |
|---|---|---|
| POST | /api/auth/register | Naya account (username, displayName, email, password) |
| POST | /api/auth/login | Login (username, password) |
| POST | /api/auth/forgot-password | Email pe OTP bhejo |
| POST | /api/auth/reset-password | OTP + naya password se reset karo |
| GET | /api/users/search?username=xyz | Username se user dhundo |
| GET | /api/users/me | Apni profile |
| PUT | /api/users/me | Profile update |
| POST | /api/conversations/start | Kisi user ke saath chat shuru karo |
| GET | /api/conversations | Apni saari chats |
| GET | /api/messages/:conversationId | Us chat ke messages |

Socket.io events: `send_message`, `receive_message`, `typing`, `stop_typing`

## Deploy karne ke liye (baad mein)
- Render.com pe naya "Web Service" banao, is repo ko connect karo
- Environment variables (.env wale) Render ke dashboard mein daalo
- `FRONTEND_URL` ko apne Vercel URL se update karna mat bhoolna
