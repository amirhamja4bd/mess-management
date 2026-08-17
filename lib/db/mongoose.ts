import mongoose from "mongoose";

declare global {
  var __mongooseCache:
    | { conn: mongoose.Mongoose | null; promise: Promise<mongoose.Mongoose> | null }
    | undefined;
}

const MONGODB_URI =
  process.env.MONGODB_URI ??
  process.env.DATABASE_URL ??
  "mongodb://127.0.0.1:27017/messmate";

mongoose.set("strictQuery", true);

const cached = globalThis.__mongooseCache ?? (globalThis.__mongooseCache = {
  conn: null,
  promise: null,
});

export async function connectToDatabase(): Promise<mongoose.Mongoose> {
  if (cached.conn) {
    return cached.conn;
  }

  if (!process.env.MONGODB_URI && process.env.NODE_ENV === "production") {
    throw new Error(
      "MONGODB_URI is not defined. Set it in your environment before running in production."
    );
  }

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(MONGODB_URI, {
        bufferCommands: false,
        serverSelectionTimeoutMS: 10000,
      })
      .then((m) => m);
  }

  try {
    cached.conn = await cached.promise;
  } catch (error) {
    cached.promise = null;
    throw error;
  }

  return cached.conn;
}

export async function disconnectFromDatabase(): Promise<void> {
  await mongoose.disconnect();
  cached.conn = null;
  cached.promise = null;
}

export function isDatabaseConnected(): boolean {
  return mongoose.connection.readyState === 1;
}

export { mongoose };
