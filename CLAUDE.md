# Aurum Link: contexto del proyecto para Claude

Este archivo resume todo lo trabajado en las sesiones anteriores en la nube, para continuar en otra sesión, por ejemplo en Claude Code de la app de escritorio sobre el Mac. Claude Code lo lee automáticamente al abrir esta carpeta.

## Quién es el usuario

- DocLam (doclam2015-create en GitHub) es médico pediatra y médico jefe operativo de un servicio de urgencias.
- **Siempre responder en español**, con lenguaje claro y no técnico.
- Juega la app en **iPhone y iPad**, instalada desde Safari como PWA.
- Suele pedir los cambios y cerrar con "fusiona". Eso significa hacer el PR y fusionarlo a `main` sin preguntar.

## Qué es la app

- Aurum Link es una colección de **15 tragamonedas** con **créditos ficticios**, sin dinero real ni compras.
- Es una PWA estática: HTML, CSS y JavaScript con módulos ES, sin bundler ni dependencias npm.
- GitHub Pages la publica desde `main` mediante `.github/workflows/pages.yml`.
- Tiene un service worker (`sw.js`) para uso offline.
- La versión actual es la **81**, visible al final de Ajustes.
- El `README.md` describe en detalle cada juego y sus mecánicas. Es la referencia funcional y **hay que mantenerlo al día**.

### Estructura

| Ruta | Contenido |
|---|---|
| `index.html`, `css/`, `manifest.webmanifest`, `icon-*.png` | Shell de la PWA |
| `js/app.js` | Contiene el lobby, el HUD, el saldo, la apuesta, los jackpots progresivos (`state.jp`), los overlays (BIG/AWESOME/SUPER WIN), el giro automático, los ajustes, `app.awardJackpot(key)` y `app.bonusPay(n, bet, name, min)`. También define la lista `GAMES`. |
| `js/reels.js` | Motor de rodillos `ReelSet`: `start()`, `stopTo(final,{anticFrom,minTime,onStop})`, `slam()` y `draw(x,fx)`. Cada `columns[c].state` pasa por windup, spin, feeding, bounce e idle. Exporta `sleep`. |
| `js/gfx.js` | Canvas: atlas de sprites, partículas, `goldText`, `glow`, easing y `FONT` |
| `js/audio.js` | `sfx`, con efectos sintetizados en Web Audio, muestras decodificadas (`preload`/`play`), estilos de música por juego, locutor, `loadSfxPack`, `realMachine`, `bigWin`, `jackpot`, `winJingle` y `bonusFanfare` |
| `js/games/*.js` | Un archivo por juego. Ver la lista más abajo. |
| `assets/` | `symbols.webp`, `themes.webp`, `wolf.webp`, `colossal.webp` (símbolos de los juegos colosales), `giant_hero/sky/heroine/sym/scene.webp` y `sparta_sym/tall/wtall/scene.webp` (escenarios, personajes y símbolos de Espartaco), `voice/` (locutor Piper), `sfx/` (sonidos grabados) y `src/` (fuentes) |
| `tools/` | Scripts Python: `upscale_esrgan.py` y `enhance_colossal.py` (nitidez con Real-ESRGAN), `bump_version.py`, `build_atlas.py`, `build_themes.py`, `build_wolf.py`, `build_colossal.py`, `make_howl.py`, `make_voice.py` y `make_machine_sfx.py` |

### Juegos (orden de `GAMES` en `js/app.js`)

1. `xlink.js`: Xtension Link
2. `xthemes.js`: Sueño Rojo y Reino de Nieve (`RedDream`, `SnowKingdom`)
3. `wolf.js`: Carrera del Lobo
4. `avalanche.js`: Avalancha Glacial
5. `firewheel.js`: Rueda de Fuego
6. `legion.js`: Legión Dorada
7. `bull.js`: Toro Dorado
8. `dragon.js`: Caminos del Dragón
9. `codex.js`: Códice del Sol
10. `reef.js`: Arrecife de Gemas
11. `western.js`: Duelo del Oeste
12. `galaxy.js`: Galaxia Infinita
13. `colossal.js`: Oro del Gigante y Espartaco Coloso (`GiantGold`, `Spartacus`), agregados en la v60 y rehechos en la v61–v68 para parecerse a *Giant's Gold* y *Spartacus Super Colossal Reels* de WMS. El arte de Espartaco (v68) sale de capturas de la máquina que subió el usuario (uso personal).

### Interfaz de un juego (clase)

- Propiedades estáticas: `static id`, `static name`, `static music` y `static lobby = {c1, c2, mechanic, desc, …}`. Algunas clases tienen además `static iconStyle`.
- `constructor(app)`
- `resize(W,H,DPR)`, `update(dt)` y `draw(ctx)`
- `async play(bet)`: devuelve `{win}`.
- `slam()`, `info(bet, fmt)` y `rules()`
- Estado: `freeRound`, `locked`, `keepWin`, `extra`, `animating` y `hint`
- `destroy()` es opcional.

### Reglas de diseño comunes (el usuario ya las pidió)

- Los 15 juegos tienen 4 jackpots progresivos: MINI, MINOR, MAJOR y GRAND.
- **Pago base al activar un bono**: con el mínimo de símbolos se paga 2× la apuesta; con uno más, 10×; con dos más, 50×; con tres o más, 100×.
- **Bono sorpresa**: en giros pagados pueden caer rayos que activan el bono. El bono aparece en total cerca de 1 vez cada 60–90 giros.
- Los montos en pantalla (bolas y monedas) se reescalan al cambiar la apuesta con `rescaleValues`.
- El RTP se calibra a **~93–95 %** con una simulación en Node que importa las funciones puras del juego (de 100 a 300 mil giros).
- Estilo visual: casino de calidad, con marcos dorados, animaciones fluidas y efectos sonoros abundantes.

### Sonidos (`assets/sfx/`)

- `bonus_in1/2`, `levelup2/3`, `coin_loop`, `jackpot2/3` y `youwin1/2/3` vienen de efectos de floraphonic que subió el usuario.
- `real_1..real_15.mp3` son grabaciones de máquinas reales del usuario (Gp3–Gp13, Gran premio, Nueva grabación y Sonidos). Se recortaron con `tools/make_machine_sfx.py` a los 7 s de más energía, con loudnorm −14.
- Dónde suenan:
  - Entrada a bono: `bonus_in`.
  - "+N giros": `levelup`.
  - BIG/AWESOME/SUPER: `youwin` + `coin_loop` + `realMachine`.
  - Jackpots: `jackpot2/3`.
  - Espartaco: `sparta_antic` (suspenso) y `sparta_fs` (entrada a giros gratis), recortados de videos de la máquina que subió el usuario.

## Flujo de trabajo estándar (seguirlo en cada pedido)

1. Implementar el cambio.
2. Probar en el navegador:
   - Levantar el servidor con `python3 -m http.server 8765`.
   - Correr Playwright en retrato (430×900) y apaisado (1024×768).
   - Revisar que no haya errores de consola.
   - Si hace falta forzar estados, interceptar `app.js` para exponer `window.__app` y los demás objetos de prueba. Los juegos tienen ganchos de prueba como `app._forceScat`, `_forceFull` y `_forceMega`.
   - Mantener las pruebas cortas.
3. **Subir la versión**: `python3 tools/bump_version.py N`, con N igual a la versión anterior + 1.
   - El script cambia `?v=` en todos los imports, `index.html` y `sw.js`, y el nombre de caché `aurum-vN`.
   - Obliga a iOS a descargar lo nuevo.
4. Si se agregan archivos (JS, mp3, imágenes), sumarlos a la lista `FILES` de `sw.js`.
5. Actualizar `README.md`.
6. Hacer commit en una rama, subirla, crear el PR y fusionarlo a `main`.
   - En la nube la rama era `claude/adoring-hamilton-disfbd`, recreada desde `origin/main` en cada pedido.
7. Responder en español:
   - la versión nueva;
   - qué cambió;
   - y que cierre y vuelva a abrir la app para confirmar "Versión N" en Ajustes.

No poner identificadores de modelo en commits ni PRs.

## Historial breve

- Del PR 1 al 30 (versiones hasta la 59), en orden:
  - Xtension Link con Golden Spins y cortinas.
  - Temas Sueño Rojo y Reino de Nieve.
  - Carrera del Lobo con arte realista.
  - Resto de los juegos.
  - Jackpots progresivos en todos.
  - Pago base de bono.
  - Bono sorpresa.
  - Locutor grabado con Piper, en voz de hombre y exclamativo.
  - Música por juego.
  - Modo claro, velocidad y volúmenes.
- La v60 ([PR 31](https://github.com/doclam2015-create/aurum-link/pull/31)) agregó:
  - Oro del Gigante y Espartaco Coloso, con rodillos colosales 5×4 + 5×12 y 100 líneas.
  - Los sonidos grabados del usuario.

- De la v61 a la v67 ([PR 33](https://github.com/doclam2015-create/aurum-link/pull/33) a PR 39) se rehicieron los dos juegos colosales:
  - Reglas como los originales. Oro del Gigante: huevos apilados que dan de 5 a 100 giros gratis según los huevos a la vista, colosal x2 en giros gratis. Espartaco: Super Espartaco, MEGA WILD, transferencia con re-giro (hasta 9), rodillo 5 del colosal doble con WILD x2…x100, y 8/12/20 giros gratis (coliseos de a uno por rodillo; en giros gratis un WILD del principal se expande a todo el rodillo y pasa al colosal).
  - Jackpots por rodillos transferidos (2/3/4/5), bono sorpresa y RTP ~94 % (simulado).
  - Arte: los símbolos se generaron con IA en Canva (`assets/src/colossal/`). Los personajes y escenarios salen de las portadas y capturas que subió el usuario (`ref_*`), usando solo zonas sin logo ni marca de agua.
  - Los tableros van **siempre lado a lado** (principal a la izquierda, colosal a la derecha), también en vertical. El usuario lo pidió así.
  - Los personajes apilados (gigante, heroína, guerrera, Espartaco) se muestran como una figura alta, como en la máquina.
- La v68 ([PR 40](https://github.com/doclam2015-create/aurum-link/pull/40)) rehízo el arte de Espartaco con las capturas de la máquina: escenario de piedra con brasero, marcos rojos, celdas crema, letras A/K/Q/J, gladiador con mayal como símbolo nuevo y símbolos repetidos por celda en el colosal. RTP ~94,5 %.
- La v69 ([PR 41](https://github.com/doclam2015-create/aurum-link/pull/41)) hizo lo mismo con Oro del Gigante (símbolos y escenario de capturas de la máquina, sin el «10») y agregó el Coliseo BONUS de Espartaco al estilo de la máquina. RTP ~94 % en ambos.
- La v70 ([PR 42](https://github.com/doclam2015-create/aurum-link/pull/42)) sumó la dinámica de los videos de Espartaco: marco eléctrico, medallón de giros gratis, fondo nocturno en giros gratis, todas las líneas juntas al ganar, sonidos grabados, y borró la marca de agua «BETO» (inpainting con OpenCV en `build_colossal.py`).
- La v71 ([PR 43](https://github.com/doclam2015-create/aurum-link/pull/43)) corrigió la cara de Espartaco (la marca de agua se tapa con la otra copia limpia de la figura, sin inpainting) y muestra a Espartaco y la guerrera completos, de pies a cabeza, al caer apilados y en el MEGA WILD.
- La v72 ([PR 44](https://github.com/doclam2015-create/aurum-link/pull/44)): en Espartaco los coliseos caen de a uno por rodillo, 3/4/5 = 8/12/20 giros gratis, WILD expandible en giros gratis (`freeExpand`, `freeWild` 0,1, escala 0,86, RTP ~93,5 %) y placa WILD «SPARTACUS Gladiator of Rome» limpia (`sparta_wild.png`).
- La v73: los rodillos WILD transferidos viajan del principal al colosal con una animación de desplazamiento (`fly`/`drawFlights`, en ambos juegos). Escenario de Espartaco sin la barra roja: logo entre Espartaco y la guerrera y Coliseo abajo al centro; en Oro del Gigante, el gigante y la heroína a los lados del título con el huevo al centro (`portrait`).
- La v74: el traslado de rodillos WILD es un arrastre (agarre, estela estirada por la velocidad, encaje con temblor; `FLY_GRAB`/`FLY_LAND`) con sonido propio `sfx.reelDrag` (piedra/metal en Espartaco, hojas/madera en el Gigante).
- La v75: música de Espartaco (`arena`/`arenaBonus` en `audio.js`) al estilo del Imperio romano: trompetas (`brassM`), coro (`choirM`), lira, tambores de guerra (`warM`), caja militar y gong.
- La v76: corregidas las líneas del colosal (antes no pasaban por las filas 4, 8 y 12, por eso algunas combinaciones no pagaban); personajes siempre apilados de cuerpo completo (`heroCol` en el principal, pilas `HERO_H`=6 en el colosal, `giant_girltall.webp`) y con premios altos; rodillo 5 de Espartaco con símbolo en cada fila y un solo coliseo; huevos que llenan rodillos (`eggFull`, `eggFullBig`). Escalas 0,94 (Gigante) y 0,66 (Espartaco), RTP ~94–95 %.
- La v77: como en la máquina, los personajes que caen en el colosal ocupan el rodillo entero de 12 filas (`heroColBig`), de pie abajo con el Coliseo o el cielo encima. Escalas 1,06 (Gigante) y 0,74 (Espartaco).
- La v78: según capturas del juego real, los personajes son franjas (`heroStrip`/`withStrip`; cada casilla guarda `st`/`hs`) del largo del rodillo que llenan el ancho de la columna (`HERO_FX`/`HERO_FY` ubican la cara) y caen enteras o asomando en parte. Escalas 1,05 (Gigante) y 0,73 (Espartaco).
- La v79: Espartaco en el colosal usa su figura alta de la máquina (`sparta_ctall.webp`, franjas de 8 filas `heroLenBig`); las figuras bajan enteras al girar (`spinPick`/`heroSlice`); figuras y símbolos mejorados con Real-ESRGAN en numpy (`tools/upscale_esrgan.py`, `tools/enhance_colossal.py`; los recortes en píxeles se escalan con `BASEW`/`sf`); ánimo de la máquina (`mood`, `moodTick`, rachas frías/normales/calientes y bono garantizado tras 140–210 giros). Más huevos/coliseos en giros gratis (`FREE_RETRIG` 1,6). Escalas 0,83 (Gigante) y 0,59 (Espartaco), RTP ~94 %, bono ~1/65.
- La v80: símbolos de Oro del Gigante devueltos a los de antes del filtro (se mantienen nítidos el gigante y la heroína); huevos → giros = n + 2 + n/10, máximo 100 (`eggSpins`). Escala del Gigante 1,0.
- La v81: personajes sincronizados al azar (la mitad de los giros un solo personaje en el tablero); lluvia de personajes (`heroEvent`) en 3–5 rodillos, completos o parciales; huevos en cualquier rodillo (`scatReels`, peso del huevo 0,6) y lluvia de huevos en 3+ columnas (`eggEvent`, solo juego base); tope de 100 giros por bono en el Gigante; ganchos `_forceHeroRain`/`_forceEggRain`. Escalas 0,75 (Gigante) y 0,47 (Espartaco), RTP ~94 %.
- Se descartó el sonido `ElevenLabs_Generation_1.ogg` por decisión del usuario.

## Ideas / pendientes que pueden surgir

- Si el usuario entrega imágenes más grandes de algún personaje, reemplazar las actuales.
- Ajustar los volúmenes o la asignación de los sonidos reales según lo que escuche en el iPhone.
