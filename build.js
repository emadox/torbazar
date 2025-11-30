#!/usr/bin/env node
/**
 * Build script para Netlify
 * Inyecta las variables de entorno en index.html
 * Se ejecuta automáticamente en el build de Netlify
 */

const fs = require('fs');
const path = require('path');

// Leer variables de entorno (definidas en Netlify dashboard)
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_KEY || '';

console.log('🔨 Build script ejecutándose...');
console.log('SUPABASE_URL:', SUPABASE_URL ? '✓ presente' : '✗ FALTA');
console.log('SUPABASE_KEY:', SUPABASE_KEY ? '✓ presente' : '✗ FALTA');

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.warn('⚠️ Variables de Supabase no encontradas');
    console.warn('Asegúrate de configurar en Netlify Settings → Environment variables:');
    console.warn('  - SUPABASE_URL');
    console.warn('  - SUPABASE_KEY');
    process.exit(0);
}

// Inyectar en index.html
const htmlPath = path.join(__dirname, 'index.html');
let htmlContent = fs.readFileSync(htmlPath, 'utf8');

// Reemplazar las variables en el script de inicialización
const configScript = `
        // Configuración de Supabase desde variables de entorno de Netlify
        // Estas variables se inyectan en tiempo de build por build.js
        window.SUPABASE_URL = '${SUPABASE_URL}';
        window.SUPABASE_KEY = '${SUPABASE_KEY}';
    `;

htmlContent = htmlContent.replace(
    /\/\/.*?window\.SUPABASE_URL = window\.SUPABASE_URL \|\| '';[\s\S]*?window\.SUPABASE_KEY = window\.SUPABASE_KEY \|\| '';[\s\S]*?<\/script>/,
    configScript + '\n    </script>'
);

fs.writeFileSync(htmlPath, htmlContent);
console.log('✅ Variables de Supabase inyectadas en index.html');

