import { db } from '../index';
import { tenants, users, categories, products } from '../schema';
import bcrypt from 'bcrypt';

async function seed() {
  console.log('🌱 Seeding database...');

  // Create a tenant
  const [tenant] = await db.insert(tenants).values({
    name: 'Demo Store',
    subscriptionPlan: 'professional',
  }).returning();

  if (!tenant) {
    throw new Error('Failed to create tenant');
  }

  console.log('✅ Tenant created:', tenant.id);

  // Create admin user
  const passwordHash = await bcrypt.hash('admin123', 10);
  const [admin] = await db.insert(users).values({
    email: 'admin@demostore.com',
    passwordHash,
    firstName: 'Admin',
    lastName: 'User',
    role: 'admin',
    tenantId: tenant.id,
  }).returning();

  if (!admin) {
    throw new Error('Failed to create admin user');
  }

  console.log('✅ Admin user created:', admin.email);

  // Create categories
  const categoryData = [
    { name: 'Electronics', tenantId: tenant.id },
    { name: 'Clothing', tenantId: tenant.id },
    { name: 'Food & Beverages', tenantId: tenant.id },
  ];

  const createdCategories = await db.insert(categories).values(categoryData).returning();
  console.log('✅ Categories created:', createdCategories.length);

  // Destructure and guard individual elements so TypeScript knows they're defined
  const [catA, catB] = createdCategories;
  if (!catA || !catB) {
    throw new Error('Failed to create enough categories; expected at least 2');
  }

  // Create sample products (now safe to use catA.id and catB.id)
  const productData = [
    {
      sku: 'ELEC-001',
      name: 'Laptop HP ProBook',
      price: '899.99',
      cost: '650.0',
      quantity: 15,
      reorderPoint: 5,
      categoryId: catA.id,
      tenantId: tenant.id,
    },
    {
      sku: 'CLOTH-001',
      name: 'Cotton T-Shirt',
      price: '19.99',
      cost: '8.0',
      quantity: 100,
      reorderPoint: 20,
      categoryId: catB.id,
      tenantId: tenant.id,
    },
  ];

  const createdProducts = await db.insert(products).values(productData).returning();
  console.log('✅ Products created:', createdProducts.length);

  console.log('🎉 Seeding completed!');
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});