const bcrypt = require('bcrypt');

const hash = '$2b$10$MTK2Y7ez6xrOwrDSnA9eUe3E5xMq.CEIE.gmssPmk4dtd8SrRfNsi';
const passwords = ['admin', '123456', '12345678', 'password', 'admin123', 'admin@123'];

for (const pass of passwords) {
  if (bcrypt.compareSync(pass, hash)) {
    console.log('Match found: ', pass);
    process.exit(0);
  }
}
console.log('No match found');
