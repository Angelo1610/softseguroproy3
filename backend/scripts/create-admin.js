const mongoose = require('mongoose');
require('dotenv').config();

/**
 * Script para crear usuario administrador inicial
 */

// Definir schema directamente
const webAuthnCredentialSchema = new mongoose.Schema({
  credentialID: { type: String, required: true },
  credentialPublicKey: { type: Buffer, required: true },
  counter: { type: Number, required: true },
  deviceType: { type: String, required: true },
  backedUp: { type: Boolean, required: true },
  transports: [String],
});

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  role: { type: String, enum: ['admin', 'client'], default: 'client' },
  isActive: { type: Boolean, default: true },
  webAuthnCredentials: [webAuthnCredentialSchema],
  refreshTokens: [{ type: String }],
  failedLoginAttempts: { type: Number, default: 0 },
  lastFailedLogin: Date,
  accountLockedUntil: Date,
  lastLogin: Date,
}, { timestamps: true });

const UserModel = mongoose.model('User', userSchema);

async function createAdmin() {
  try {
    // Conectar a base de datos
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/biometric_auth_db');

    // Verificar si ya existe un admin
    const existingAdmin = await UserModel.findOne({ role: 'admin' });

    if (existingAdmin) {
      console.log('❌ Ya existe un usuario administrador');
      console.log(`   Email: ${existingAdmin.email}`);
      process.exit(0);
    }

    // Crear admin
    const admin = new UserModel({
      email: 'admin@biometric-auth.com',
      name: 'Administrador del Sistema',
      role: 'admin',
      isActive: true,
      webAuthnCredentials: [],
      refreshTokens: [],
      failedLoginAttempts: 0,
    });

    await admin.save();

    console.log('✅ Usuario administrador creado exitosamente');
    console.log('\n📋 Detalles:');
    console.log(`   Email: ${admin.email}`);
    console.log(`   Nombre: ${admin.name}`);
    console.log(`   ID: ${admin.id}`);
    console.log('\n🔐 Próximos pasos:');
    console.log('   1. Iniciar sesión en el frontend');
    console.log('   2. Registrar credencial biométrica');
    console.log('   3. Crear usuarios adicionales desde el dashboard');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error al crear administrador:', error.message);
    await mongoose.disconnect();
    process.exit(1);
  }
}

createAdmin();
