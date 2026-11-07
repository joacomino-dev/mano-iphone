# Recursos gráficos de Google Play · plan

| Recurso | Tamaño | Formato | Estado |
|---|---|---|---|
| Icono de la app | 512 × 512 | PNG 32 bits, sin transparencia en la forma final (Play aplica la máscara) | Se genera del icono aprobado de iOS (1024) |
| Gráfico destacado | 1024 × 500 | PNG o JPG, sin transparencia | Pendiente de diseño (abajo) |
| Capturas de teléfono | 2–8 por idioma; lado corto ≥ 1080 px recomendado; relación 9:16 | PNG o JPG | Plan abajo |

## Cómo hacer las capturas sin un teléfono Android y sin fotos personales

1. En el navegador, la vista previa de la app (`npm run dev` en `mano/`) con el dispositivo
   **Pixel 10** en el selector de arriba a la derecha: la app usa entonces los textos de
   Android (galería, papelera, «teléfono»). Siempre con las postales de ejemplo.
2. O en el emulador de la CI (`scripts/android-emulator.sh` guarda capturas en el artefacto
   de evidencias) con el **Modo de prueba** activado.
3. Nunca una captura con fotos reales de nadie. Sin anuncios en las capturas (Modo developer
   › Anuncios apagado).

## Las cinco capturas (mismo orden y textos que la App Store, `docs/appstore/screenshots.md`)

| # | Pantalla | Texto (es) |
|---|---|---|
| 1 | Pila con «Conservar» a medio deslizar | Desliza y decide al momento |
| 2 | Una última mirada | Nada se borra sin tu permiso |
| 3 | Resumen con Coqui y Memo | Mira cuánto espacio ganas |
| 4 | Filtros | Capturas, borrosas, parecidas |
| 5 | Postal con fecha y lugar | Recuerdos con fecha y lugar |

Los 7 idiomas están en `docs/appstore/screenshots.md` (todos ≤ 30 caracteres). Marco: papel
`#F3ECE1`, texto `#253A3A`, Fredoka. En el marco, un teléfono Android genérico (no un Pixel
con marca) para no confundir.

## Gráfico destacado (1024 × 500)

Propuesta: papel `#F3ECE1` con la textura de algodón, el logo «Coco / Wash» a la izquierda
y, a la derecha, Coqui lavando a Memo sobre tres postales en abanico con los sellos
Conservar / Eliminar / Favorita. Sin texto más allá del logo (Play lo recorta en algunos
sitios). Deja 15 % de margen seguro en los bordes. Requiere revisión del usuario (arte).
