# Flutter Test API

A tiny mock REST API for testing a Flutter app: login, get profile, get users.
Built with Node.js + Express. No real database — users are stored in memory.

## Endpoints

| Method | Path            | Auth required | Body / Header |
|--------|-----------------|----------------|---------------|
| POST   | `/api/login`    | No             | JSON body: `{ "email": "...", "password": "..." }` |
| GET    | `/api/profile`  | Yes            | `Authorization: Bearer <token>` |
| GET    | `/api/users`    | Yes            | `Authorization: Bearer <token>` |

### Test accounts
All three mock users share the password `password123`:
- john@example.com
- jane@example.com
- mike@example.com

## Run locally

```bash
npm install
cp .env.example .env   # optional, edit JWT_SECRET
npm start
```

Server runs on `http://localhost:3000`.

Test with curl:
```bash
curl -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john@example.com","password":"password123"}'
```

## Deploy (free options)

### Option A — Render.com (recommended, easiest)
1. Push this folder to a GitHub repo.
2. Go to https://render.com → New → Web Service → connect your repo.
3. Settings:
   - Build command: `npm install`
   - Start command: `npm start`
4. Add environment variable `JWT_SECRET` (any random string) in the Render dashboard.
5. Deploy. Render gives you a URL like `https://your-app.onrender.com`.
   (Free tier sleeps after inactivity — first request after idle may take ~30s.)

### Option B — Railway.app
1. Push to GitHub, then https://railway.app → New Project → Deploy from GitHub repo.
2. Railway auto-detects Node.js and runs `npm start`.
3. Add `JWT_SECRET` under Variables.
4. Railway gives you a public domain under Settings → Networking.

### Option C — Fly.io / Cyclic / Vercel (serverless)
Any Node-hosting platform works the same way: install deps, run `npm start`,
set `JWT_SECRET` as an env var, expose the given port.

You do **not** need to buy or configure a custom domain — every option above
gives you a free `*.onrender.com` / `*.up.railway.app` style subdomain that
works fine for testing a Flutter app. Point your Flutter app's base URL at
that subdomain.

## Using it from Flutter

Add `http` to `pubspec.yaml`:
```yaml
dependencies:
  http: ^1.2.0
```

Example service:
```dart
import 'dart:convert';
import 'package:http/http.dart' as http;

class ApiService {
  static const baseUrl = 'https://your-app.onrender.com'; // or http://10.0.2.2:3000 for Android emulator

  static Future<String> login(String email, String password) async {
    final res = await http.post(
      Uri.parse('$baseUrl/api/login'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'email': email, 'password': password}),
    );
    final data = jsonDecode(res.body);
    if (res.statusCode == 200) return data['token'];
    throw Exception(data['message']);
  }

  static Future<Map<String, dynamic>> getProfile(String token) async {
    final res = await http.get(
      Uri.parse('$baseUrl/api/profile'),
      headers: {'Authorization': 'Bearer $token'},
    );
    return jsonDecode(res.body);
  }

  static Future<List<dynamic>> getUsers(String token) async {
    final res = await http.get(
      Uri.parse('$baseUrl/api/users'),
      headers: {'Authorization': 'Bearer $token'},
    );
    return jsonDecode(res.body)['users'];
  }
}
```

**Note on localhost while developing:**
- Android emulator: use `http://10.0.2.2:3000` instead of `localhost`.
- iOS simulator: `http://localhost:3000` works directly.
- Physical device: use your computer's LAN IP, e.g. `http://192.168.1.5:3000`,
  and make sure the device is on the same Wi-Fi network.

## Notes for production use
This is a **test/mock API** — passwords are hashed but users live only in
memory and reset on every restart. For anything real, swap the in-memory
array for a real database (Postgres, MongoDB, etc.).
