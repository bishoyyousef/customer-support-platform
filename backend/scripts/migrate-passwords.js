import bcrypt from 'bcryptjs';
import { connectDb, closeDb } from '../database/connection.js';
import userRepository from '../repositories/userRepository.js';

async function migratePasswords() {
  console.log('Starting password hashing migration...');
  
  try {
    await connectDb();
    
    // Find all users
    const users = await userRepository.collection.find({}).toArray();
    console.log(`Found ${users.length} users.`);
    
    let updatedCount = 0;
    
    for (const user of users) {
      // Check if password is already hashed (bcrypt hashes start with $2a$, $2b$, or $2y$ and are 60 chars long)
      const isAlreadyHashed = user.password && user.password.startsWith('$2') && user.password.length === 60;
      
      if (!isAlreadyHashed) {
        // Hash plaintext password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(user.password, salt);
        
        await userRepository.collection.updateOne(
          { _id: user._id },
          { $set: { password: hashedPassword } }
        );
        
        updatedCount++;
        console.log(`Hashed password for user: ${user.username}`);
      }
    }
    
    console.log(`Migration complete. Successfully hashed ${updatedCount} passwords.`);
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await closeDb();
  }
}

migratePasswords();
