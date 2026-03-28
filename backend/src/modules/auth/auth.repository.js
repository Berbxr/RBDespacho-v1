const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class AuthRepository {
  async findUserByUsername(username) {
    // Seleccionamos solo lo necesario, optimizando la memoria
    return await prisma.user.findUnique({
      where: { username },
    });
  }
}

module.exports = new AuthRepository();