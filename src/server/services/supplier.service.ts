import { db } from '../../db/index.js';
import { suppliers, products, productSuppliers } from '../../db/schema/index.js';
import { eq, and, ilike, isNull, sql, desc } from 'drizzle-orm';

export class SupplierService {
  // Create supplier
  async createSupplier(data: CreateSupplierInput, tenantId: number) {
    // Check if supplier with same name already exists
    const existingSupplier = await db.query.suppliers.findFirst({
      where: and(
        eq(suppliers.name, data.name),
        eq(suppliers.tenantId, tenantId),
        isNull(suppliers.deletedAt)
      ),
    });

    if (existingSupplier) {
      throw new Error('Supplier with this name already exists');
    }

    // Create supplier
    const [supplier] = await db
      .insert(suppliers)
      .values({
        ...data,
        tenantId,
      })
      .returning();

    return supplier;
  }

  // Get all suppliers with pagination
  async getSuppliers(
    tenantId: number,
    filters: {
      page: number;
      limit: number;
      search?: string | undefined;
    }
  ) {
    const { page, limit, search } = filters;
    const offset = (page - 1) * limit;

    // Build where conditions
    const conditions = [
      eq(suppliers.tenantId, tenantId),
      isNull(suppliers.deletedAt),
    ];

    // Search by name, email, or contact person
    if (search) {
      conditions.push(
        sql`(
          ${suppliers.name} ILIKE ${`%${search}%`} OR
          ${suppliers.email} ILIKE ${`%${search}%`} OR
          ${suppliers.contactPerson} ILIKE ${`%${search}%`}
        )`
      );
    }

    // Get total count
    const totalResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(suppliers)
      .where(and(...conditions));

    const total = totalResult[0]?.count || 0;

    // Get suppliers with product count
    const suppliersList = await db
      .select({
        id: suppliers.id,
        name: suppliers.name,
        email: suppliers.email,
        phone: suppliers.phone,
        address: suppliers.address,
        contactPerson: suppliers.contactPerson,
        productCount: sql<number>`count(distinct ${productSuppliers.productId})`,
        createdAt: suppliers.createdAt,
        updatedAt: suppliers.updatedAt,
      })
      .from(suppliers)
      .leftJoin(productSuppliers, eq(productSuppliers.supplierId, suppliers.id))
      .where(and(...conditions))
      .groupBy(suppliers.id)
      .orderBy(suppliers.name)
      .limit(limit)
      .offset(offset);

    return {
      suppliers: suppliersList,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Get single supplier with details
  async getSupplierById(id: number, tenantId: number) {
    const supplier = await db
      .select({
        id: suppliers.id,
        name: suppliers.name,
        email: suppliers.email,
        phone: suppliers.phone,
        address: suppliers.address,
        contactPerson: suppliers.contactPerson,
        productCount: sql<number>`count(distinct ${productSuppliers.productId})`,
        createdAt: suppliers.createdAt,
        updatedAt: suppliers.updatedAt,
      })
      .from(suppliers)
      .leftJoin(productSuppliers, eq(productSuppliers.supplierId, suppliers.id))
      .where(
        and(
          eq(suppliers.id, id),
          eq(suppliers.tenantId, tenantId),
          isNull(suppliers.deletedAt)
        )
      )
      .groupBy(suppliers.id)
      .limit(1);

    if (!supplier[0]) {
      throw new Error('Supplier not found');
    }

    return supplier[0];
  }

  // Update supplier
  async updateSupplier(id: number, data: UpdateSupplierInput, tenantId: number) {
    // Check if supplier exists
    await this.getSupplierById(id, tenantId);

    // Check name uniqueness if name is changing
    if (data.name) {
      const duplicate = await db.query.suppliers.findFirst({
        where: and(
          eq(suppliers.name, data.name),
          eq(suppliers.tenantId, tenantId),
          isNull(suppliers.deletedAt),
          sql`${suppliers.id} != ${id}`
        ),
      });

      if (duplicate) {
        throw new Error('Supplier with this name already exists');
      }
    }

    // Update supplier
    const [updatedSupplier] = await db
      .update(suppliers)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(suppliers.id, id),
          eq(suppliers.tenantId, tenantId)
        )
      )
      .returning();

    if (!updatedSupplier) {
      throw new Error('Failed to update supplier');
    }

    return updatedSupplier;
  }

  // Soft delete supplier
  async deleteSupplier(id: number, tenantId: number) {
    // Check if supplier exists
    const supplier = await this.getSupplierById(id, tenantId);

    // Check if supplier has linked products
    if (supplier.productCount > 0) {
      throw new Error(`Cannot delete supplier with ${supplier.productCount} linked products. Remove product links first.`);
    }

    // Soft delete
    const [deletedSupplier] = await db
      .update(suppliers)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(suppliers.id, id),
          eq(suppliers.tenantId, tenantId)
        )
      )
      .returning({ id: suppliers.id, name: suppliers.name });

    if (!deletedSupplier) {
      throw new Error('Failed to delete supplier');
    }

    return deletedSupplier;
  }

  // Link product to supplier
  async linkProduct(supplierId: number, data: LinkProductInput, tenantId: number) {
    // Verify supplier exists and belongs to tenant
    await this.getSupplierById(supplierId, tenantId);

    // Verify product exists and belongs to tenant
    const product: { id: number; name: string; tenantId: number } | undefined = await db.query.products.findFirst({
      where: and(
        eq(products.id, data.productId),
        eq(products.tenantId, tenantId),
        isNull(products.deletedAt)
      ),
      columns: {
        id: true,
        name: true,
        tenantId: true,
      },
    });

    if (!product) {
      throw new Error('Product not found or does not belong to your organization');
    }

    // Check if link already exists
    const existingLink = await db.query.productSuppliers.findFirst({
      where: and(
        eq(productSuppliers.productId, data.productId),
        eq(productSuppliers.supplierId, supplierId)
      ),
    });

    if (existingLink) {
      throw new Error('Product is already linked to this supplier');
    }

    // Create link
    const [link] = await db
      .insert(productSuppliers)
      .values({
        productId: data.productId,
        supplierId,
        supplierPrice: data.supplierPrice,
        leadTimeDays: data.leadTimeDays,
      })
      .returning();

    return link;
  }

  // Update product link
  async updateProductLink(
    supplierId: number,
    productId: number,
    data: UpdateProductLinkInput,
    tenantId: number
  ) {
    // Verify supplier belongs to tenant
    await this.getSupplierById(supplierId, tenantId);

    // Verify product belongs to tenant
    const product: { id: number; tenantId: number } | undefined = await db.query.products.findFirst({
      where: and(
        eq(products.id, productId),
        eq(products.tenantId, tenantId)
      ),
      columns: {
        id: true,
        tenantId: true,
      },
    });

    if (!product) {
      throw new Error('Product not found or does not belong to your organization');
    }

    // Update link
    const [updatedLink] = await db
      .update(productSuppliers)
      .set(data)
      .where(
        and(
          eq(productSuppliers.productId, productId),
          eq(productSuppliers.supplierId, supplierId)
        )
      )
      .returning();

    if (!updatedLink) {
      throw new Error('Product link not found');
    }

    return updatedLink;
  }

  // Remove product link
  async unlinkProduct(supplierId: number, productId: number, tenantId: number) {
    // Verify supplier belongs to tenant
    await this.getSupplierById(supplierId, tenantId);

    // Verify product belongs to tenant
    const product: { id: number; tenantId: number } | undefined = await db.query.products.findFirst({
      where: and(
        eq(products.id, productId),
        eq(products.tenantId, tenantId)
      ),
      columns: {
        id: true,
        tenantId: true,
      },
    });

    if (!product) {
      throw new Error('Product not found');
    }

    // Delete link
    const result = await db
      .delete(productSuppliers)
      .where(
        and(
          eq(productSuppliers.productId, productId),
          eq(productSuppliers.supplierId, supplierId)
        )
      )
      .returning();

    if (!result[0]) {
      throw new Error('Product link not found');
    }

    return { productId, supplierId };
  }

  // Get products for a supplier
  async getSupplierProducts(supplierId: number, tenantId: number) {
    // Verify supplier belongs to tenant
    await this.getSupplierById(supplierId, tenantId);

    const supplierProducts = await db
      .select({
        id: products.id,
        sku: products.sku,
        name: products.name,
        price: products.price,
        quantity: products.quantity,
        supplierPrice: productSuppliers.supplierPrice,
        leadTimeDays: productSuppliers.leadTimeDays,
      })
      .from(productSuppliers)
      .innerJoin(products, eq(productSuppliers.productId, products.id))
      .where(
        and(
          eq(productSuppliers.supplierId, supplierId),
          isNull(products.deletedAt)
        )
      )
      .orderBy(products.name);

    return supplierProducts;
  }

  // Get suppliers for a product
  async getProductSuppliers(productId: number, tenantId: number) {
    // Verify product belongs to tenant
    const product: { id: number; tenantId: number } | undefined = await db.query.products.findFirst({
      where: and(
        eq(products.id, productId),
        eq(products.tenantId, tenantId),
        isNull(products.deletedAt)
      ),
      columns: {
        id: true,
        tenantId: true,
      },
    });

    if (!product) {
      throw new Error('Product not found');
    }

    const productSuppliersList = await db
      .select({
        id: suppliers.id,
        name: suppliers.name,
        email: suppliers.email,
        phone: suppliers.phone,
        contactPerson: suppliers.contactPerson,
        supplierPrice: productSuppliers.supplierPrice,
        leadTimeDays: productSuppliers.leadTimeDays,
      })
      .from(productSuppliers)
      .innerJoin(suppliers, eq(productSuppliers.supplierId, suppliers.id))
      .where(
        and(
          eq(productSuppliers.productId, productId),
          isNull(suppliers.deletedAt)
        )
      )
      .orderBy(suppliers.name);

    return productSuppliersList;
  }

  // Get supplier statistics
  async getSupplierStats(tenantId: number) {
    const stats = await db
      .select({
        totalSuppliers: sql<number>`count(distinct ${suppliers.id})`,
        suppliersWithProducts: sql<number>`count(distinct ${suppliers.id}) filter (where ${productSuppliers.productId} is not null)`,
        totalProductLinks: sql<number>`count(${productSuppliers.productId})`,
        avgProductsPerSupplier: sql<number>`avg(product_counts.count)`,
      })
      .from(suppliers)
      .leftJoin(productSuppliers, eq(productSuppliers.supplierId, suppliers.id))
      .leftJoin(
        sql`(
          select supplier_id, count(*) as count
          from product_suppliers
          group by supplier_id
        ) as product_counts`,
        sql`product_counts.supplier_id = ${suppliers.id}`
      )
      .where(
        and(
          eq(suppliers.tenantId, tenantId),
          isNull(suppliers.deletedAt)
        )
      );

    return stats[0];
  }
}

export const supplierService = new SupplierService();

// Types
export type CreateSupplierInput = {
  name: string;
  email?: string | undefined;
  phone?: string | undefined;
  address?: string | undefined;
  contactPerson?: string | undefined;
};

export type UpdateSupplierInput = {
  name?: string | undefined;
  email?: string | undefined;
  phone?: string | undefined;
  address?: string | undefined;
  contactPerson?: string | undefined;
};

export type LinkProductInput = {
  productId: number;
  supplierPrice?: string | undefined;
  leadTimeDays?: number | undefined;
};

export type UpdateProductLinkInput = {
  supplierPrice?: string | undefined;
  leadTimeDays?: number | undefined;
};