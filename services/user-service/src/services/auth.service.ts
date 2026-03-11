import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { User } from '../models/User';
import { config } from '../config';
import { logger } from '../utils/logger';

interface RegisterInput {
  email: string;
  password: string;
  name: string;
}

interface LoginInput {
  email: string;
  password: string;
}

interface AuthResponse {
  user: Record<string, unknown>;
  token: string;
}

export class AuthService {
  async register(input: RegisterInput): Promise<AuthResponse> {
    const existingUser = await User.findOne({ where: { email: input.email } });
    if (existingUser) {
      throw new Error('Email already registered');
    }

    const user = await User.create({
      email: input.email,
      passwordHash: input.password, // bcrypt hook handles hashing
      name: input.name,
    });

    const token = this.generateToken(user);
    logger.info(`User registered: ${user.id}`);

    return { user: user.toSafeJSON(), token };
  }

  async login(input: LoginInput): Promise<AuthResponse> {
    const user = await User.findOne({ where: { email: input.email } });
    if (!user) {
      throw new Error('Invalid email or password');
    }

    const isValidPassword = await user.comparePassword(input.password);
    if (!isValidPassword) {
      throw new Error('Invalid email or password');
    }

    const token = this.generateToken(user);
    logger.info(`User logged in: ${user.id}`);

    return { user: user.toSafeJSON(), token };
  }

  private generateToken(user: User): string {
    return jwt.sign(
      { userId: user.id, email: user.email, role: user.role, jti: uuidv4() },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn as any }
    );
  }
}
