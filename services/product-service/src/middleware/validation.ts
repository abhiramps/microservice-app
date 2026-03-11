import Joi from 'joi';
import { Request, Response, NextFunction } from 'express';

export const createProductSchema = Joi.object({
  name: Joi.string().min(2).max(200).required(),
  description: Joi.string().min(10).max(2000).required(),
  price: Joi.number().positive().required(),
  category: Joi.string().required(),
  attributes: Joi.object().optional(),
  stockQuantity: Joi.number().integer().min(0).required(),
});

export const updateProductSchema = Joi.object({
  name: Joi.string().min(2).max(200),
  description: Joi.string().min(10).max(2000),
  price: Joi.number().positive(),
  category: Joi.string(),
  attributes: Joi.object(),
  stockQuantity: Joi.number().integer().min(0),
  status: Joi.string().valid('active', 'discontinued'),
}).min(1);

export function validate(schema: Joi.ObjectSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error } = schema.validate(req.body, { abortEarly: false });
    if (error) {
      const errors = error.details.map((d) => d.message);
      res.status(400).json({ success: false, error: 'Validation failed', details: errors });
      return;
    }
    next();
  };
}
