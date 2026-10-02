# 🍪 Piloto de Cookies

**Extensión de Safari para Mac, iPhone y iPad** que responde por ti los avisos de cookies («¿Aceptas las cookies?») según tus preferencias. Así navegas sin interrupciones y con más privacidad.

Hace todo lo que promete *Super Agent for Safari* y suma funciones extra: limpieza de enlaces de rastreo, señal *Global Privacy Control*, inspector y borrado de cookies, ocultar cualquier elemento molesto, historial, estadísticas, respaldo y modo oscuro.

- Para uso personal, sin fines comerciales.
- Sin cuentas, sin publicidad y sin servidores: **todo ocurre en tu dispositivo**.
- Interfaz completa en español.

---

## Índice

1. [Qué hace, en una frase por función](#1-qué-hace-en-una-frase-por-función)
2. [Instalación (paso a paso)](#2-instalación-paso-a-paso)
3. [Cómo se usa: la ventana rápida](#3-cómo-se-usa-la-ventana-rápida)
4. [El panel completo, sección por sección](#4-el-panel-completo-sección-por-sección)
5. [Preguntas frecuentes y solución de problemas](#5-preguntas-frecuentes-y-solución-de-problemas)
6. [Comparación con Super Agent](#6-comparación-con-super-agent)
7. [Para quien quiera mirar el código](#7-para-quien-quiera-mirar-el-código)

---

## 1. Qué hace, en una frase por función

| Función | Qué hace por ti |
|---|---|
| **Respuesta automática** | Cuando un sitio muestra el aviso de cookies, el piloto lo responde solo, en menos de un segundo, con la opción que tú elegiste. |
| **Tres preferencias** | *Sólo necesarias* (la más privada), *Personalizado* (tú eliges cada categoría) o *Aceptar todo*. |
| **Categorías** | Puedes permitir o negar por separado: Preferencias, Estadísticas y Publicidad y redes. Las Necesarias siempre quedan activas. |
| **Reglas por sitio** | Excepciones a tu preferencia general: por ejemplo, pausar el piloto en tu banco o aceptar todo en un sitio de confianza. |
| **≈40 plataformas reconocidas** | Conoce las plataformas de consentimiento más usadas del mundo (OneTrust, Cookiebot, Didomi, Usercentrics, Quantcast, TrustArc…) y los avisos propios de Google, YouTube, Amazon, Facebook, Instagram, LinkedIn, Microsoft y Reddit. |
| **Reconocimiento inteligente** | Si el aviso no es de una plataforma conocida, lee el texto en 8 idiomas y busca el botón correcto («Rechazar», «Sólo necesarias», «Aceptar»…). |
| **Ocultar lo que no se puede responder** | Si un aviso no tiene botón para rechazar, lo oculta igualmente. |
| **Devolver el desplazamiento** | Algunos avisos bloquean la página para que no puedas bajar. El piloto la desbloquea. |
| **Sin parpadeo** | Oculta los avisos conocidos desde el primer instante, para que ni siquiera los veas aparecer. |
| **Global Privacy Control** ⭐ | Avisa a cada sitio que *no vendas ni compartas tus datos*. En varios países es una señal con valor legal. |
| **Limpieza de enlaces** ⭐ | Quita de las direcciones los códigos de rastreo (`utm_…`, `fbclid`, `gclid` y otros 40). |
| **Borrar cookies de rastreo** ⭐ | Tras rechazar, elimina las cookies conocidas de Google Analytics, Meta, TikTok, Hotjar y otras (opcional). |
| **Inspector de cookies** ⭐ | Muestra las cookies del sitio que estás viendo, clasificadas por colores: necesarias, preferencias, estadísticas, publicidad u otras. |
| **Borrar datos del sitio** ⭐ | Elimina con un toque las cookies y los datos guardados de la página actual. |
| **Ocultar elemento** ⭐ | Tocas cualquier ventana, barra o anuncio molesto y queda oculto para siempre en ese sitio. |
| **Ver el aviso una vez** | Si alguna vez quieres responder tú mismo, recarga la página mostrando el aviso original sólo esa vez. |
| **Estadísticas** | Avisos respondidos hoy y en total, tiempo ahorrado, gráfico de 30 días, plataformas y sitios más frecuentes. |
| **Historial** ⭐ | Lista de los últimos 400 avisos respondidos, con filtro y exportación a Excel (CSV). |
| **Respaldo** ⭐ | Exporta tu configuración a un archivo o al portapapeles para pasarla del Mac al iPhone o iPad. |
| **Aviso discreto y distintivo** | Una pequeña notificación al pie de la página y un ✓ en el ícono te confirman que actuó. |
| **Modo claro y oscuro** | Sigue al sistema o lo eliges tú. |

⭐ = función extra que no trae Super Agent.

---

## 2. Instalación (paso a paso)

Apple sólo permite instalar extensiones de Safari dentro de una app. Por eso la creas una vez en tu Mac con **Xcode**, el programa gratuito de Apple. Desde ahí se instala en el Mac y, con un cable, en el iPhone y el iPad.

> ⏱️ La primera vez toma unos 20 minutos, la mayor parte esperando que Xcode se descargue.

### Parte 1: preparar el Mac (una sola vez)

1. Abre la **App Store** del Mac, busca **Xcode** e instálalo. Es gratis y pesa varios GB.
2. Abre Xcode una vez y acepta lo que te pida (licencia y componentes adicionales). Luego ciérralo.
3. Abre Xcode → menú **Xcode → Settings… (Ajustes) → Accounts (Cuentas)** → botón **+** → **Apple ID** e ingresa con tu cuenta de Apple de siempre.

### Parte 2: crear el proyecto

1. En GitHub, abre este repositorio en la rama `claude/intelligent-ride-314l91`, toca el botón verde **Code → Download ZIP** y descomprímelo (doble clic) en Descargas.
2. Abre la app **Terminal** (búscala con ⌘ + espacio).
3. Escribe `cd ` (con un espacio al final), **arrastra la carpeta `piloto-cookies`** a la ventana de Terminal y pulsa Enter.
4. Escribe esto y pulsa Enter:

   ```
   ./crear-proyecto-xcode.sh
   ```

5. Se crea la carpeta `xcode` y se abre el proyecto en Xcode automáticamente.

### Parte 3: firmar con tu cuenta (una sola vez)

1. En Xcode, en la columna izquierda, haz clic en el ícono azul **Piloto de Cookies** (arriba de todo).
2. En el centro verás una lista de **TARGETS**. Son 4: la app y la extensión, para iOS y para macOS.
3. Para **cada uno de los 4**: pestaña **Signing & Capabilities** → marca **Automatically manage signing** → en **Team** elige tu nombre (*Personal Team*).
4. Si aparece un error de «Bundle Identifier», vuelve a crear el proyecto con otro identificador, por ejemplo `./crear-proyecto-xcode.sh cl.tunombre.pilotocookies`.

### Parte 4: instalar en el Mac

1. Arriba, al centro de Xcode, elige el esquema **Piloto de Cookies (macOS)** y como destino **My Mac**.
2. Pulsa el botón **▶ (Run)**. Se abre una pequeña ventana de la app: ya puedes cerrarla.
3. Abre **Safari → Ajustes → Extensiones**, marca **Piloto de Cookies** y en «Permitir en» elige **Todos los sitios web** (o «Permitir siempre en todos los sitios web»).
4. Verás el ícono de la galleta 🍪 en la barra de Safari. Al instalarse se abre la bienvenida para elegir tu preferencia.

> Si la extensión no aparece en la lista: en Safari → Ajustes → **Avanzado**, marca **Mostrar funciones para desarrolladores web**. Luego, en el menú **Desarrollo**, activa **Permitir extensiones sin firmar** y vuelve a revisar Extensiones. Esa casilla se desmarca cada vez que cierras Safari: si el piloto desaparece, sólo vuelve a marcarla.

### Parte 5: instalar en el iPhone y el iPad

1. Conecta el iPhone (o el iPad) al Mac con el cable y toca **Confiar** en el teléfono.
2. En el iPhone: **Ajustes → Privacidad y seguridad → Modo de desarrollador** → actívalo y reinicia cuando lo pida.
3. En Xcode, elige el esquema **Piloto de Cookies (iOS)** y como destino **tu iPhone**. Pulsa **▶**.
4. La primera vez, el iPhone dirá que el desarrollador no es de confianza: ve a **Ajustes → General → VPN y gestión de dispositivos**, toca tu Apple ID y elige **Confiar**. Vuelve a pulsar ▶ en Xcode.
5. Activa la extensión: **Ajustes → Apps → Safari → Extensiones → Piloto de Cookies** → actívala y en **Todos los sitios web** elige **Permitir**. (En iOS 17 o anterior: Ajustes → Safari → Extensiones.)
6. Repite los mismos pasos con el iPad.

> **Importante, cuenta gratuita de Apple:** las apps instaladas así duran **7 días**. Al vencer, conecta el equipo y vuelve a pulsar ▶ en Xcode: se reinstala en segundos y se conserva tu configuración. Con la cuenta de desarrollador pagada de Apple (USD 99 al año) duran un año.

### Cómo abrir el piloto en Safari

- **Mac:** clic en el ícono 🍪 de la barra de Safari. Atajo de teclado: **⌥ Opción + ⇧ Mayúscula + K**.
- **iPhone:** toca el botón **aA** (o el ícono de extensiones 🧩) en la barra de direcciones → **Piloto de Cookies**.
- **iPad:** toca el ícono 🧩 o **aA** de la barra superior → **Piloto de Cookies**.

---

## 3. Cómo se usa: la ventana rápida

En el día a día **no tienes que hacer nada**: el piloto trabaja solo. La ventana rápida sirve para ver qué hizo y para ajustar cosas en el sitio que estás visitando.

**Encabezado**
- **Interruptor verde (arriba a la derecha):** activa o pausa el piloto en *todos* los sitios.

**Tarjeta del sitio actual**
- **Estado:** te dice qué pasó en esta página.
  - 🟢 *Sólo necesarias*: rechazó todo lo opcional.
  - 🟣 *Personalizado*: aplicó tus categorías.
  - 🟠 *Aceptado*: aceptó todo.
  - 🔵 *Oculto*: no se podía responder y lo ocultó.
  - ⚪ *Sin aviso de cookies*: la página no mostró ninguno.

  Al lado verás la plataforma (por ejemplo «OneTrust»), hace cuánto actuó y cuánto tardó.
- **«En este sitio»:** cambia el comportamiento sólo para esta página y sus subdominios.
  - **General**: usa tu preferencia general.
  - **Necesarias**: rechaza todo lo opcional.
  - **Elegir**: aparecen las categorías para marcar las que quieras en este sitio.
  - **Todas**: acepta todo.
  - **Pausa**: el piloto no actúa aquí. Úsalo si una página deja de funcionar bien.

**Los seis botones**
| Botón | Para qué sirve |
|---|---|
| **Responder de nuevo** | Vuelve a buscar el aviso y lo responde, por ejemplo si apareció tarde o si cambiaste la preferencia. |
| **Ver el aviso** | Recarga la página *sin* el piloto, una sola vez, para que respondas tú el aviso original. |
| **Ocultar elemento** | Se cierra la ventana y aparece una barra arriba de la página. Toca lo que quieres ocultar (un aviso de newsletter, una barra de «descarga nuestra app»…). **Ampliar** selecciona el contenedor más grande. **Ocultar siempre** lo guarda para ese sitio. |
| **Cookies (n)** | Abre el inspector: una barra de colores y la lista de cookies del sitio, cada una con su categoría y, si se conoce, la empresa (Google Analytics, Meta…). |
| **Borrar datos** | Elimina las cookies y los datos guardados del sitio actual. Puede cerrarte la sesión en esa página. |
| **Panel** | Abre el panel completo con todas las opciones. |

**Preferencia general:** cambia rápido entre *Sólo necesarias*, *Personalizado* y *Aceptar todo* para todos los sitios.

**Barra de colores inferior:** avisos respondidos hoy, en total y el tiempo que te has ahorrado.

---

## 4. El panel completo, sección por sección

En el Mac se abre en una pestaña con menú lateral. En el iPhone y el iPad, el menú queda como pestañas deslizables arriba.

### 🏠 Inicio
Tu resumen:
- **Avisos respondidos** desde que lo instalaste.
- **Hoy** y los últimos 7 días.
- **Tiempo ahorrado**, estimado a 6 segundos por aviso (se cambia en Protección).
- **Enlaces limpiados**, es decir, direcciones a las que se les quitaron códigos de rastreo.
- **Gráfico de los últimos 30 días**: pasa el cursor sobre una barra para ver el número del día.
- **Cómo respondió**: dona con el porcentaje de cada tipo de respuesta.
- **Plataformas más vistas** y **Sitios con más avisos**.

### 🎚️ Preferencias
- Elige tu preferencia general tocando una de las tres tarjetas:
  - **Sólo necesarias** (recomendado): rechaza todo lo opcional.
  - **Personalizado**: se activan los interruptores de categorías.
  - **Aceptar todo**: sólo quiere que los avisos desaparezcan.
- **Categorías** (sólo en Personalizado):
  - *Necesarias*: siempre activas, porque sin ellas las páginas no funcionan.
  - *Preferencias*: idioma, región, ajustes.
  - *Estadísticas*: medición de visitas.
  - *Publicidad y redes*: seguimiento para anuncios y botones de redes sociales.
- Si un sitio no permite elegir por categoría, el piloto elige lo más privado (*sólo necesarias*).

### 🛡️ Protección
Cada interruptor, explicado:
- **Piloto activo**: lo pausa o activa en todas partes.
- **Ocultar avisos que no puede responder**: si no hay botón de rechazo, igual hace desaparecer el aviso (y los fondos oscuros que lo acompañan).
- **Devolver el desplazamiento**: desbloquea páginas que el aviso dejó congeladas.
- **Global Privacy Control**: envía a cada sitio la señal «no vendas ni compartas mis datos».
- **Limpiar enlaces de rastreo**: borra de la dirección y de los enlaces que tocas los parámetros `utm_source`, `fbclid`, `gclid`, `msclkid`, `igshid` y otros. La página se ve igual, pero sin rastreo.
- **Borrar cookies de rastreo**: viene apagado. Al encenderlo, después de rechazar elimina cookies conocidas de estadística y publicidad que el sitio ya hubiera puesto.
- **Aviso discreto**: la pequeña píldora «✓ Sólo necesarias · OneTrust» al pie de la página.
- **Distintivo en el ícono**: ✓ verde (rechazó o personalizó), ✓ naranjo (aceptó), • azul (ocultó), ❚❚ (en pausa).
- **Tiempo por aviso**: segundos que estimas ahorrar por aviso, para la estadística.
- **Apariencia**: Auto (según el sistema), Claro u Oscuro.

### 🌐 Sitios
Excepciones por sitio.
- **Agregar:** escribe el dominio (por ejemplo `bancoestado.cl`), elige el comportamiento y toca **Agregar**. Aplica también a sus subdominios (`www.`, `m.`, etc.).
- **Cambiar:** usa el menú de cada fila.
- **Quitar:** toca el basurero.
- **Buscar:** filtra la lista.
- Lo que eliges con «En este sitio» en la ventana rápida aparece aquí.

### 👁️‍🗨️ Elementos ocultos
- Lista de lo que ocultaste con **Ocultar elemento**, sitio por sitio. Toca el basurero para volver a mostrarlo.
- Si sabes de CSS, puedes agregar a mano un selector (por ejemplo `.newsletter-popup`).

### 🕘 Historial
- Los últimos 400 avisos: cuándo, sitio, plataforma, acción y cuánto tardó.
- **Filtrar** por texto o por tipo de acción.
- **Exportar CSV** abre en Excel o Numbers.
- **Borrar** vacía el historial.

### ✅ Compatibilidad
- La lista de plataformas y sitios que el piloto reconoce de forma específica.
- Para el resto usa el reconocimiento automático por texto, en español, inglés, alemán, francés, italiano, portugués, neerlandés y escandinavo.

### 💾 Respaldo
- **Exportar / Importar**: un archivo `.json` con tus preferencias, sitios y elementos ocultos. Sirve para pasar tu configuración del Mac al iPhone (por AirDrop o iCloud Drive).
- **Copiar / Pegar como texto**: alternativa rápida a través de Notas.
- **Reiniciar estadísticas**: deja contadores e historial en cero.
- **Restablecer todo**: vuelve a la configuración de fábrica.

> Cada equipo guarda su propia configuración. Por eso existe el respaldo: configuras en uno y lo importas en los otros.

### ❓ Ayuda
Resumen de activación y respuestas rápidas, dentro de la misma app.

---

## 5. Preguntas frecuentes y solución de problemas

**El piloto no hace nada.**
1. Revisa que esté activado en Ajustes de Safari → Extensiones, **con permiso en todos los sitios web**. Sin ese permiso no puede ver las páginas.
2. Abre la ventana rápida y confirma que el interruptor verde esté encendido y que el sitio no esté en *Pausa*.
3. Recarga la página.

**Una página se ve rara o no funciona después de que el piloto actuó.**
En la ventana rápida, en «En este sitio», toca **Pausa** y recarga. Si sólo quieres responder tú una vez, usa **Ver el aviso**.

**Quiero que en un sitio concreto se acepten las cookies (por ejemplo, para ver videos incrustados).**
«En este sitio» → **Todas**, o **Elegir** y activa sólo *Publicidad y redes*.

**¿Por qué a veces dice «Oculto» y no «Sólo necesarias»?**
El aviso no tenía un botón para rechazar o no se pudo responder. El piloto lo ocultó para que no estorbe. El sitio queda como si no hubieras respondido, lo que en la práctica equivale a no aceptar.

**¿Por qué me pide permiso para «leer y modificar páginas web»?**
Es el permiso que Safari exige a cualquier extensión que actúe en las páginas, porque necesita ver el aviso y tocar sus botones. El piloto no envía nada a ningún lado: no tiene servidores.

**Pasaron 7 días y la extensión dejó de abrir en el iPhone.**
Es el límite de las cuentas gratuitas de Apple. Conecta el iPhone, abre el proyecto en Xcode y pulsa ▶. No pierdes la configuración.

**¿Afecta la batería o la velocidad?**
No de forma apreciable. Trabaja sólo los primeros segundos de cada página y luego se queda quieto.

**¿Me puede cerrar la sesión en algún sitio?**
Sólo si usas **Borrar datos** o activas **Borrar cookies de rastreo**. Esto último nunca toca las cookies de sesión.

---

## 6. Comparación con Super Agent

| | Super Agent | Piloto de Cookies |
|---|:---:|:---:|
| Responde los avisos de cookies automáticamente | ✅ | ✅ |
| Preferencias por categoría | ✅ | ✅ |
| Preferencias por sitio y pausa | ✅ (Premium) | ✅ |
| Oculta avisos que no puede responder | ✅ (Premium) | ✅ |
| Estadísticas | ✅ | ✅ con gráfico, historial y exportación |
| Mac, iPhone y iPad | ✅ | ✅ |
| Global Privacy Control | — | ✅ |
| Limpieza de enlaces de rastreo | — | ✅ |
| Inspector y borrado de cookies | — | ✅ |
| Ocultar cualquier elemento molesto | — | ✅ |
| Respaldo e importación | — | ✅ |
| Suscripción | Sí, para Premium | No: gratis y sin cuentas |

---

## 7. Para quien quiera mirar el código

Es una extensión web estándar (Manifest V3), sin dependencias.

```
piloto-cookies/
├── crear-proyecto-xcode.sh   crea el proyecto de Xcode (Mac + iOS)
├── extension/
│   ├── manifest.json
│   ├── background.js         estadísticas, historial, distintivo, GPC (cabecera Sec-GPC) y cookies
│   ├── shared/common.js      preferencias, categorías y clasificación de cookies
│   ├── shared/ui.css         estilo común claro/oscuro
│   ├── content/rules.js      base de ≈40 plataformas y palabras clave en 8 idiomas
│   ├── content/engine.js     motor: detección, respuesta, ocultamiento, limpieza y selector de elementos
│   ├── content/page.js       contexto de la página: GPC y API oficiales (Cookiebot, OneTrust, Didomi, Usercentrics…)
│   ├── popup/                ventana rápida
│   ├── options/              panel completo
│   └── icons/
├── tools/make_icons.py       genera los íconos
└── test/                     páginas de prueba y prueba automática con Playwright
```

**Cómo responde un aviso:**
1. Al empezar a cargar la página, oculta los avisos conocidos para que no parpadeen.
2. Si la plataforma tiene una API oficial, la usa (por ejemplo `Cookiebot.submitCustomConsent`, `OneTrust.RejectAll` o `UC_UI.denyAllConsents`).
3. Si no, pulsa los botones correctos y, en modo Personalizado, ajusta los interruptores de cada categoría.
4. Si el aviso es desconocido, busca por texto un aviso flotante y su botón.
5. Si no lo logra, lo oculta y desbloquea el desplazamiento.

**Probar en el computador:** `cd test && python3 -m http.server 8766` en una terminal y `node run.mjs` en otra. La prueba incluye OneTrust (rechazar, aceptar, personalizado), Cookiebot por API, Usercentrics en shadow DOM, un aviso genérico en español, un muro sin botón de rechazo, la limpieza de parámetros y cookies y la pausa por sitio.

**Agregar una plataforma:** suma un objeto a `PC_RULES` en `content/rules.js` con su selector `detect` y los pasos `reject` y `accept`.
