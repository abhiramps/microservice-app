import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { logger } from '../utils/logger';

const authService = new AuthService();

export class AuthController {
  async register(req: Request, res: Response): Promise<void> {
    try {
      const result = await authService.register(req.body);
      res.status(201).json({ success: true, data: result });
    } catch (error: any) {
      logger.error('Registration failed:', error);
      if (error.message === 'Email already registered') {
        res.status(409).json({ success: false, error: error.message });
        return;
      }
      res.status(500).json({ success: false, error: 'Registration failed' });
    }
  }

  async login(req: Request, res: Response): Promise<void> {
    try {
      const result = await authService.login(req.body);
      res.json({ success: true, data: result });
    } catch (error: any) {
      logger.error('Login failed:', error);
      if (error.message === 'Invalid email or password') {
        res.status(401).json({ success: false, error: error.message });
        return;
      }
      res.status(500).json({ success: false, error: 'Login failed' });
    }
  }
}
