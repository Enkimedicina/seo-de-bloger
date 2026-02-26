import express from "express";
import { createServer as createViteServer } from "vite";
import { google } from "googleapis";
import cookieParser from "cookie-parser";
import session from "express-session";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(cookieParser());
app.use(session({
  secret: "seo-architect-secret",
  resave: false,
  saveUninitialized: true,
  cookie: { 
    secure: true, 
    sameSite: 'none',
    httpOnly: true 
  }
}));

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  `${process.env.APP_URL}/auth/callback`
);

// Auth URL
app.get("/api/auth/url", (req, res) => {
  const scopes = [
    'https://www.googleapis.com/auth/blogger',
    'https://www.googleapis.com/auth/userinfo.profile'
  ];

  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent'
  });

  res.json({ url });
});

// Auth Callback
app.get("/auth/callback", async (req, res) => {
  const { code } = req.query;
  try {
    const { tokens } = await oauth2Client.getToken(code as string);
    (req as any).session.tokens = tokens;
    
    res.send(`
      <html>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS' }, '*');
              window.close();
            } else {
              window.location.href = '/';
            }
          </script>
          <p>Autenticación exitosa. Esta ventana se cerrará automáticamente.</p>
        </body>
      </html>
    `);
  } catch (error) {
    console.error("Error exchanging code for tokens:", error);
    res.status(500).send("Authentication failed");
  }
});

// Check Auth Status
app.get("/api/auth/status", (req, res) => {
  const tokens = (req as any).session.tokens;
  res.json({ connected: !!tokens });
});

// Get User's Blogs
app.get("/api/blogger/blogs", async (req, res) => {
  const tokens = (req as any).session.tokens;
  if (!tokens) return res.status(401).json({ error: "Not authenticated" });

  oauth2Client.setCredentials(tokens);
  const blogger = google.blogger({ version: 'v3', auth: oauth2Client });

  try {
    const response = await blogger.blogs.listByUser({ userId: 'self' });
    res.json(response.data.items || []);
  } catch (error) {
    console.error("Error fetching blogs:", error);
    res.status(500).json({ error: "Failed to fetch blogs" });
  }
});

// Publish Post
app.post("/api/blogger/publish", async (req, res) => {
  const tokens = (req as any).session.tokens;
  if (!tokens) return res.status(401).json({ error: "Not authenticated" });

  const { blogId, title, content } = req.body;
  if (!blogId || !title || !content) return res.status(400).json({ error: "Missing fields" });

  oauth2Client.setCredentials(tokens);
  const blogger = google.blogger({ version: 'v3', auth: oauth2Client });

  try {
    const response = await blogger.posts.insert({
      blogId,
      requestBody: {
        title,
        content,
      }
    });
    res.json(response.data);
  } catch (error) {
    console.error("Error publishing post:", error);
    res.status(500).json({ error: "Failed to publish post" });
  }
});

// Logout
app.post("/api/auth/logout", (req, res) => {
  (req as any).session.destroy(() => {
    res.json({ success: true });
  });
});

// Export for Vercel
export default app;

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
  }

  // Only listen if not running as a serverless function
  if (process.env.VITE_DEV_SERVER !== 'true' && process.env.NODE_ENV !== 'production') {
     app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } else if (process.env.NODE_ENV === 'production' && !process.env.VERCEL) {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }
}

// In AI Studio, we want to start the server
if (!process.env.VERCEL) {
  startServer();
}
