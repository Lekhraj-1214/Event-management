import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma.js';
import { signToken } from '../lib/auth.js';
import { conflict, unauthorized } from '../lib/errors.js';
import { requireAuth } from '../middleware/auth.js';
import { loginSchema, signupSchema } from '../schemas.js';

export const authRouter = Router();

const publicUser = (u: { id: string; name: string; email: string; role: string }) => ({
  id: u.id,
  name: u.name,
  email: u.email,
  role: u.role,
});

authRouter.post('/signup', async (req, res) => {
  const input = signupSchema.parse(req.body);
  const exists = await prisma.user.findUnique({ where: { email: input.email } });
  if (exists) throw conflict('EMAIL_TAKEN', 'An account with this email already exists.');
  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      role: input.role,
      passwordHash: await bcrypt.hash(input.password, 10),
    },
  });
  res.status(201).json({ token: signToken(user), user: publicUser(user) });
});

authRouter.post('/login', async (req, res) => {
  const { email, password } = loginSchema.parse(req.body);
  const user = await prisma.user.findUnique({ where: { email } });
  // Same message for unknown email and wrong password, so we don't leak which emails exist.
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    throw unauthorized('Incorrect email or password.');
  }
  res.json({ token: signToken(user), user: publicUser(user) });
});

authRouter.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});
