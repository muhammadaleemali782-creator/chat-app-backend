# Chat App Backend

## Setup (Local mein chalane ke liye)

### 1. MongoDB Atlas (free online database) banao
1. https://www.mongodb.com/cloud/atlas/register pe jaake free account banao
2. "Build a Database" → Free (M0) tier choose karo
3. Database user banao (username/password yaad rakho)
4. Network Access mein "Allow access from anywhere" (0.0.0.0/0) add karo
5. "Connect" → "Drivers" → connection string copy karo, jaisa dikhega:
   `mongodb+srv://myuser:mypass@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority`

### 2. Resend account banao (OTP email bhejne ke liye - free, Render pe kaam karta hai)
Render jaisi free hosting SMTP (Gmail) ports block kar deti hai, isliye hum ek HTTP-based
email service use kar rahe hain jo hamesha kaam karta hai:
1. https://resend.com pe free account banao (credit card ki zarurat nahi)
2. Dashboard mein **"API Keys"** → **"Create API Key"** — koi bhi naam do
3. Jo key milegi (`re_...` se shuru hoti hai) use copy kar lo
4. Testing ke liye `onboarding@resend.dev` "from" address already kaam karta hai, kuch aur setup nahi chahiye
   - Note: bina apna domain verify kiye, Resend sirf **usi email pe** bhej payega jisse aapne Resend account banaya hai. Real users tak email bhejne ke liye apna domain verify karna hoga (Resend dashboard mein "Domains" section)

### 3. Environment file banao
```bash
cp .env.example .env
```
`.env` file kholke:
- `MONGO_URI` mein apna Atlas connection string daalo (end mein `/chatapp` add karna naa bhoolo database naam ke liye)
- `JWT_SECRET` mein koi bhi random lamba string daal do
- `FRONTEND_URL` abhi `http://localhost:5173` hi rehne do
- `RESEND_API_KEY` mein apni Resend API key daalo

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
