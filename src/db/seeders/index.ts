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

  // Create sample products
  const productData = [
    {
      sku: 'ELEC-001',
      name: 'Laptop HP ProBook',
      price: 899.99,
      cost: 650.00,
      quantity: 15,
      reorderPoint: 5,
      categoryId: createdCategories[0].id,
      tenantId: tenant.id,
    },
    {
      sku: 'CLOTH-001',
      name: 'Cotton T-Shirt',
      price: '19.99',
      cost: '8.00',
      quantity: 100,
      reorderPoint: 20,
      categoryId: createdCategories[1].id,
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