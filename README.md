# Aurum Link

Colección de 4 tragamonedas para iPhone / iPad (Safari), con **créditos ficticios**. Sin dinero real ni compras.

| Juego | Dinámica |
|---|---|
| **Xtension Link** | 5×3 (20 líneas). Las estrellas abren hasta 5 filas extra (100 líneas). 6+ bolas = **Golden Spins**: bolas fijas, 3 giros que se reinician, filas que se desbloquean con rayos a las 8 · 12 · 17 · 23 · 30 bolas, bolas +1 a +5 GIROS, Multiplicador y Upgrade (las especiales desaparecen tras actuar y liberan su casilla), jackpots MINI/MINOR/MAJOR y GRAND con tablero lleno. |
| **Avalancha Glacial** | 6×5 sin líneas: 8+ iguales en cualquier lugar. Cascadas con multiplicador x1→x5; 4 copos = 10 giros gratis con multiplicador progresivo. |
| **Rueda de Fuego** | Clásica 3×3, 5 líneas. Wild de fuego expansivo x2; 3 soles = rueda de multiplicadores y jackpots. |
| **Legión Dorada** | 5×4, 1024 formas. Fénix = giros gratis con coronas pegajosas x2/x3 que se multiplican. |

**Todos los juegos** tienen los 4 jackpots progresivos (MINI · MINOR · MAJOR · GRAND) que crecen con cada giro:
Xtension Link (bolas en Golden Spins y tablero lleno), Avalancha (bolas de hielo), Rueda de Fuego (segmentos de la rueda) y Legión Dorada (minijuego *Tesoro del César*: 3+ monedas JP, elige hasta juntar 3 iguales).

**Ajustes (⚙)**: velocidad de giro (½× a 3×, también con el botón ⚡), volumen de efectos y de música, música on/off y rodillos en modo claro u oscuro (también con ☀︎/☾).

## Instalar en iPhone / iPad
1. Abre la URL de GitHub Pages en **Safari**.
2. Botón **Compartir** → **Agregar a pantalla de inicio**.
3. Se abre a pantalla completa y funciona sin conexión.

> Si no hay sonido, desactiva el interruptor de silencio del iPhone.

## Técnica
- Render en `<canvas>` con sprites pre-escalados (sin reescalado por cuadro), fondos cacheados, DPR limitado a 2 y 30 fps en reposo → fluido en iOS.
- Sonido y música 100 % sintetizados con Web Audio (sin archivos).
- `assets/symbols.webp` (475 KB) reemplaza los ~4 MB de imágenes embebidas del diseño anterior. Se regenera con `python3 tools/build_atlas.py` desde `assets/src/`.
- Tras cada cambio: `python3 tools/bump_version.py N` para que Safari/iOS descargue todos los archivos nuevos (la versión aparece en el lobby y en Ajustes).
- Service worker para uso offline. Se publica con GitHub Pages desde `main` (`.github/workflows/pages.yml`).
