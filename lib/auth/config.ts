import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { USER_STATUS } from "@/lib/constants/enums";
import { connectToDatabase } from "@/lib/db";
import { UserModel } from "@/lib/models";
import { loginSchema } from "@/lib/schemas";
import { verifyPassword } from "@/lib/auth/password";

const REQUIRE_EMAIL_VERIFICATION =
  process.env.REQUIRE_EMAIL_VERIFICATION === "true";

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 30 },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const raw = (credentials ?? {}) as Record<string, unknown>;
        const parsed = loginSchema.safeParse({
          email: raw.email,
          password: raw.password,
        });
        if (!parsed.success) {
          return null;
        }
        await connectToDatabase();
        const user = await UserModel.findOne({
          email: parsed.data.email,
          deletedAt: null,
        }).select("+passwordHash");

        if (!user?.passwordHash) {
          return null;
        }
        if (user.status !== USER_STATUS.ACTIVE) {
          return null;
        }
        if (REQUIRE_EMAIL_VERIFICATION && !user.emailVerifiedAt) {
          return null;
        }

        const valid = await verifyPassword(parsed.data.password, user.passwordHash);
        if (!valid) {
          return null;
        }

        await UserModel.updateOne({ _id: user._id }, { $set: { lastLoginAt: new Date() } });

        return {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          image: user.avatarUrl ?? undefined,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user?.id) {
        token.uid = user.id;
      }
      if (trigger === "update" && user) {
        token.name = user.name;
        token.picture = user.image;
      }
      return token;
    },
    async session({ session, token }) {
      if (token.uid && session.user) {
        session.user.id = token.uid as string;
      }
      return session;
    },
  },
});
