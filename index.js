// Importaciones y configuración
const express = require("express");
const axios = require("axios");
const helmet = require("helmet"); // Añadido para seguridad
const rateLimit = require("express-rate-limit"); // Para prevenir abusos
const { body, validationResult } = require('express-validator'); // Validación
const app = express();

// Configuración de seguridad básica con helmet
app.use(helmet());

// Configuración de variables de entorno con valores por defecto
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Límite de tasa para prevenir ataques de fuerza bruta
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // límite de 100 solicitudes por ventana
  standardHeaders: true,
  legacyHeaders: false
});
app.use(limiter);

// Middleware para registrar solicitudes en desarrollo
if (NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
  });
}

// Caché para evitar registros duplicados (simulado)
const registrationCache = new Map();

// Escapar HTML para prevenir XSS
function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Validar URL
function isValidUrl(string) {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
}

// Ruta principal
app.all("/", async (req, res) => {
  try {
    // Configuración de dominio - Más visible para depuración
    const domain = process.env.BITRIX_DOMAIN || "crm.biplaza.es";
    console.log("Usando dominio:", domain);
    const auth = req.query.auth;
    console.log("Token recibido:", auth);
    
    // Si no hay token, mostrar instrucciones
    if (!auth) {
      return res.send(`
        <!DOCTYPE html>
        <html lang="es">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Registro de Campo Personalizado Bitrix24</title>
          <style>
            body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
            pre { background: #f4f4f4; padding: 10px; border-radius: 5px; overflow-x: auto; }
            .instructions { line-height: 1.6; }
          </style>
        </head>
        <body>
          <h1>Campo Personalizado "Archivo Electrónico"</h1>
          <div class="instructions">
            <p>Para registrar el campo personalizado, accede a esta URL con tu token de Bitrix:</p>
            <pre>https://${req.hostname}/?auth=TU_TOKEN</pre>
            <p>Nota: El token lo puedes obtener desde la configuración de integraciones de Bitrix24.</p>
          </div>
        </body>
        </html>
      `);
    }
    
    // Validar que el token no esté vacío
    if (!auth || auth.trim() === '') {
      return res.status(400).send("❌ El token de autenticación no puede estar vacío");
    }
    
    // Verificar si ya se registró este campo (usando caché)
    const cacheKey = `${domain}-${auth}`;
    if (registrationCache.has(cacheKey)) {
      return res.send("✅ El campo personalizado 'archivo_electronico_button' ya está registrado.");
    }
    
    // Preparar petición a Bitrix24
    const fieldTypeData = {
      USER_TYPE_ID: "archivo_electronico_button",
      HANDLER: `https://${req.hostname}/render.js`,
      TITLE: "Archivo electrónico",
      DESCRIPTION: "Botón que abre un enlace personalizado en una nueva ventana"
    };
    
    // Registrar el campo en Bitrix24
    console.log(`Enviando petición a: https://${domain}/rest/userfieldtype.add con token: ${auth}`);
    try {
      const result = await axios.post(`https://${domain}/rest/userfieldtype.add`, fieldTypeData, {
        params: { auth },
        timeout: 10000, // Timeout de 10s
        validateStatus: status => status >= 200 && status < 500 // Considerar respuestas de error como válidas
      });
      
      console.log("Respuesta de Bitrix24:", JSON.stringify(result.data));
      
      // Procesar respuesta
    if (result.data.result) {
      // Guardar en caché para evitar reintentos
      registrationCache.set(cacheKey, true);
      
      // Enviar respuesta de éxito
      return res.send(`
        <!DOCTYPE html>
        <html lang="es">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Campo Registrado Correctamente</title>
          <style>
            body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
            .success { color: #4CAF50; font-weight: bold; }
            .info { background: #f9f9f9; padding: 15px; border-radius: 5px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <h1 class="success">✅ Campo personalizado registrado correctamente</h1>
          <div class="info">
            <h2>Pasos siguientes:</h2>
            <ol>
              <li>Ve a la configuración de campos personalizados en tu CRM</li>
              <li>Añade un nuevo campo de tipo "Archivo electrónico" a la entidad deseada</li>
              <li>Guarda la configuración y comienza a usar el nuevo campo</li>
            </ol>
          </div>
        </body>
        </html>
      `);
    } else {
      // Error específico de la API de Bitrix
      return res.status(400).send(`❌ Error al registrar el campo: ${JSON.stringify(result.data)}`);
    }
  } catch (err) {
    console.error(`Error en la ruta principal: ${err.message}`, err);
    
    // Respuesta de error amigable
    return res.status(500).send(`
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Error</title>
        <style>body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }</style>
      </head>
      <body>
        <h1>❌ Error inesperado</h1>
        <p>No se pudo completar la operación:</p>
        <p><strong>${err.message}</strong></p>
        <p>Por favor, verifica tu conexión y que el dominio del CRM sea correcto.</p>
      </body>
      </html>
    `);
  }
});

// Ruta para el JavaScript del campo personalizado
app.get("/render.js", (req, res) => {
  res.setHeader("Content-Type", "application/javascript");
  res.setHeader("Cache-Control", "public, max-age=86400"); // Caché de 24h
  
  res.send(`
    BX.namespace('BX.BitrixCustomFields');
    BX.BitrixCustomFields = {
      /**
       * Renderiza la vista pública del campo
       * @param {string} value - URL del archivo
       * @param {Object} params - Parámetros del campo
       * @return {string} HTML para mostrar
       */
      getPublicView: function(value, params) {
        // Validar la URL antes de renderizar
        if (!value || value.trim() === '') {
          return '<span style="color:#999">No hay archivo configurado</span>';
        }
        
        // Sanear URL para prevenir XSS
        try {
          const url = new URL(value);
          // Solo permitir protocolos seguros
          if (url.protocol !== 'http:' && url.protocol !== 'https:') {
            return '<span style="color:red">URL no válida: protocolo no permitido</span>';
          }
          
          // Sanitizar valor
          const safeValue = BX.util.htmlspecialchars(value);
          
          return '<a href="' + safeValue + '" target="_blank" rel="noopener noreferrer">' + 
                 '<button style="padding:6px 12px;background:#2fc6f6;color:white;border:none;border-radius:4px;cursor:pointer;">' +
                 'Archivo electrónico</button></a>';
        } catch (e) {
          return '<span style="color:red">URL no válida</span>';
        }
      },
      
      /**
       * Renderiza la vista de edición del campo
       * @param {string} value - URL actual del archivo
       * @param {Object} params - Parámetros del campo
       * @return {string} HTML para editar
       */
      getEditView: function(value, params) {
        const safeFieldName = BX.util.htmlspecialchars(params.FIELD_NAME);
        const safeValue = BX.util.htmlspecialchars(value || "");
        
        return '<div class="archivo-electronico-edit">' +
               '<input type="text" name="' + safeFieldName + '" value="' + safeValue + '" ' +
               'style="width:100%;padding:5px;box-sizing:border-box;" placeholder="https://ejemplo.com/archivo.pdf" />' +
               '<small style="color:#777;display:block;margin-top:5px;">Introduce la URL completa del archivo (incluyendo https://)</small>' +
               '</div>';
      },
      
      /**
       * Configuración del campo personalizado
       * @param {Object} settings - Configuración actual
       * @return {Array} Configuración del campo
       */
      getSettings: function(settings) {
        return [
          {
            name: 'HELP_TEXT',
            title: 'Texto de ayuda',
            type: 'string',
            value: settings.HELP_TEXT || 'Introduce la URL del archivo electrónico'
          },
          {
            name: 'BUTTON_TEXT',
            title: 'Texto del botón',
            type: 'string',
            value: settings.BUTTON_TEXT || 'Archivo electrónico'
          }
        ];
      },
      
      /**
       * Validación de datos
       * @param {string} value - Valor a validar
       * @param {Object} params - Parámetros del campo
       * @return {boolean|Object} true si es válido, o objeto con error
       */
      validate: function(value, params) {
        // Permitir valor vacío si el campo no es obligatorio
        if (!value || value.trim() === '') {
          return params.MANDATORY === 'Y' ? 
            { error: true, message: 'Este campo es obligatorio' } : true;
        }
        
        // Validar formato de URL
        try {
          const url = new URL(value);
          // Solo permitir protocolos seguros
          if (url.protocol !== 'http:' && url.protocol !== 'https:') {
            return { error: true, message: 'Solo se permiten URLs con protocolo http o https' };
          }
          return true;
        } catch (e) {
          return { error: true, message: 'La URL introducida no es válida' };
        }
      }
    };
  `);
});

// Ruta para verificar estado del servidor
app.get("/health", (req, res) => {
  res.status(200).json({ status: "UP", version: "1.1.0" });
});

// Manejador global de errores
app.use((err, req, res, next) => {
  console.error(`Error no controlado: ${err.message}`, err);
  res.status(500).send("Error interno del servidor");
});

// Manejador para rutas no encontradas
app.use((req, res) => {
  res.status(404).send("Página no encontrada");
});

// Iniciar el servidor
const server = app.listen(PORT, () => {
  console.log(`Servidor activo en puerto ${PORT} (${NODE_ENV})`);
});

// Manejo de cierre controlado
process.on('SIGTERM', () => {
  console.log('Señal SIGTERM recibida. Cerrando servidor...');
  server.close(() => {
    console.log('Servidor cerrado correctamente');
    process.exit(0);
  });
});

module.exports = app; // Para pruebas
