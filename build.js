#!/usr/bin/env node
/**
 * Build script para Netlify
 * Inyecta las variables de entorno en script.js
 * Se ejecuta automáticamente en el build de Netlify
 */

const fs = require('fs');
const path = require('path');

// Leer variables de entorno (definidas en Netlify dashboard)
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_KEY || '';

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.warn('⚠️ Variables de Supabase no encontradas en variables de entorno');
    console.warn('Asegúrate de configurar SUPABASE_URL y SUPABASE_KEY en Netlify Settings → Environment variables');
    process.exit(0); // No fallar el build, solo advertir
}

// Leer script.js
const scriptPath = path.join(__dirname, 'script.js');
let scriptContent = fs.readFileSync(scriptPath, 'utf8');

// Reemplazar las variables globales
const configInjection = `
// ⚠️ INYECTADO EN BUILD (no editar manualmente)
window.SUPABASE_URL = '${SUPABASE_URL}';
window.SUPABASE_KEY = '${SUPABASE_KEY}';
`;

// Agregar al inicio del script (después del primer comentario)
if (!scriptContent.includes('window.SUPABASE_URL')) {
    const insertPosition = scriptContent.indexOf('\n\n') + 2;
    scriptContent = scriptContent.slice(0, insertPosition) + configInjection + scriptContent.slice(insertPosition);
    fs.writeFileSync(scriptPath, scriptContent);
    console.log('✅ Variables de Supabase inyectadas en script.js');
} else {
    console.log('✅ script.js ya contiene variables inyectadas');
}
