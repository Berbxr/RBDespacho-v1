const authService = require('./auth.service');

class AuthController {
  async login(req, res) {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ status: 'error', message: 'Usuario y contraseña son requeridos' });
    }

    const result = await authService.login(username, password);
    res.status(200).json({ status: 'success', data: result });
  }
}

module.exports = new AuthController();