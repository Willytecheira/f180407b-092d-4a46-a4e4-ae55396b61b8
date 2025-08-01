const fs = require('fs-extra');
const path = require('path');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

class UserManager {
  constructor() {
    this.dataPath = path.join(process.cwd(), 'data');
    this.usersFile = path.join(this.dataPath, 'users.json');
    this.users = new Map();
    this.initializeStorage();
  }

  async initializeStorage() {
    try {
      await fs.ensureDir(this.dataPath);
      await this.loadUsers();
      
      // Crear usuario admin por defecto si no existe
      if (this.users.size === 0) {
        await this.createDefaultAdmin();
      }
      
      console.log('👥 UserManager inicializado correctamente');
    } catch (error) {
      console.error('Error inicializando UserManager:', error);
    }
  }

  async loadUsers() {
    try {
      if (await fs.pathExists(this.usersFile)) {
        const userData = await fs.readJson(this.usersFile);
        this.users = new Map(Object.entries(userData));
        console.log(`👥 ${this.users.size} usuarios cargados`);
      }
    } catch (error) {
      console.error('Error cargando usuarios:', error);
    }
  }

  async saveUsers() {
    try {
      const userData = Object.fromEntries(this.users.entries());
      await fs.writeJson(this.usersFile, userData, { spaces: 2 });
      console.log('💾 Usuarios guardados en archivo');
    } catch (error) {
      console.error('Error guardando usuarios:', error);
    }
  }

  async createDefaultAdmin() {
    const hashedPassword = await bcrypt.hash('admin123', 12);
    const adminUser = {
      id: uuidv4(),
      username: 'admin',
      email: 'admin@whatsapp-api.com',
      password: hashedPassword,
      role: 'admin',
      active: true,
      createdAt: new Date().toISOString(),
      lastLogin: null,
      permissions: ['*']
    };

    this.users.set('admin', adminUser);
    await this.saveUsers();
    console.log('🔑 Usuario admin por defecto creado');
  }

  async createUser(userData) {
    const { username, email, password, role = 'viewer', permissions = [] } = userData;

    if (this.users.has(username)) {
      throw new Error('El nombre de usuario ya existe');
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const newUser = {
      id: uuidv4(),
      username,
      email,
      password: hashedPassword,
      role,
      active: true,
      createdAt: new Date().toISOString(),
      lastLogin: null,
      permissions
    };

    this.users.set(username, newUser);
    await this.saveUsers();

    // Retornar usuario sin contraseña
    const { password: _, ...userResponse } = newUser;
    return userResponse;
  }

  async updateUser(username, updateData) {
    const user = this.users.get(username);
    if (!user) {
      throw new Error('Usuario no encontrado');
    }

    const updatedUser = { ...user, ...updateData };
    
    // Si se actualiza la contraseña, hashearla
    if (updateData.password) {
      updatedUser.password = await bcrypt.hash(updateData.password, 12);
    }

    updatedUser.updatedAt = new Date().toISOString();
    this.users.set(username, updatedUser);
    await this.saveUsers();

    // Retornar usuario sin contraseña
    const { password: _, ...userResponse } = updatedUser;
    return userResponse;
  }

  async deleteUser(username) {
    if (username === 'admin') {
      throw new Error('No se puede eliminar el usuario admin');
    }

    if (!this.users.has(username)) {
      throw new Error('Usuario no encontrado');
    }

    this.users.delete(username);
    await this.saveUsers();
    return { success: true, message: 'Usuario eliminado exitosamente' };
  }

  async validateCredentials(username, password) {
    const user = this.users.get(username);
    if (!user || !user.active) {
      return null;
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return null;
    }

    // Actualizar último login
    user.lastLogin = new Date().toISOString();
    this.users.set(username, user);
    await this.saveUsers();

    // Retornar usuario sin contraseña
    const { password: _, ...userResponse } = user;
    return userResponse;
  }

  getAllUsers() {
    const users = [];
    for (const user of this.users.values()) {
      const { password: _, ...userResponse } = user;
      users.push(userResponse);
    }
    return users;
  }

  getUser(username) {
    const user = this.users.get(username);
    if (!user) {
      return null;
    }

    const { password: _, ...userResponse } = user;
    return userResponse;
  }

  async changePassword(username, currentPassword, newPassword) {
    const user = this.users.get(username);
    if (!user) {
      throw new Error('Usuario no encontrado');
    }

    const isCurrentValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentValid) {
      throw new Error('Contraseña actual incorrecta');
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 12);
    user.password = hashedNewPassword;
    user.passwordChangedAt = new Date().toISOString();
    
    this.users.set(username, user);
    await this.saveUsers();

    return { success: true, message: 'Contraseña actualizada exitosamente' };
  }

  getRolePermissions(role) {
    const permissions = {
      admin: ['*'],
      operator: [
        'sessions:read',
        'sessions:create',
        'sessions:delete',
        'messages:send',
        'webhooks:read',
        'webhooks:create',
        'webhooks:delete',
        'metrics:read'
      ],
      viewer: [
        'sessions:read',
        'messages:read',
        'webhooks:read',
        'metrics:read'
      ]
    };

    return permissions[role] || [];
  }

  hasPermission(user, permission) {
    if (user.role === 'admin' || user.permissions.includes('*')) {
      return true;
    }

    const rolePermissions = this.getRolePermissions(user.role);
    return rolePermissions.includes(permission) || user.permissions.includes(permission);
  }
}

module.exports = UserManager;