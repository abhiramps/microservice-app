import { Product, IProduct } from '../models/Product';
import { logger } from '../utils/logger';

interface CreateProductInput {
  name: string;
  description: string;
  price: number;
  category: string;
  attributes?: Record<string, unknown>;
  stockQuantity: number;
}

interface ProductQuery {
  category?: string;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export class ProductService {
  async create(input: CreateProductInput): Promise<IProduct> {
    const product = await Product.create(input);
    logger.info(`Product created: ${product.id}`);
    return product;
  }

  async findById(id: string): Promise<IProduct | null> {
    return Product.findById(id);
  }

  async findAll(query: ProductQuery) {
    const { category, status, search, page = 1, limit = 20 } = query;
    const filter: Record<string, unknown> = {};

    if (category) filter.category = category;
    if (status) filter.status = status;
    if (search) filter.$text = { $search: search };

    const total = await Product.countDocuments(filter);
    const products = await Product.find(filter)
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdAt: -1 });

    return {
      products,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async update(id: string, input: Partial<CreateProductInput>): Promise<IProduct | null> {
    const product = await Product.findByIdAndUpdate(id, input, { new: true, runValidators: true });
    if (product) {
      logger.info(`Product updated: ${id}`);
    }
    return product;
  }

  async delete(id: string): Promise<boolean> {
    const result = await Product.findByIdAndDelete(id);
    if (result) {
      logger.info(`Product deleted: ${id}`);
    }
    return !!result;
  }
}
