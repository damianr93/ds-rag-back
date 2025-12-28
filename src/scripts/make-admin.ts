import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function makeAdmin() {
  const email = process.argv[2];
  
  if (!email) {
    console.error('❌ Debes proporcionar un email');
    console.log('Uso: npm run make-admin <email>');
    process.exit(1);
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (!user) {
      console.error(`❌ Usuario con email ${email} no encontrado`);
      process.exit(1);
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        role: 'ADMIN',
        isActive: true
      }
    });

    console.log('✅ Usuario actualizado exitosamente:');
    console.log(`   Email: ${email}`);
    console.log(`   Role: ADMIN`);
    console.log(`   Active: true`);
    console.log('\n💡 Vuelve a hacer login para obtener un nuevo token con los permisos correctos.');
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

makeAdmin();

