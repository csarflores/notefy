import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import bcrypt from 'bcryptjs';
import connectDB from './mongodb';
import User from '@/models/User';

// Google OAuth solo se registra si las credenciales están configuradas
const googleConfigured = !!(
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
);

// La verificación de email solo se exige si hay transporte de mail configurado,
// para no bloquear entornos de desarrollo sin SMTP.
export const mailConfigured = !!(
  process.env.EMAIL_USER && process.env.EMAIL_APP_PASSWORD
);

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email y contraseña son requeridos');
        }

        await connectDB();

        const user = await User.findOne({ email: credentials.email.toLowerCase() }).select('+password');

        if (!user) {
          throw new Error('Usuario no encontrado');
        }

        if (!user.password) {
          // Cuenta creada vía OAuth: no tiene contraseña local
          throw new Error('OAUTH_ACCOUNT');
        }

        // Verificar contraseña
        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!isPasswordValid) {
          throw new Error('Contraseña incorrecta');
        }

        if (!user.emailVerified && mailConfigured) {
          throw new Error('EMAIL_NOT_VERIFIED');
        }

        return {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
    ...(googleConfigured
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
          }),
        ]
      : []),
  ],
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/auth/login',
    error: '/auth/login',
  },
  callbacks: {
    async signIn({ user, account }) {
      // Auto-provisioning para OAuth: crear/vincular usuario en MongoDB
      if (account?.provider === 'google') {
        const email = user.email?.toLowerCase();
        if (!email) return false;

        await connectDB();
        let dbUser = await User.findOne({ email });

        if (!dbUser) {
          dbUser = await User.create({
            name: user.name || email.split('@')[0],
            email,
            image: user.image || undefined,
            emailVerified: new Date(), // Google ya verifica el email
          });
        } else {
          let dirty = false;
          if (!dbUser.emailVerified) {
            dbUser.emailVerified = new Date();
            dirty = true;
          }
          if (!dbUser.image && user.image) {
            dbUser.image = user.image;
            dirty = true;
          }
          if (dirty) await dbUser.save();
        }

        // El JWT debe llevar el _id de MongoDB, no el sub de Google
        user.id = dbUser._id.toString();
        user.name = dbUser.name;
        user.image = dbUser.image ?? undefined;
      }
      return true;
    },
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.name = user.name;
        token.picture = user.image ?? undefined;
      }
      if (trigger === 'update' && session) {
        if (session.name !== undefined) token.name = session.name;
        if (session.image !== undefined) token.picture = session.image;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        if (token.name) session.user.name = token.name as string;
        session.user.image = token.picture as string | undefined;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === 'development',
  useSecureCookies: process.env.NODE_ENV === 'production',
};
