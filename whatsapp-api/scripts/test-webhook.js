#!/usr/bin/env node

const API_KEY = 'whatsapp-api-key-2024';
const BASE_URL = 'https://docker.website';
const SESSION_ID = 'test1';

async function testWebhookConfiguration() {
  console.log('🧪 Iniciando pruebas de configuración de webhook...\n');

  try {
    // 1. Verificar estado del servidor
    console.log('1️⃣ Verificando estado del servidor...');
    const healthResponse = await fetch(`${BASE_URL}/api/health`, {
      headers: { 'X-API-Key': API_KEY }
    });
    
    if (!healthResponse.ok) {
      throw new Error(`Servidor no disponible: ${healthResponse.status}`);
    }
    
    const health = await healthResponse.json();
    console.log(`✅ Servidor OK - Sesiones activas: ${health.activeSessions}`);

    // 2. Verificar estado de la sesión
    console.log('\n2️⃣ Verificando estado de la sesión...');
    const statusResponse = await fetch(`${BASE_URL}/api/status/${SESSION_ID}`, {
      headers: { 'X-API-Key': API_KEY }
    });
    
    if (!statusResponse.ok) {
      throw new Error(`Sesión ${SESSION_ID} no encontrada`);
    }
    
    const status = await statusResponse.json();
    console.log(`✅ Sesión ${SESSION_ID} estado: ${status.status}`);
    
    if (status.status !== 'connected') {
      console.log('⚠️ La sesión no está conectada. Configurando webhook de todos modos...');
    }

    // 3. Configurar webhook
    console.log('\n3️⃣ Configurando webhook...');
    const webhookUrl = 'https://fba1bae0-0bf6-4444-8514-98c389cae2dc.supabase.co/functions/v1/evolution-webhook';
    const events = ['message-received', 'message-delivered', 'message-from-me'];
    
    const configResponse = await fetch(`${BASE_URL}/api/${SESSION_ID}/webhook`, {
      method: 'POST',
      headers: {
        'X-API-Key': API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url: webhookUrl,
        events: events
      })
    });
    
    if (!configResponse.ok) {
      throw new Error(`Error configurando webhook: ${configResponse.status}`);
    }
    
    const config = await configResponse.json();
    console.log('✅ Webhook configurado exitosamente:');
    console.log(`   URL: ${config.webhookUrl}`);
    console.log(`   Eventos: ${config.events.join(', ')}`);

    // 4. Verificar configuración
    console.log('\n4️⃣ Verificando configuración del webhook...');
    const verifyResponse = await fetch(`${BASE_URL}/api/${SESSION_ID}/webhook`, {
      headers: { 'X-API-Key': API_KEY }
    });
    
    if (!verifyResponse.ok) {
      throw new Error(`Error verificando webhook: ${verifyResponse.status}`);
    }
    
    const verification = await verifyResponse.json();
    console.log('✅ Configuración verificada:');
    console.log(`   Configurado: ${verification.configured}`);
    console.log(`   URL: ${verification.webhookUrl}`);
    console.log(`   Eventos: ${verification.events.join(', ')}`);
    console.log(`   Fecha de configuración: ${verification.configuredAt}`);

    console.log('\n🎉 ¡Todas las pruebas completadas exitosamente!');
    console.log('\n📱 Ahora envía un mensaje a tu WhatsApp para probar el webhook.');
    
  } catch (error) {
    console.error('\n❌ Error en las pruebas:', error.message);
    process.exit(1);
  }
}

// Ejecutar pruebas
testWebhookConfiguration();