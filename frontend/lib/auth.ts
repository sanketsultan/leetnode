import type { NextAuthOptions } from 'next-auth';
import GitHubProvider from 'next-auth/providers/github';

export const authOptions: NextAuthOptions = {
  providers: [
    GitHubProvider({
      clientId:     process.env.GITHUB_CLIENT_ID     ?? '',
      clientSecret: process.env.GITHUB_CLIENT_SECRET ?? '',
    }),
  ],

  // JWT strategy — no database adapter required.
  // The GitHub profile is embedded in the signed JWT and surfaced via session.
  session: { strategy: 'jwt' },

  callbacks: {
    // Attach GitHub login and avatar to the JWT so they survive across requests
    async jwt({ token, profile }) {
      if (profile) {
        token.login  = (profile as { login?: string }).login  ?? token.name;
        token.avatar = (profile as { avatar_url?: string }).avatar_url ?? token.picture;
      }
      return token;
    },

    // Expose login + avatar on the client-side session object
    async session({ session, token }) {
      if (session.user) {
        (session.user as typeof session.user & { login: string; avatar: string }).login  = (token.login  as string) ?? '';
        (session.user as typeof session.user & { login: string; avatar: string }).avatar = (token.avatar as string) ?? '';
      }
      return session;
    },
  },

  pages: {
    signIn: '/auth/signin',
  },
};
