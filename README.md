# Aurum Link

Colección de 4 tragamonedas para iPhone / iPad (Safari), con **créditos ficticios**. Sin dinero real ni compras.

| Juego | Dinámica |
|---|---|
| **Xtension Link** | 5×3 (20 líneas). Las estrellas abren hasta 5 filas extra (100 líneas). 6+ bolas = **Golden Spins**: bolas fijas, 3 giros que se reinician, filas que se desbloquean con rayos a las 8 · 12 · 17 · 23 · 30 bolas, bola +2 GIROS, jackpots MINI/MINOR/MAJOR y GRAND con tablero lleno. |
| **Avalancha Glacial** | 6×5 sin líneas: 8+ iguales en cualquier lugar. Cascadas con multiplicador x1→x5; 4 copos = 10 giros gratis con multiplicador progresivo. |
| **Rueda de Fuego** | Clásica 3×3, 5 líneas. Wild de fuego expansivo x2; 3 soles = rueda de multiplicadores y jackpots. |
| **Legión Dorada** | 5×4, 1024 formas. Fénix = giros gratis con coronas pegajosas x2/x3 que se multiplican. |

## Instalar en iPhone / iPad
1. Abre la URL de GitHub Pages en **Safari**.
2. Botón **Compartir** → **Agregar a pantalla de inicio**.
3. Se abre a pantalla completa y funciona sin conexión.

> Si no hay sonido, desactiva el interruptor de silencio del iPhone.

## Técnica
- Render en `<canvas>` con sprites pre-escalados (sin reescalado por cuadro), fondos cacheados, DPR limitado a 2 y 30 fps en reposo → fluido en iOS.
- Sonido y música 100 % sintetizados con Web Audio (sin archivos).
- `assets/symbols.webp` (475 KB) reemplaza los ~4 MB de imágenes embebidas del diseño anterior. Se regenera con `python3 tools/build_atlas.py` desde `assets/src/`.
- Service worker para uso offline. Se publica con GitHub Pages desde `main` (`.github/workflows/pages.yml`).
