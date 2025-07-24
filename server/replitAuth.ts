import session from "express-session";
import connectPg from "connect-pg-simple";
import dotenv from "dotenv";
import type { Express, RequestHandler } from "express";

dotenv.config();

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });

  return session({
    secret: process.env.SESSION_SECRET || "default_session_secret",
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: sessionTtl,
    },
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  // No passport, no auth, just session
}

// Dummy middleware for routes that require login — always allows in development
export const isAuthenticated: RequestHandler = (req, res, next) => {
  if (process.env.NODE_ENV === 'development') {
    return next();
  }

  return res.status(401).json({ message: "Unauthorized" });
};
