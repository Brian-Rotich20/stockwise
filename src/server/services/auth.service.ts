import bcrypt from 'bcrypt';
import { db } from '../../db/index.js';
import { users, tenants, type NewUser, type NewTenant } from '../../db/schema/index.js';
import { eq, and, isNull } from 'drizzle-orm';

export class AuthService {
  // Hash password
  async hashPassword(password: string): Promise<string> {
    const saltRounds = 10;
    return bcrypt.hash(password, saltRounds);
  }

  // Compare password
  async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  // Register new user with tenant
  async register(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    tenantName: string;
  }) {
    // Check if user already exists
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, data.email),
    });

    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Create tenant first
    const [tenant] = await db
      .insert(tenants)
      .values({
        name: data.tenantName,
        subscriptionPlan: 'free',
      })
      .returning();

    if (!tenant) {
      throw new Error('Failed to create tenant');
    }

    // Hash password
    const passwordHash = await this.hashPassword(data.password);

    // Create user as admin of the new tenant
    const [user] = await db
      .insert(users)
      .values({
        email: data.email,
        passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        role: 'admin',
        tenantId: tenant.id,
      })
      .returning({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
        tenantId: users.tenantId,
      });

    return { user, tenant };
  }

  // Login user
  async login(email: string, password: string) {
    // Find user by email
    const user = await db.query.users.findFirst({
      where: and(
        eq(users.email, email),
        isNull(users.deletedAt) // Not soft-deleted
      ),
    });

    if (!user) {
      throw new Error('Invalid email or password');
    }

    // Compare password
    const isValidPassword = await this.comparePassword(password, user.passwordHash);

    if (!isValidPassword) {
      throw new Error('Invalid email or password');
    }

    // Update last login
    await db
      .update(users)
      .set({ lastLogin: new Date() })
      .where(eq(users.id, user.id));

    // Return user without password
    const { passwordHash, deletedAt, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  // Get user by ID
  async getUserById(id: number) {
    const user = await db.query.users.findFirst({
      where: and(
        eq(users.id, id),
        isNull(users.deletedAt)
      ),
    });

    if (!user) {
      throw new Error('User not found');
    }

    const { passwordHash, deletedAt, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  // Verify user belongs to tenant
  async verifyUserTenant(userId: number, tenantId: number): Promise<boolean> {
    const user = await db.query.users.findFirst({
      where: and(
        eq(users.id, userId),
        eq(users.tenantId, tenantId)
      ),
    });

    return !!user;
  }
}

export const authService = new AuthService();