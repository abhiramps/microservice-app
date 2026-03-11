import { Request, Response } from 'express';
import { User } from '../models/User';
import { logger } from '../utils/logger';

export class UserController {
  async getProfile(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.headers['x-user-id'] as string;
      if (!userId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const user = await User.findByPk(userId);
      if (!user) {
        res.status(404).json({ success: false, error: 'User not found' });
        return;
      }

      res.json({ success: true, data: user.toSafeJSON() });
    } catch (error) {
      logger.error('Get profile failed:', error);
      res.status(500).json({ success: false, error: 'Failed to get profile' });
    }
  }
}
