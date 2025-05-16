// Importamos las dependencias necesarias
const express = require("express");
const axios = require("axios");
const app = express();

// Configuración de variables de entorno con valores por defecto
const PORT = process.env.PORT || 3000;

// Configuración de CORS para permitir solicitudes desde cualquier origen de Bitrix24
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

// Ruta principal para registrar el campo personalizado
app.all("/", async (req, res) => {
  try {
    // Configuración del dominio
    const domain = req.query.domain || "crm.biplaza.es";
    const auth = req.query.auth;
    
    // Si no hay token, mostrar instrucciones
    if (!auth) {
      return res.send(`
        <!DOCTYPE html>
        <html lang="es">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Registro de Campo Personalizado para Bitrix24 SPA</title>
          <style>
            body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
            pre { background: #f4f4f4; padding: 10px; border-radius: 5px; overflow-x: auto; }
            .instructions { line-height: 1.6; }
            .important { background-color: #fff8e1; padding: 15px; border-left: 4px solid #ffd600; margin: 20px 0; }
            code { background: #f0f0f0; padding: 2px 5px; border-radius: 3px; }
          </style>
        </head>
        <body>
          <h1>Campo Personalizado "Archivo Electrónico" para Bitrix24 SPA</h1>
          <div class="instructions">
            <p>Esta herramienta registra un campo personalizado tipo "Archivo Electrónico" para Bitrix24 que muestra un botón en lugar de la URL completa.</p>
            
            <div class="important">
              <strong>Importante:</strong> Para registrar el campo, necesitas un token de Bitrix24 con permisos adecuados.
            </div>
            
            <h2>Instrucciones:</h2>
            <ol>
              <li>Obtén un token de Bitrix24:
                <ul>
                  <li>Ve a tu Bitrix24 → Perfil (arriba a la derecha) → Configuración</li>
                  <li>Busca "Tokens de aplicación" o "API" y genera un token</li>
                  <li>Asegúrate de que tenga permisos de CRM y userfield</li>
                </ul>
              </li>
              <li>Registra el campo usando esta URL:
                <pre>https://${req.hostname}/?auth=TU_TOKEN&domain=TU_DOMINIO</pre>
                <p><small>* Reemplaza TU_TOKEN con el token obtenido y TU_DOMINIO con tu dominio de Bitrix24 (ej: crm.biplaza.es)</small></p>
              </li>
            </ol>
          </div>
          
          <h2>Documentación adicional</h2>
          <p>Basado en la <a href="https://apidocs.bitrix24.com/tutorials/crm/how-to-add-crm-objects/how-to-add-user-field-to-spa.html" target="_blank">API de Bitrix24 para campos personalizados en SPA</a>.</p>
        </body>
        </html>
      `);
    }
    
    // Validar token
    if (!auth || auth.trim() === '') {
      return res.status(400).send("❌ El token de autenticación no puede estar vacío");
    }
    
    // Intentar registrar el campo personalizado
    try {
      // Preparar URL y token de forma segura
      const fullDomain = domain.startsWith('http') ? domain : `https://${domain}`;
      const encodedAuth = encodeURIComponent(auth);
      
      // Intentar diferentes endpoints de la API para mayor compatibilidad
      const apiEndpoints = [
        "/rest/userfieldtype.add.json",  // Añadido .json para mayor compatibilidad
        "/rest/userfieldtype.add",
        "/rest/userfield.type.add",
        "/rest/user.userfield.type.add",
        "/rest/userfieldconfig.add"
      ];
      
      // Datos del campo personalizado
      const fieldTypeData = {
        USER_TYPE_ID: "archivo_electronico",
        HANDLER: `https://${req.hostname}/render.js`,
        TITLE: "Archivo electrónico",
        DESCRIPTION: "Botón que abre un enlace personalizado"
      };
      
      console.log(`Intentando registrar campo personalizado en: ${fullDomain}`);
      console.log(`Usando token: ${auth.substring(0, 4)}...${auth.substring(auth.length - 4)}`);
      
      // Probar todos los endpoints posibles
      let success = false;
      let lastResult = null;
      
      for (const endpoint of apiEndpoints) {
        try {
          console.log(`Probando endpoint: ${endpoint}`);
          
          // Hacer la petición a Bitrix24
          const result = await axios({
            method: 'post',
            url: `${fullDomain}${endpoint}`,
            params: { auth: encodedAuth },
            data: fieldTypeData,
            headers: {
              'Content-Type': 'application/json'
            },
            timeout: 15000
          });
          
          console.log(`Respuesta de ${endpoint}:`, JSON.stringify(result.data));
          lastResult = result.data;
          
          if (result.data && result.data.result) {
            success = true;
            break;
          }
        } catch (endpointError) {
          console.error(`Error con endpoint ${endpoint}:`, endpointError.message);
          if (endpointError.response) {
            console.error("Detalles:", JSON.stringify(endpointError.response.data));
          }
        }
      }
      
      if (success) {
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
              .next-steps { background: #e8f5e9; padding: 15px; border-radius: 5px; margin-top: 20px; border-left: 4px solid #4CAF50; }
            </style>
          </head>
          <body>
            <h1 class="success">✅ Campo personalizado registrado correctamente</h1>
            <div class="info">
              <p>El tipo de campo "Archivo electrónico" ha sido registrado exitosamente en tu Bitrix24.</p>
            </div>
            
            <div class="next-steps">
              <h2>Próximos pasos:</h2>
              <ol>
                <li>Ve a tu CRM → Compañías → Configuración → Campos personalizados</li>
                <li>Haz clic en "Añadir campo"</li>
                <li>En la lista de tipos, selecciona "Archivo electrónico"</li>
                <li>Completa la configuración del campo y guárdalo</li>
                <li>El campo aparecerá en las fichas de Compañías, mostrando un botón en lugar de la URL completa</li>
              </ol>
            </div>
          </body>
          </html>
        `);
      } else {
        // Si falla, mostrar el error
        return res.status(400).send(`
          <!DOCTYPE html>
          <html lang="es">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Error al Registrar Campo</title>
            <style>
              body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
              .error { color: #e53935; }
              .error-details { background: #ffebee; padding: 15px; border-radius: 5px; margin-top: 20px; border-left: 4px solid #e53935; }
              .alternative { background: #f5f5f5; padding: 15px; border-radius: 5px; margin-top: 20px; }
              pre { background: #f0f0f0; padding: 10px; border-radius: 3px; overflow-x: auto; }
            </style>
          </head>
          <body>
            <h1 class="error">❌ Error al registrar el campo personalizado</h1>
            
            <div class="error-details">
              <h2>Detalles del error:</h2>
              <pre>${JSON.stringify(result.data, null, 2)}</pre>
            </div>
            
            <div class="alternative">
              <h2>Solución alternativa:</h2>
              <p>Puedes crear un campo tipo "Cadena" regular y usar JavaScript personalizado para transformarlo en un botón.</p>
              <ol>
                <li>Ve a CRM → Compañías → Configuración → Campos personalizados</li>
                <li>Añade un campo tipo "Cadena" con nombre que comience con "UF_ARCHIVO_"</li>
                <li>Luego añade este script en tu Bitrix24 (a través de un administrador):</li>
                <pre>
BX.ready(function() {
  // Transformar campos UF_ARCHIVO_* en botones
  function transformarCamposArchivo() {
    document.querySelectorAll('input[name^="UF_ARCHIVO_"]').forEach(function(input) {
      var container = input.parentElement;
      
      if (!container.querySelector('.archivo-btn')) {
        var btn = document.createElement('a');
        btn.href = input.value || '#';
        btn.target = '_blank';
        btn.className = 'archivo-btn';
        btn.innerHTML = '&lt;button type="button" style="margin-left:10px;padding:5px 10px;background:#2fc6f6;color:white;border:none;border-radius:4px;"&gt;Archivo&lt;/button&gt;';
        
        input.addEventListener('input', function() {
          btn.href = this.value || '#';
        });
        
        container.appendChild(btn);
      }
    });
  }
  
  // Ejecutar al cargar y cada segundo para capturar campos dinámicos
  setTimeout(transformarCamposArchivo, 500);
  setInterval(transformarCamposArchivo, 1000);
});
                </pre>
              </ol>
            </div>
          </body>
          </html>
        `);
      }
    } catch (error) {
      console.error("Error de comunicación:", error.message);
      
      // Preparar mensaje de error detallado
      let errorDetails = "Request failed";
      let statusCode = error.response ? error.response.status : "desconocido";
      let errorData = "No hay datos adicionales";
      
      if (error.response) {
        errorDetails = `Request failed with status code ${error.response.status}`;
        errorData = JSON.stringify(error.response.data || {}, null, 2);
      }
      
      return res.status(500).send(`
        <!DOCTYPE html>
        <html lang="es">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Error en la comunicación con Bitrix24</title>
          <style>
            body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
            .error { color: #e53935; }
            .error-details { background: #ffebee; padding: 15px; border-radius: 5px; margin-top: 20px; border-left: 4px solid #e53935; }
            .solution { background: #e8f5e9; padding: 15px; border-radius: 5px; margin-top: 20px; border-left: 4px solid #4CAF50; }
            pre { background: #f0f0f0; padding: 10px; border-radius: 3px; overflow-x: auto; white-space: pre-wrap; }
            .alternative { background: #e3f2fd; padding: 15px; border-radius: 5px; margin-top: 20px; }
            .code-block { background: #f5f5f5; padding: 15px; border-radius: 5px; margin-top: 10px; white-space: pre-wrap; font-family: monospace; }
          </style>
        </head>
        <body>
          <h1 class="error">❌ Error en la comunicación con Bitrix24</h1>
          
          <div class="error-details">
            <h2>Detalles del error:</h2>
            <p><strong>Mensaje:</strong> ${errorDetails}</p>
            <p><strong>Código de estado:</strong> ${statusCode}</p>
            <p><strong>Dominio utilizado:</strong> ${domain}</p>
            <p><strong>Token (parcial):</strong> ${auth ? auth.substring(0, 4) + '...' + auth.substring(auth.length - 4) : 'No proporcionado'}</p>
            
            <p><strong>Datos adicionales:</strong></p>
            <pre>${errorData}</pre>
            
            <p><strong>Posibles causas:</strong></p>
            <ul>
              <li>El token proporcionado no es válido o ha expirado</li>
              <li>El dominio de Bitrix24 es incorrecto</li>
              <li>El token no tiene los permisos necesarios (userfield, crm)</li>
              <li>Hay problemas de red o conexión</li>
              <li>La API de Bitrix24 ha cambiado o requiere una autenticación diferente</li>
            </ul>
          </div>
          
          <div class="solution">
            <h2>Soluciones:</h2>
            <ol>
              <li><strong>Usa un webhook con permisos completos:</strong>
                <ul>
                  <li>Ve a tu Bitrix24 → Configuración → Webhooks entrantes</li>
                  <li>Crea un nuevo webhook con <strong>TODOS los permisos</strong> (especialmente "userfield" y "crm")</li>
                  <li>Copia el token generado y úsalo en la URL</li>
                </ul>
              </li>
              <li><strong>Usa la URL correcta:</strong>
                <p>Asegúrate de que la URL tenga este formato:</p>
                <div class="code-block">https://${req.hostname}/?auth=TU_TOKEN&domain=crm.biplaza.es</div>
              </li>
              <li><strong>Verifica el dominio:</strong>
                <p>El dominio debe ser exactamente como aparece en tu navegador (sin https:// al inicio):</p>
                <div class="code-block">domain=crm.biplaza.es</div>
              </li>
            </ol>
          </div>
          
          <div class="alternative">
            <h2>Alternativa: Solución manual</h2>
            <p>Si continúas teniendo problemas, puedes implementar una solución manual usando JavaScript personalizado en Bitrix24:</p>
            <ol>
              <li>Crea un campo personalizado regular de tipo "Cadena" en CRM → Compañías</li>
              <li>Dale un nombre que comience con "UF_ARCHIVO_" (ejemplo: UF_ARCHIVO_CONTRATO)</li>
              <li>Pide a tu administrador que añada este JavaScript a la configuración de Bitrix24:</li>
              <pre>
BX.ready(function() {
  function transformarCamposArchivo() {
    document.querySelectorAll('input[name^="UF_ARCHIVO_"]').forEach(function(input) {
      if (!input.hasAttribute('data-procesado')) {
        input.setAttribute('data-procesado', 'true');
        var btn = document.createElement('a');
        btn.href = input.value || '#';
        btn.target = '_blank';
        btn.innerHTML = '&lt;button type="button" style="margin-left:10px;padding:5px 10px;background:#2fc6f6;color:white;border:none;border-radius:4px;"&gt;Archivo&lt;/button&gt;';
        
        input.addEventListener('input', function() {
          btn.href = this.value || '#';
        });
        
        input.parentNode.appendChild(btn);
      }
    });
  }
  
  setInterval(transformarCamposArchivo, 1000);
});</pre>
            </ol>
          </div>
        </body>
        </html>
      `);
    }
  } catch (err) {
    console.error("Error general:", err.message);
    return res.status(500).send(`Error general: ${err.message}`);
  }
});

// Ruta para el JavaScript que renderiza el campo personalizado
app.get("/render.js", (req, res) => {
  res.setHeader("Content-Type", "application/javascript");
  res.setHeader("Cache-Control", "public, max-age=86400"); // Caché de 24h
  
  // Este JavaScript se basa en la documentación de Bitrix24 para SPA
  // https://apidocs.bitrix24.com/tutorials/crm/how-to-add-crm-objects/how-to-add-user-field-to-spa.html
  res.send(`
    BX.namespace('BX.Crm.UserField.Types');
    
    /**
     * Campo personalizado tipo Archivo Electrónico para Bitrix24
     * Muestra un botón que abre la URL en una nueva ventana
     */
    BX.Crm.UserField.Types.ArchivoElectronico = {
      /**
       * Método principal para renderizar el campo
       */
      renderEditForm: function(params) {
        return BX.create('div', {
          props: { className: 'ui-ctl ui-ctl-textbox ui-ctl-w100 archivo-electronico-container' },
          children: [
            BX.create('input', {
              props: {
                className: 'ui-ctl-element',
                type: 'text',
                name: params.name,
                value: params.value || ''
              },
              attrs: {
                placeholder: 'https://ejemplo.com/archivo.pdf'
              },
              events: {
                input: function(e) {
                  var btnLink = e.target.parentNode.querySelector('.archivo-btn');
                  if (btnLink) {
                    btnLink.href = e.target.value || '#';
                  }
                }
              }
            }),
            BX.create('a', {
              props: {
                className: 'archivo-btn',
                href: params.value || '#',
                target: '_blank'
              },
              children: [
                BX.create('button', {
                  props: {
                    className: 'ui-btn ui-btn-primary ui-btn-sm',
                    type: 'button'
                  },
                  text: 'Archivo',
                  style: {
                    marginLeft: '10px'
                  }
                })
              ]
            })
          ]
        });
      },
      
      /**
       * Renderiza la vista (modo visualización, no edición)
       */
      renderView: function(params) {
        if (!params.value || params.value.trim() === '') {
          return BX.create('div', {
            props: { className: 'archivo-electronico-view' },
            html: '<span style="color:#999">No hay archivo configurado</span>'
          });
        }
        
        return BX.create('div', {
          props: { className: 'archivo-electronico-view' },
          children: [
            BX.create('a', {
              props: {
                href: params.value,
                target: '_blank'
              },
              children: [
                BX.create('button', {
                  props: {
                    className: 'ui-btn ui-btn-primary ui-btn-sm',
                    type: 'button'
                  },
                  text: 'Archivo'
                })
              ]
            })
          ]
        });
      },
      
      /**
       * Compatibilidad con versiones anteriores
       */
      getEditFormValue: function(params) {
        return params.node.querySelector('input').value;
      },
      
      /**
       * Obtiene los valores actuales para guardar
       */
      getValue: function(params) {
        return params.node.querySelector('input').value;
      },
      
      /**
       * Validación de datos
       */
      validate: function(result, params) {
        var value = params.node.querySelector('input').value;
        
        // El campo es opcional, a menos que se marque como requerido
        if (params.mandatory === 'Y' && (!value || value.trim() === '')) {
          result.push({
            message: 'Este campo es obligatorio',
            field: params.fieldName
          });
        } else if (value && value.trim() !== '') {
          // Validar formato de URL si hay un valor
          try {
            new URL(value);
          } catch (e) {
            result.push({
              message: 'Por favor, introduce una URL válida',
              field: params.fieldName
            });
          }
        }
      }
    };
    
    /**
     * Registro del campo para compatibilidad con versiones anteriores
     */
    BX.Crm.UserField.Types['archivo_electronico'] = BX.Crm.UserField.Types.ArchivoElectronico;
    
    /**
     * Compatibilidad adicional con la interfaz clásica
     */
    BX.namespace('BX.BitrixCustomFields');
    BX.BitrixCustomFields = {
      getPublicView: function(value, params) {
        if (!value || value.trim() === '') {
          return '<span style="color:#999">No hay archivo configurado</span>';
        }
        
        try {
          const url = new URL(value);
          if (url.protocol !== 'http:' && url.protocol !== 'https:') {
            return '<span style="color:red">URL no válida: protocolo no permitido</span>';
          }
          
          const safeValue = BX.util.htmlspecialchars(value);
          
          return '<a href="' + safeValue + '" target="_blank" rel="noopener noreferrer">' + 
                 '<button style="padding:6px 12px;background:#2fc6f6;color:white;border:none;border-radius:4px;cursor:pointer;">' +
                 'Archivo electrónico</button></a>';
        } catch (e) {
          return '<span style="color:red">URL no válida</span>';
        }
      },
      
      getEditView: function(value, params) {
        const safeFieldName = BX.util.htmlspecialchars(params.FIELD_NAME);
        const safeValue = BX.util.htmlspecialchars(value || "");
        
        return '<div class="archivo-electronico-edit">' +
               '<input type="text" name="' + safeFieldName + '" value="' + safeValue + '" ' +
               'style="width:calc(100% - 150px);padding:5px;" placeholder="https://ejemplo.com/archivo.pdf" />' +
               '<a href="' + safeValue + '" target="_blank">' +
               '<button type="button" style="margin-left:10px;padding:5px 10px;background:#2fc6f6;color:white;border:none;' +
               'border-radius:4px;cursor:pointer;">Archivo electrónico</button></a>' +
               '</div>';
      },
      
      getSettings: function(settings) {
        return [];
      }
    };
  `);
});

// Ruta de estado para verificar que el servicio está funcionando
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "UP",
    version: "1.1.0",
    message: "Servicio de campo personalizado Archivo Electrónico funcionando correctamente"
  });
});

// Iniciar el servidor
const server = app.listen(PORT, () => {
  console.log(`Servidor activo en puerto ${PORT}`);
});

module.exports = app;
