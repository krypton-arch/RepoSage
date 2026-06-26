import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null;

        try {
          const backendUrl = process.env.BACKEND_URL || "http://127.0.0.1:8000";
          const res = await fetch(`${backendUrl}/api/auth/token/`, {
            method: 'POST',
            body: JSON.stringify({
              username: credentials.username,
              password: credentials.password,
            }),
            headers: { "Content-Type": "application/json" }
          });
          const user = await res.json();

          if (res.ok && user && user.access) {
            return {
              id: credentials.username,
              name: credentials.username,
              accessToken: user.access,
              refreshToken: user.refresh,
            } as any;
          }
          return null;
        } catch (e) {
          console.error("Auth error", e);
          return null;
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.accessToken = (user as any).accessToken;
        token.refreshToken = (user as any).refreshToken;
      }
      return token;
    },
    async session({ session, token }) {
      (session as any).accessToken = token.accessToken;
      return session;
    }
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: "jwt"
  },
  secret: process.env.NEXTAUTH_SECRET || "reposage-airgapped-super-secret-key-1234"
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
