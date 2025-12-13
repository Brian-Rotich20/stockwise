import { db } from '../../db/index.js';
import { products, categories } from '../../db/schema/index.js';
import { eq, and, ilike, or, sql, isNull, gte, lte, desc, asc } from 'drizzle-orm';

export class ProductService {
  // Generate unique SKU
  async generateSKU(tenantId: number): Promise<string> {
    const prefix = 'PRD';
    const count = await db
      .select({ count: sql<number>`count(*)` })
      .from(products)
      .where(eq(products.tenantId, tenantId));

    const nextNumber = (count[0]?.count || 0) + 1;
    return `${prefix}-${String(nextNumber).padStart(6, '0')}`;
  }

  // Check if SKU exists
  async checkSKUExists(sku: string, tenantId: number, excludeId?: number): Promise<boolean> {
    const conditions = [
      eq(products.sku, sku),
      eq(products.tenantId, tenantId),
      isNull(products.deletedAt),
    ];

    if (excludeId) {
      conditions.push(sql`${products.id} != ${excludeId}`);
    }

    const existing = await db.query.products.findFirst({
      where: and(...conditions),
    });

    return !!existing;
  }

  // Create product
  async createProduct(data: CreateProductInput, tenantId: number) {
    // Check if SKU already exists
    const skuExists = await this.checkSKUExists(data.sku, tenantId);
    if (skuExists) {
      throw new Error(`Product with SKU "${data.sku}" already exists`);
    }

    // Validate category belongs to tenant if provided
    if (data.categoryId) {
      const category = await db.query.categories.findFirst({
        where: and(
          eq(categories.id, data.categoryId),
          eq(categories.tenantId, tenantId)
        ),
      });

      if (!category) {
        throw new Error('Category not found or does not belong to your organization');
      }
    }

    // Create product
    const [product] = await db
      .insert(products)
      .values({
        ...data,
        tenantId,
      })
      .returning();

    return product;
  }

  // Get all products with filters and pagination
  async getProducts(tenantId: number, filters: ProductQueryFilters) {
    const { page, limit, search, categoryId, minPrice, maxPrice, lowStock, sortBy, sortOrder } = filters;
    const offset = (page - 1) * limit;

    // Build where conditions
    const conditions = [
      eq(products.tenantId, tenantId),
      isNull(products.deletedAt),
    ];

    // Search by name, SKU, or barcode
    if (search) {
      conditions.push(
        or(
          ilike(products.name, `%${search}%`),
          ilike(products.sku, `%${search}%`),
          ilike(products.barcode, `%${search}%`)
        )!
      );
    }

    // Filter by category
    if (categoryId) {
      conditions.push(eq(products.categoryId, categoryId));
    }

    // Filter by price range
    if (minPrice !== undefined) {
      conditions.push(gte(products.price, minPrice.toString()));
    }
    if (maxPrice !== undefined) {
      conditions.push(lte(products.price, maxPrice.toString()));
    }

    // Filter low stock products
    if (lowStock) {
      conditions.push(sql`${products.quantity} <= ${products.reorderPoint}`);
    }

    // Determine sort column
    const sortColumn = {
      name: products.name,
      price: products.price,
      quantity: products.quantity,
      createdAt: products.createdAt,
    }[sortBy] || products.createdAt;

    // Get total count
    const totalResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(products)
      .where(and(...conditions));

    const total = totalResult[0]?.count || 0;

    // Get products with category info
    const productsList = await db
      .select({
        id: products.id,
        sku: products.sku,
        name: products.name,
        description: products.description,
        price: products.price,
        cost: products.cost,
        quantity: products.quantity,
        reorderPoint: products.reorderPoint,
        barcode: products.barcode,
        imageUrl: products.imageUrl,
        categoryId: products.categoryId,
        categoryName: categories.name,
        createdAt: products.createdAt,
        updatedAt: products.updatedAt,
      })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(and(...conditions))
      .orderBy(sortOrder === 'asc' ? asc(sortColumn) : desc(sortColumn))
      .limit(limit)
      .offset(offset);

    return {
      products: productsList,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Get single product by ID
  async getProductById(id: number, tenantId: number) {
    const product = await db
      .select({
        id: products.id,
        sku: products.sku,
        name: products.name,
        description: products.description,
        price: products.price,
        cost: products.cost,
        quantity: products.quantity,
        reorderPoint: products.reorderPoint,
        barcode: products.barcode,
        imageUrl: products.imageUrl,
        categoryId: products.categoryId,
        categoryName: categories.name,
        tenantId: products.tenantId,
        createdAt: products.createdAt,
        updatedAt: products.updatedAt,
      })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(
        and(
          eq(products.id, id),
          eq(products.tenantId, tenantId),
          isNull(products.deletedAt)
        )
      )
      .limit(1);

    if (!product[0]) {
      throw new Error('Product not found');
    }

    return product[0];
  }

  // Update product
  async updateProduct(id: number, data: UpdateProductInput, tenantId: number) {
    // Check if product exists and belongs to tenant
    const existingProduct = await this.getProductById(id, tenantId);

    // Check if SKU is being changed and if new SKU exists
    if (data.sku && data.sku !== existingProduct.sku) {
      const skuExists = await this.checkSKUExists(data.sku, tenantId, id);
      if (skuExists) {
        throw new Error(`Product with SKU "${data.sku}" already exists`);
      }
    }

    // Validate category if being changed
    if (data.categoryId) {
      const category = await db.query.categories.findFirst({
        where: and(
          eq(categories.id, data.categoryId),
          eq(categories.tenantId, tenantId)
        ),
      });

      if (!category) {
        throw new Error('Category not found or does not belong to your organization');
      }
    }

    // Update product
    const [updatedProduct] = await db
      .update(products)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(products.id, id),
          eq(products.tenantId, tenantId)
        )
      )
      .returning();

    if (!updatedProduct) {
      throw new Error('Failed to update product');
    }

    return updatedProduct;
  }

  // Soft delete product
  async deleteProduct(id: number, tenantId: number) {
    // Check if product exists
    await this.getProductById(id, tenantId);

    // Soft delete
    const [deletedProduct] = await db
      .update(products)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(products.id, id),
          eq(products.tenantId, tenantId)
        )
      )
      .returning({ id: products.id, name: products.name });

    if (!deletedProduct) {
      throw new Error('Failed to delete product');
    }

    return deletedProduct;
  }

  // Get low stock products
  async getLowStockProducts(tenantId: number) {
    const lowStockProducts = await db
      .select({
        id: products.id,
        sku: products.sku,
        name: products.name,
        quantity: products.quantity,
        reorderPoint: products.reorderPoint,
      })
      .from(products)
      .where(
        and(
          eq(products.tenantId, tenantId),
          isNull(products.deletedAt),
          sql`${products.quantity} <= ${products.reorderPoint}`
        )
      )
      .orderBy(asc(products.quantity));

    return lowStockProducts;
  }

  // Get product statistics
  async getProductStats(tenantId: number) {
    const stats = await db
      .select({
        totalProducts: sql<number>`count(*)`,
        totalValue: sql<number>`sum(CAST(${products.price} as DECIMAL) * ${products.quantity})`,
        lowStockCount: sql<number>`count(*) filter (where ${products.quantity} <= ${products.reorderPoint})`,
        outOfStockCount: sql<number>`count(*) filter (where ${products.quantity} = 0)`,
      })
      .from(products)
      .where(
        and(
          eq(products.tenantId, tenantId),
          isNull(products.deletedAt)
        )
      );

    return stats[0];
  }
}

export const productService = new ProductService();

// Type definitions
export type CreateProductInput = {
  sku: string;
  name: string;
  description?: string | undefined;
  price: string;
  cost?: string | undefined;
  quantity: number;
  reorderPoint: number;
  categoryId?: number | undefined;
  barcode?: string | undefined;
  imageUrl?: string | undefined;
};

export type UpdateProductInput = {
  sku?: string | undefined;
  name?: string | undefined;
  description?: string | undefined;
  price?: string | undefined;
  cost?: string | undefined;
  quantity?: number | undefined;
  reorderPoint?: number | undefined;
  categoryId?: number | undefined;
  barcode?: string | undefined;
  imageUrl?: string | undefined;
};

export type ProductQueryFilters = {
  page: number;
  limit: number;
  search?: string | undefined;
  categoryId?: number | undefined;
  minPrice?: number | undefined;
  maxPrice?: number | undefined;
  lowStock?: boolean | undefined;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
};