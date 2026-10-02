# Piloto de Cookies: contexto para continuar en Claude (Mac)

Este archivo resume lo hecho en la sesión en la nube. Sirve para retomar el trabajo en la app de Claude o en Claude Code del Mac.

## Quién soy y cómo quiero que me respondas

- Soy DocLam (doclam2015-create en GitHub), médico pediatra y médico jefe operativo de un servicio de urgencias.
- **Respóndeme siempre en español**, con lenguaje claro y no técnico.
- La app es para **uso personal, no comercial**, en **Mac, iPad e iPhone**.
- Cuando digo «fusiona», haz el PR y fusiónalo a `main` sin preguntar.

## Qué es la app

**Piloto de Cookies** es una extensión de Safari que responde sola a los avisos de cookies. Por defecto acepta solo las necesarias. Hace todo lo que promete *Super Agent for Safari* (App Store id1568262835) y además tiene funciones extra.

- **Dónde está el código:** repositorio `doclam2015-create/aurum-link`, rama `claude/intelligent-ride-314l91`, carpeta `piloto-cookies/`.
- **Estado:**
  - Está terminada y probada en Chromium: todas las pruebas automáticas pasan.
  - Falta compilarla con Xcode, instalarla en mis dispositivos y probarla en Safari.
  - No se ha fusionado a `main`.
- **Guía completa:** `piloto-cookies/README.md`. Explica cada función, la instalación paso a paso y trae preguntas frecuentes.

## Funciones

**Las mismas de Super Agent:**
- Responde sola a los avisos de cookies, con 3 modos:
  - Sólo necesarias.
  - Personalizado, eligiendo entre Preferencias, Estadísticas y Publicidad.
  - Aceptar todo.
- Tiene una regla propia para cada sitio: General, Necesarias, Elegir, Todas o Pausa.
- Reconoce unas 40 plataformas de consentimiento: OneTrust, Cookiebot, Didomi, Usercentrics, Quantcast, TrustArc, CookieYes, Complianz, Google, YouTube, Amazon, Meta, Microsoft, LinkedIn, Reddit y otras.
- Si no reconoce la plataforma, igual detecta avisos genéricos en 8 idiomas.
- Si un aviso no tiene botón, lo oculta y devuelve el desplazamiento de la página.
- Lleva estadísticas e historial.

**Funciones extra:**
- Señal «No me rastrees» (Global Privacy Control).
- Limpia los parámetros de rastreo de los enlaces (utm, fbclid, gclid…).
- Inspector de cookies con colores por tipo.
- Borra las cookies de rastreo y los datos del sitio.
- Selector para ocultar cualquier elemento de una página.
- Botón «Ver el aviso» para que el aviso aparezca una sola vez.
- Panel con:
  - gráfico de 30 días y rankings;
  - historial con exportación a CSV;
  - respaldo en JSON;
  - tema claro u oscuro;
  - sección de Ayuda.
- Distintivo en el ícono:
  - ✓ verde: rechazó;
  - ✓ naranjo: aceptó;
  - • azul: ocultó el aviso;
  - ❚❚: en pausa.
- Atajo de teclado Alt+Shift+K.

## Estructura de `piloto-cookies/`

| Ruta | Qué contiene |
|---|---|
| `extension/manifest.json` | Configuración de la extensión (Manifest V3, Safari 16.4 o más) |
| `extension/background.js` | Motor de fondo: estadísticas, historial, distintivo, regla GPC y mensajes |
| `extension/content/engine.js` | Detecta y responde los avisos, oculta elementos, limpia enlaces y tiene el selector de elementos |
| `extension/content/rules.js` | Reglas de unas 40 plataformas y palabras clave en varios idiomas |
| `extension/content/page.js` | Llama a las funciones oficiales de cada plataforma y aplica la señal GPC |
| `extension/shared/common.js` | Ajustes por defecto, lista de cookies conocidas y utilidades |
| `extension/shared/ui.css` | Estilos comunes, en claro y oscuro |
| `extension/popup/` | La ventana rápida que se abre al tocar el ícono |
| `extension/options/` | El panel completo y la ventana de bienvenida |
| `extension/icons/` | Íconos, generados con `tools/make_icons.py` |
| `crear-proyecto-xcode.sh` | Crea el proyecto de Xcode con `safari-web-extension-converter` |
| `test/` | Páginas de prueba y `run.mjs` (Playwright) |

## Cómo instalarla (lo pendiente)

Necesitas un Mac con **Xcode**, que es gratis en la App Store, y tu **Apple ID**.

1. Descarga la rama o clónala, abre Terminal en `piloto-cookies/` y ejecuta:
   ```
   ./crear-proyecto-xcode.sh
   ```
   Así se crea la carpeta `xcode/` y se abre el proyecto. El identificador por defecto es `cl.doclam.pilotocookies`.
2. En Xcode, en cada uno de los 4 targets, entra en *Signing & Capabilities* y elige como Team tu «Personal Team».
3. **Para el Mac:**
   - Elige el esquema macOS y presiona ▶.
   - En Safari, entra en Ajustes → Extensiones y activa Piloto de Cookies.
   - Si no aparece, entra en Ajustes → Avanzado, activa «Mostrar funciones para desarrolladores» y luego, en el menú Desarrollo, activa «Permitir extensiones sin firmar».
4. **Para el iPhone y el iPad:**
   - Conecta el dispositivo con cable y activa el Modo de desarrollador.
   - En Xcode, elige el dispositivo y presiona ▶.
   - En el dispositivo, confía en el desarrollador: Ajustes → General → VPN y gestión de dispositivos.
   - Activa la extensión en Ajustes → Apps → Safari → Extensiones y dale permiso en «Todos los sitios web».
5. Con un Apple ID gratuito, la app dura **7 días** en el iPhone y el iPad. Después hay que repetir el paso 4. Con la cuenta de desarrollador pagada dura 1 año.

## Qué pedirle a Claude Code en el Mac

Abre la carpeta del repositorio en Claude Code y escribe, por ejemplo:

> «Lee piloto-cookies/Contexto-Piloto-de-Cookies.md e instala Piloto de Cookies en mi Mac.»

Claude puede encargarse de:
- correr el script;
- compilar con `xcodebuild`;
- revisar los errores.

Tú tendrás que hacer a mano:
- iniciar sesión con tu Apple ID en Xcode;
- elegir el Team de firma;
- activar la extensión en Safari;
- en el iPhone y el iPad, aceptar «Confiar».

## Pruebas automáticas (para Claude)

```
cd piloto-cookies && node test/run.mjs
```

- Usan Playwright en Chromium con la extensión cargada, sobre un servidor local en el puerto 8766.
- Cubren:
  - OneTrust en sus 3 modos;
  - la función oficial de Cookiebot;
  - Usercentrics, que usa shadow DOM;
  - un aviso genérico en español;
  - un muro sin botón;
  - la limpieza de enlaces;
  - el borrado de las cookies `_ga` y `_fbp`;
  - la pausa por sitio.

## Pendientes

- Instalarla en el Mac, el iPhone y el iPad.
- Probarla en Safari real y ajustar las reglas de los sitios donde falle.
- Decidir si se fusiona a `main` de aurum-link o si pasa a un repositorio propio.
