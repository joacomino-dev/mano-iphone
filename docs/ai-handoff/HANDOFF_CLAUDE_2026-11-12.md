# Relevo a Claude — 2026-11-12

## Base y límites
Trabajar en C:/Users/Joaco/Developer/CocoWash-android, main. OneDrive es copia antigua con cambios: NO usarla ni alterarla. HEAD remoto/local c81288b. Usuario autoriza continuar prompt PROMPT_CODEX_GEMINI_2026-11-10.md, push normal y CI pública gratuita. No tiendas, secretos, versiones ni hashes protegidos. No hay permiso para borrar fotos personales.

## Implementado y enviado
- 24966e9: A3 espera real de diálogo Android y confirma cierre, seis regresiones PASS.
- ce49c4b: A1 integra manualmente WIP ccf393e con correcciones: timeout IDB, abort de transacciones, cierre de conexiones tardías, adopción mirror conservando intent; sample CPU del proceso caliente. Rama claude/wip-r67-startup conservada hasta validación nativa.
- 437167a: A4 lazy Ajustes/Onboarding/Inspector y precarga idle estable. Inicial web1008,28→aprox946kB(-6,18%); aviso residual719kB explicado. ReviewGrid no separado por seguridad de miniaturas/acciones.
- db33b1a y c81288b: A0 regresión VHS iOS/Android normal/reduced y nueva sonda XCTest. NO arreglo de app: no reproduce en navegador. Usuario acaba de confirmar que falla en pantalla principal con cartas, NO vista anclada.

## Validaciones locales
145 Node; runtime28; builds web/native-web; diálogo Android6; startup3; durable-session8; VHS4; mute1; infra25; runtime navegador8; seguridad9; readiness19; accesibilidad6. Anchored5/RC10/Live5, primer onboarding y bundle de PRODUCCIÓN por HTTP4190 PASS, chunks200, cero /src/HTTP/JS errores. Evidencia work/block-a-*, work/a4-production y docs/apple-readiness/evidence/strategic/20261111-block-a-local.json.

## CI actual comprobada al relevo
- iOS tienda43126422467 y desarrollo43126422384: PASS en db33b1a.
- Android43126422530/db33b1a PASS;43128137830/09da1be PASS; tercero43130032595 FAIL. Todavía NO tres verdes ni APK final entregado. Ver informe del agente android_gate al cierre para causa del tercero; no repetir ciegamente.
- Full iOS43126451617 FAIL: cancelación Photos534 no ofrece botón real, deja pending y produce cascada W/X; VHS627 no alcanza Letras VHS; Live804 acceso a Aplicar filtros; Z887 no reconoce cola. NO diez rondas completas ni aceptación CPU/RSS. Métricas work/full-db33b1a/simulator-smoke/native-cycles.json: NOT TESTED.
- Live dedicado43126455524 FAIL ANTES de playback: nativeMediaFilter toca supuesto Live Photos en(211.7,630.5), hoja cierra y luego Aplicar no existe. Se sospecha solapamiento con botón sticky; no tocar app por esto.
- Exportaciones43129186998(Live) y43130042109(Full) PASS. Live attachments descargados a work/live-db33b1a-attachments. Full export está listo para descargar.

## Trabajo local SIN COMMIT — preservar/revisar
Único archivo sucio: mano/ios/App/ManoUITests/PhotosSmokeTests.swift, aproximadamente+86/-10. Agente bundle corrige nativeMediaFilter para llevar toggle exacto al área libre entre pestañas y Aplicar, comprobar value1 y hoja abierta ANTES de aplicar; VHS Settings desplaza en ambos sentidos y comprueba osd off. No oráculos Live debilitados. Diffcheck local; Swift solo macOS. Revisar entrega final del agente bundle y compilar antes de dar PASS. Este parche NO está en GitHub ni probado nativamente.

## Evidencia y próximos pasos
1. Revisar parche XCTest local y causa real del Android tercero; descargar logs/artefactos, sin reset/stash/restore.
2. Analizar export Full para cancelación y cola, evitando cascadas; no borrar pending para fingir éxito.
3. Cuatro checks y commit/push selectivo; repetir gates full/live tras corrección concreta. Mantener auto/Duo; no ocultar fallo cambiando a standard.
4. CPU previo afbd2f9: App~70%, WebContent~0–1,5%. No prueba de Framer. Buscar sample App en siguiente gate completo; posibles anuncios/AVFoundation, sin causalidad aún. pause de GADVideoController no hace nada sin customControls: no aplicar arreglo ciego.
5. Conseguir tres Android verdes seguidos; descargar APK developer+VALIDATION, SHA256 y copiar Downloads. Secretos COCO_DEV_* ausentes: firma temporal. No leer ni crear claves; propietario configura existentes.
6. R68 necesita reproducción nativa y evidencia antes/después antes de declararlo resuelto. B4 de Gemini espera A0.

## Coordinación/herramientas
OpenClaw en perfil local CocoWashMotion: allowedAgents incluye codex/gemini y ruta Codex actualizada; gateway sigue timeout/host broker. ACP Codex respondió pero herramientas Core fallan. NO se declara ejecución de Gemini CLI: no instalada. Gemini Windows sí respondió tras Reload, diagnóstico recibido, hipótesis no aplicadas. Ver work/gemini-review-20261111.md.
GitHub CLI no está en PATH. Helper ignorado work/github-api.py usa credencial git internamente SIN imprimirla; quita Authorization en redirecciones externas. Ejemplo: python work/github-api.py GET actions/runs/ID/jobs. Para descargar: GET actions/artifacts/ID/zip '{}' work/archivo.zip. No imprimir credenciales ni URLs firmadas.
Servidores locales pueden seguir en4186(Vite),4189,4190(producción), gateway18789. Ningún despliegue ni publicación.
