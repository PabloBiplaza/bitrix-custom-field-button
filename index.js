const express = require("express");
const axios = require("axios");

const app = express();
const PORT = process.env.PORT;

app.get("/", async (req, res) => {
  const { domain, auth } = req.query;

  if (!domain || !auth) {
    return res.send(`
      Para registrar el campo personalizado, accede a esta URL desde una app Bitrix:
      <pre>https://TU-URL.onrender.com/?domain=TU_DOMINIO&auth=TOKEN</pre>
    `);
  }

  try {
    const result = await axios.post(`https://${domain}/rest/userfieldtype.add`, {
      USER_TYPE_ID: "archivo_electronico_button",
      HANDLER: `https://${req.hostname}/render.js`,
      TITLE: "Archivo electrónico",
      DESCRIPTION: "Botón que abre un enlace personalizado"
    }, {
      params: { auth }
    });

    if (result.data.result) {
      res.send("✅ Campo personalizado 'archivo_electronico_button' registrado correctamente.");
    } else {
      res.send(`❌ Error al registrar el campo: ${JSON.stringify(result.data)}`);
    }
  } catch (err) {
    res.send(`❌ Error inesperado: ${err.message}`);
  }
});

app.get("/render.js", (req, res) => {
  res.setHeader("Content-Type", "application/javascript");
  res.send(`
    BX.namespace('BX.BitrixCustomFields');
    BX.BitrixCustomFields = {
      getPublicView: function(value, params) {
        return '<a href="' + value + '" target="_blank"><button style="padding:6px 12px;background:#2fc6f6;color:white;border:none;border-radius:4px;">Archivo electrónico</button></a>';
      },
      getEditView: function(value, params) {
        return '<input type="text" name="' + BX.util.htmlspecialchars(params.FIELD_NAME) + '" value="' + BX.util.htmlspecialchars(value || "") + '" />';
      },
      getSettings: function(settings) {
        return [];
      }
    };
  `);
});

app.listen(PORT, () => {
  console.log(`Servidor activo en puerto ${PORT}`);
});
