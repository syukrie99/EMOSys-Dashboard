const bcrypt = require('bcrypt');

// Set a default password for each existing user
// Admin keeps using admin123 to match your current login
const defaults = {
  1: 'admin123',      // Admin
  2: 'bond123',       // James Bond
  3: 'nurul123',        // Nurul Ain
  4: 'razif123'        // Razif Azmee
};

(async () => {
  for (const [id, plain] of Object.entries(defaults)) {
    const hash = await bcrypt.hash(plain, 10);
    console.log(`User ${id}: ${plain} -> ${hash}`);
  }
})();
