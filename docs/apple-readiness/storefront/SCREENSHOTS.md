# Capturas App Store — inventario y procedimiento

**BLOCKED: no hay capturas nativas de esta RC.** Las imágenes ejecutadas en Edge
con puente/media sintéticos sirven para QA; no se entregan como capturas de iPhone
o prueba de funcionamiento PhotoKit. No se fabricó una composición publicitaria.
Icono aprobado:1024×1024 RGB sin alfa, SHA256
`84ed91a8d86ed35fb3a442578bd28d3949990a8d01159914c52bc19e94a0a46f`.
No fue editado. Compilación de asset catalog/launch screen sigue pendiente en Xcode.

## Inventario ES y EN

| Orden | Pantalla real y estado que capturar | Copy breve opcional |
| --- | --- | --- |
| 01 | Pila con foto sintética y controles Conservar/Favorita/Eliminar | Lo que importa, se queda / What matters stays |
| 02 | Tarjeta de vídeo real de QA, reproducción inline | Dale otra vuelta a tu carrete / A fresh look at your camera roll |
| 03 | Filtros existentes, sin experimental ni developer | Tú decides cómo empezar / Choose where to start |
| 04 | Una última mirada con descartes sintéticos y acciones alcanzables | Una última mirada / One last look |
| 05 | Favoritas o álbum, solo contenido generado de prueba | Guarda tus favoritas / Keep your favorites |
| 06 | Onboarding privacidad, únicamente como aparece en la app | El análisis, en tu iPhone / Analysis on your iPhone |

Copy es inventario de posibles títulos, no promesa de una función extra. Mantener
lettering/personajes/arte aprobados y mostrar producto real. No representar compras
sin catálogo funcional, métricas inventadas o eliminación sin confirmación. No
editar una captura para que aparente soporte Duo que no se haya ejecutado.

## Tamaños consultados 7 noviembre 2026

La [especificación oficial de capturas](https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications/)
admite1–10 imágenes JPEG/PNG sin alfa. Para iPhone, preparar6.9 pulgadas; si no se
aporta esa clase, se requiere6.5. Consultar la tabla de ASC al subir:

- 6.9:1260×2736,1290×2796 o1320×2868 en retrato, según dispositivo aceptado.
- 6.5:1284×2778 o1242×2688 en retrato.
- Duo exterior:1398×2034 o su orientación inversa; interior:2007×2853 o inversa
  según la tabla ASC consultada. La ficha de hardware usa otra resolución para
  interior; no reescalar/inventar una captura por esa diferencia: comprobar qué
  genera Device Hub y qué requiere el slot real antes de entregar.

Estas dimensiones son requisitos del portal, **no modelos probados**. No hay
target iPad nativo; decidir disponibilidad de modo iPhone/iPad/Mac/visionOS en ASC
y obtener capturas adicionales solo si esos destinos se ofrecen y verifican.

## Captura reproducible en Mac

1. Ejecutar build Release candidato en simulador/dispositivo de la clase elegida;
   registrar SHA/build, Xcode, modelo, OS y estado de permiso. Sin fotos personales.
2. Sembrar fixtures propios mediante el [gate nativo](../NATIVE_GATE.md); para vídeo
   usar el generador del smoke nativo. No conceder permisos falsificando marcadores.
3. Abrir Ajustes de CocoWash y seleccionar español o inglés. Recorrer cada estado
   con botones reales. No usar catálogo mock en capturas destinadas a la tienda.
4. Capturar con `xcrun simctl io "$SIM_UDID" screenshot "$OUTPUT/es-01.png"`;
   repetir para EN y pantallas. En hardware usar la captura del sistema.
5. Revisar con `sips -g pixelWidth -g pixelHeight -g hasAlpha "$OUTPUT/es-01.png"`.
   Comprobar lectura, safe areas, escalado, ausencia de overlays de pruebas o IDs.
6. Verificar que las imágenes coincidan con el binario que se subirá. Conservar
   originales y hashes; cualquier título externo debe dejar clara la app real.
7. Entregar para revisión del propietario antes de subir a App Store Connect.

Sin fecha/hora de screenshot inventada en el runtime protegido. No modificar assets
de device chrome o hashes para producir una captura promocional.
