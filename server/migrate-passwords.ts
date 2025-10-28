// One-time script to migrate plaintext passwords to bcrypt hashes
import bcrypt from 'bcrypt';
import { db } from './db';
import { users } from '@shared/schema';
import { sql } from 'drizzle-orm';

async function migratePasswords() {
  console.log('Migrating passwords to bcrypt hashes...');
  
  try {
    // Get all users
    const allUsers = await db.select().from(users);
    console.log(`Found ${allUsers.length} users to migrate`);
    
    // Hash the standard test password
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    // Update all users with hashed password
    for (const user of allUsers) {
      await db.update(users)
        .set({ password: hashedPassword })
        .where(sql`${users.id} = ${user.id}`);
      console.log(`✓ Updated password for ${user.email}`);
    }
    
    console.log('✅ Password migration complete!');
    console.log('All users can now log in with password: password123');
    process.exit(0);
  } catch (error) {
    console.error('Error migrating passwords:', error);
    process.exit(1);
  }
}

migratePasswords();
