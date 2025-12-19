import { db } from '../../db/index.js';
import { categories, products } from '../../db/schema/index.js';
import { eq, and, ilike, isNull, sql } from 'drizzle-orm';

export class CategoryService {
  // Create category
  async createCategory(data: CreateCategoryInput, tenantId: number) {
    // Validate parent category exists and belongs to tenant if provided
    if (data.parentId) {
      const parentCategory = await db.query.categories.findFirst({
        where: and(
          eq(categories.id, data.parentId),
          eq(categories.tenantId, tenantId)
        ),
      });

      if (!parentCategory) {
        throw new Error('Parent category not found or does not belong to your organization');
      }

      // Check for circular reference (prevent category being its own ancestor)
      const isCircular = await this.checkCircularReference(data.parentId, tenantId);
      if (isCircular) {
        throw new Error('Cannot create circular category reference');
      }
    }

    // Check if category name already exists at same level
    const existingCategory = await db.query.categories.findFirst({
      where: and(
        eq(categories.name, data.name),
        eq(categories.tenantId, tenantId),
        data.parentId 
          ? eq(categories.parentId, data.parentId)
          : isNull(categories.parentId)
      ),
    });

    if (existingCategory) {
      throw new Error('Category with this name already exists at this level');
    }

    // Create category
    const [category] = await db
      .insert(categories)
      .values({
        ...data,
        tenantId,
      })
      .returning();

    return category;
  }

  // Get all categories (flat list)
  async getCategories(tenantId: number, filters: { search?: string | undefined; parentId?: number | null | undefined }) {
    const conditions = [eq(categories.tenantId, tenantId)];

    // Search by name
    if (filters.search) {
      conditions.push(ilike(categories.name, `%${filters.search}%`));
    }

    // Filter by parent
    if (filters.parentId !== undefined) {
      if (filters.parentId === null) {
        conditions.push(isNull(categories.parentId)); // Root categories only
      } else {
        conditions.push(eq(categories.parentId, filters.parentId));
      }
    }

    // Get categories with product count
    const categoriesList = await db
      .select({
        id: categories.id,
        name: categories.name,
        description: categories.description,
        parentId: categories.parentId,
        productCount: sql<number>`count(${products.id})`,
        createdAt: categories.createdAt,
        updatedAt: categories.updatedAt,
      })
      .from(categories)
      .leftJoin(
        products, 
        and(
          eq(products.categoryId, categories.id),
          isNull(products.deletedAt)
        )
      )
      .where(and(...conditions))
      .groupBy(categories.id)
      .orderBy(categories.name);

    return categoriesList;
  }

  // Get category tree (hierarchical structure)
  async getCategoryTree(tenantId: number): Promise<CategoryTreeNode[]> {
    // Get all categories for this tenant
    const allCategories = await db
      .select({
        id: categories.id,
        name: categories.name,
        description: categories.description,
        parentId: categories.parentId,
        productCount: sql<number>`count(${products.id})`,
      })
      .from(categories)
      .leftJoin(
        products,
        and(
          eq(products.categoryId, categories.id),
          isNull(products.deletedAt)
        )
      )
      .where(eq(categories.tenantId, tenantId))
      .groupBy(categories.id)
      .orderBy(categories.name);

    // Build tree structure
    return this.buildTree(allCategories);
  }

  // Build hierarchical tree from flat list
  private buildTree(categories: any[], parentId: number | null = null): CategoryTreeNode[] {
    const tree: CategoryTreeNode[] = [];

    for (const category of categories) {
      if (category.parentId === parentId) {
        const children = this.buildTree(categories, category.id);
        tree.push({
          id: category.id,
          name: category.name,
          description: category.description,
          parentId: category.parentId,
          productCount: category.productCount,
          children: children // always an array, even if empty
        });
      }
    }

    return tree;
  }

  // Get single category with details
  async getCategoryById(id: number, tenantId: number) {
    const category = await db
      .select({
        id: categories.id,
        name: categories.name,
        description: categories.description,
        parentId: categories.parentId,
        productCount: sql<number>`count(${products.id})`,
        createdAt: categories.createdAt,
        updatedAt: categories.updatedAt,
      })
      .from(categories)
      .leftJoin(
        products,
        and(
          eq(products.categoryId, categories.id),
          isNull(products.deletedAt)
        )
      )
      .where(
        and(
          eq(categories.id, id),
          eq(categories.tenantId, tenantId)
        )
      )
      .groupBy(categories.id)
      .limit(1);

    if (!category[0]) {
      throw new Error('Category not found');
    }

    // Get parent category name if exists
    let parentName: string | null = null;
    if (category[0].parentId) {
      const parent = await db.query.categories.findFirst({
        where: eq(categories.id, category[0].parentId),
        columns: { name: true },
      });
      parentName = parent?.name || null;
    }

    // Get child categories
    const children = await db
      .select({
        id: categories.id,
        name: categories.name,
      })
      .from(categories)
      .where(eq(categories.parentId, id))
      .orderBy(categories.name);

    return {
      ...category[0],
      parentName,
      children,
    };
  }

  // Get category path (breadcrumb)
async getCategoryPath(id: number, tenantId: number): Promise<CategoryPathNode[]> {
  const path: CategoryPathNode[] = [];
  let currentId: number | null = id;

  while (currentId !== null) {
    // ADD EXPLICIT TYPE HERE
    const category: { id: number; name: string; parentId: number | null } | undefined = await db.query.categories.findFirst({
      where: and(
        eq(categories.id, currentId),
        eq(categories.tenantId, tenantId)
      ),
      columns: {
        id: true,
        name: true,
        parentId: true,
      },
    });

    if (!category) break;

    path.unshift({ id: category.id, name: category.name });
    currentId = category.parentId;
  }

  return path;
}

  // Update category
  async updateCategory(id: number, data: UpdateCategoryInput, tenantId: number) {
    // Check if category exists
    const existingCategory = await this.getCategoryById(id, tenantId);

    // Validate parent category if being changed
    if (data.parentId !== undefined) {
      if (data.parentId === null) {
        // Moving to root level is OK
      } else if (data.parentId === id) {
        throw new Error('Category cannot be its own parent');
      } else {
        // Check parent exists and belongs to tenant
        const parentCategory = await db.query.categories.findFirst({
          where: and(
            eq(categories.id, data.parentId),
            eq(categories.tenantId, tenantId)
          ),
        });

        if (!parentCategory) {
          throw new Error('Parent category not found or does not belong to your organization');
        }

        // Check for circular reference
        const wouldCreateCircle = await this.wouldCreateCircularReference(id, data.parentId, tenantId);
        if (wouldCreateCircle) {
          throw new Error('Cannot create circular category reference');
        }
      }
    }

    // Check name uniqueness at same level if name is changing
    if (data.name && data.name !== existingCategory.name) {
      const targetParentId = data.parentId !== undefined ? data.parentId : existingCategory.parentId;
      
      const duplicate = await db.query.categories.findFirst({
        where: and(
          eq(categories.name, data.name),
          eq(categories.tenantId, tenantId),
          targetParentId 
            ? eq(categories.parentId, targetParentId)
            : isNull(categories.parentId),
          sql`${categories.id} != ${id}` // Exclude current category
        ),
      });

      if (duplicate) {
        throw new Error('Category with this name already exists at this level');
      }
    }

    // Update category
    const [updatedCategory] = await db
      .update(categories)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(categories.id, id),
          eq(categories.tenantId, tenantId)
        )
      )
      .returning();

    if (!updatedCategory) {
      throw new Error('Failed to update category');
    }

    return updatedCategory;
  }

  // Delete category
  async deleteCategory(id: number, tenantId: number) {
    // Check if category exists
    const category = await this.getCategoryById(id, tenantId);

    // Check if category has products
    if (category.productCount > 0) {
      throw new Error(`Cannot delete category with ${category.productCount} products. Move or delete products first.`);
    }

    // Check if category has children
    if (category.children && category.children.length > 0) {
      throw new Error(`Cannot delete category with ${category.children.length} subcategories. Delete subcategories first.`);
    }

    // Delete category
    await db
      .delete(categories)
      .where(
        and(
          eq(categories.id, id),
          eq(categories.tenantId, tenantId)
        )
      );

    return { id, name: category.name };
  }

  // Move category to new parent
  async moveCategory(id: number, newParentId: number | null, tenantId: number) {
    return this.updateCategory(id, { parentId: newParentId }, tenantId);
  }

  // Check if moving category would create circular reference
  private async wouldCreateCircularReference(
    categoryId: number,
    newParentId: number,
    tenantId: number
  ): Promise<boolean> {
    let currentId: number | null = newParentId;

    while (currentId !== null) {
      if (currentId === categoryId) {
        return true; // Found circular reference
      }

      // ADD EXPLICIT TYPE HERE
      const parent: { parentId: number | null } | undefined = await db.query.categories.findFirst({
        where: and(
          eq(categories.id, currentId),
          eq(categories.tenantId, tenantId)
        ),
        columns: { parentId: true },
      });

      currentId = parent?.parentId || null;
    }

    return false;
  }
  // Check circular reference helper
  private async checkCircularReference(parentId: number, tenantId: number): Promise<boolean> {
    // This is a simplified check - full check happens in wouldCreateCircularReference
    return false;
  }

  // Get category statistics
  async getCategoryStats(tenantId: number) {
    const stats = await db
      .select({
        totalCategories: sql<number>`count(distinct ${categories.id})`,
        rootCategories: sql<number>`count(distinct ${categories.id}) filter (where ${categories.parentId} is null)`,
        categoriesWithProducts: sql<number>`count(distinct ${categories.id}) filter (where ${products.id} is not null)`,
        avgProductsPerCategory: sql<number>`avg(product_counts.count)`,
      })
      .from(categories)
      .leftJoin(
        products,
        and(
          eq(products.categoryId, categories.id),
          isNull(products.deletedAt)
        )
      )
      .leftJoin(
        sql`(
          select category_id, count(*) as count
          from products
          where deleted_at is null
          group by category_id
        ) as product_counts`,
        sql`product_counts.category_id = ${categories.id}`
      )
      .where(eq(categories.tenantId, tenantId));

    return stats[0];
  }
}

export const categoryService = new CategoryService();

// Types
export type CreateCategoryInput = {
  name: string;
  description?: string | undefined;
  parentId?: number | undefined;
};

export type UpdateCategoryInput = {
  name?: string | undefined;
  description?: string | undefined;
  parentId?: number | null | undefined;
};

interface CategoryTreeNode {
  id: number;
  name: string;
  description: string | null;
  parentId: number | null;
  productCount: number;
  children?: CategoryTreeNode[];
}

interface CategoryPathNode {
  id: number;
  name: string;
}