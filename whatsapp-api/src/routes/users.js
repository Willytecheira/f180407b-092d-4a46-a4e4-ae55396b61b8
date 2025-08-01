const express = require('express');

module.exports = (userManager) => {
  const router = express.Router();

  // Middleware para verificar permisos
  const requirePermission = (permission) => {
    return (req, res, next) => {
      const user = req.user; // Asumiendo que el usuario está en req.user desde el middleware de auth
      if (!userManager.hasPermission(user, permission)) {
        return res.status(403).json({
          success: false,
          error: 'Permisos insuficientes'
        });
      }
      next();
    };
  };

  // GET /api/users - Listar usuarios
  router.get('/', requirePermission('users:read'), (req, res) => {
    try {
      const users = userManager.getAllUsers();
      res.json({
        success: true,
        users,
        total: users.length
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // GET /api/users/:username - Obtener usuario específico
  router.get('/:username', requirePermission('users:read'), (req, res) => {
    try {
      const { username } = req.params;
      const user = userManager.getUser(username);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'Usuario no encontrado'
        });
      }

      res.json({
        success: true,
        user
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // POST /api/users - Crear nuevo usuario
  router.post('/', requirePermission('users:create'), async (req, res) => {
    try {
      const { username, email, password, role, permissions } = req.body;

      if (!username || !email || !password) {
        return res.status(400).json({
          success: false,
          error: 'username, email y password son requeridos'
        });
      }

      const user = await userManager.createUser({
        username,
        email,
        password,
        role,
        permissions
      });

      res.status(201).json({
        success: true,
        user,
        message: 'Usuario creado exitosamente'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  });

  // PUT /api/users/:username - Actualizar usuario
  router.put('/:username', requirePermission('users:update'), async (req, res) => {
    try {
      const { username } = req.params;
      const updateData = req.body;

      // No permitir cambiar el username
      delete updateData.username;
      delete updateData.id;
      delete updateData.createdAt;

      const user = await userManager.updateUser(username, updateData);

      res.json({
        success: true,
        user,
        message: 'Usuario actualizado exitosamente'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  });

  // DELETE /api/users/:username - Eliminar usuario
  router.delete('/:username', requirePermission('users:delete'), async (req, res) => {
    try {
      const { username } = req.params;
      const result = await userManager.deleteUser(username);

      res.json({
        success: true,
        message: result.message
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  });

  // POST /api/users/:username/change-password - Cambiar contraseña
  router.post('/:username/change-password', async (req, res) => {
    try {
      const { username } = req.params;
      const { currentPassword, newPassword } = req.body;

      // Verificar que el usuario actual puede cambiar esta contraseña
      if (req.user.username !== username && !userManager.hasPermission(req.user, 'users:update')) {
        return res.status(403).json({
          success: false,
          error: 'No tienes permisos para cambiar esta contraseña'
        });
      }

      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          success: false,
          error: 'currentPassword y newPassword son requeridos'
        });
      }

      const result = await userManager.changePassword(username, currentPassword, newPassword);

      res.json({
        success: true,
        message: result.message
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  });

  // GET /api/users/roles/permissions - Obtener permisos por rol
  router.get('/roles/permissions', requirePermission('users:read'), (req, res) => {
    try {
      const roles = ['admin', 'operator', 'viewer'];
      const permissions = {};

      roles.forEach(role => {
        permissions[role] = userManager.getRolePermissions(role);
      });

      res.json({
        success: true,
        permissions
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  return router;
};