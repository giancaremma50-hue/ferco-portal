# context.md — Contexto de negocio: Ferco Cerámica Portal de Formación

Documento de contexto para sesiones nuevas de Claude. Complementa CLAUDE.md con
información de negocio, decisiones de diseño y tareas históricas.

---

## La empresa y el programa

**Ferco Cerámica** es una empresa distribuidora de cerámica, grifería y materiales
de construcción con presencia en Centroamérica.

El portal hace seguimiento de dos programas internos de capacitación a la fuerza
de ventas (colaboradores en sucursales):

- **Bateador de Objeciones (BDO):** Mide si los colaboradores escanearon QRs y
  vieron videos de capacitación de productos (Grifería, Losa, SPC, Cerámica).
- **Despliegue 4×4 (D4x4):** Mide la asistencia/participación en sesiones de
  formación presenciales (Sesión 1, 2, 3).

---

## Países y sus particularidades

| País | BDO | 4×4 | Canal | Región | Zona | Resumen |
|------|-----|-----|-------|--------|------|---------|
| GT (Guatemala) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| HN (Honduras)  | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| SV (El Salvador) | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |

- **GT** tiene la jerarquía completa: Canal → Región → Zona → Sucursal
- **HN** y **SV** solo tienen Sucursal (sin agrupaciones)
- **SV** no tiene programa BDO (`solo4x4 = true`)

---

## Historia del proyecto (sesiones anteriores)

### Lo que ya está hecho y funciona

1. **Portal multi-país** — selector de países compacto en el header, tabs
   Detalle / Resumen / Histórico por país
2. **Panel admin** — grilla editable con divisores configurables por columna,
   drag intuitivo, doble clic para renombrar
3. **Inicialización de datos HN y SV** — función `data-init.js` con datos semilla
   reales para 33 colaboradores por país
4. **Banner de reparación** — detecta cuando `config.bdoCols` está vacío y ofrece
   restaurar columnas con un clic (necesario si se inicializó HN/SV con blob vacío)
5. **Selector de país compacto** — se minimiza al header al seleccionar país,
   muestra solo la bandera (fix del bug "GT GT" doble etiqueta)
6. **Agregar colaborador mejorado** — campo Sucursal es siempre un `<select>`,
   con botón "＋ Agregar nueva sucursal" que abre sub-modal con jerarquía
7. **Botón Generar Ranking** — en el admin, lee datos en vivo de los 3 países,
   calcula scores BDO y 4×4 por sucursal, muestra informe para copiar/pegar
8. **Rediseño visual ámbar** — paleta de marca Ferco (#f59e0b), fuente Inter,
   logo tipográfico FERCO/Cerámica, sombras y border-top en tarjetas
9. **Gráficas con gradiente de área** — sparklines con curva bezier suave y
   gradiente degradado bajo la línea (estilo Recharts/shadcn)
10. **Tarjetas históricas dinámicas** — el filtro de meses actualiza sparklines,
    valores y métricas de "Mejor Sucursal / Mayor Avance"

---

## Decisiones de diseño importantes

### Por qué vanilla JS (sin React/Vue)
El portal vive en Netlify como archivos estáticos. No hay build step, lo que
facilita el mantenimiento por alguien no técnico. Netlify Functions manejan
el backend.

### Por qué los valores se guardan como porcentajes
El admin muestra puntuación bruta (ej. "4 de 5") pero almacena el % calculado
(80%). Esto permite que el dashboard compare valores entre países y programas
con distintos divisores sin necesidad de re-calcular.

### Por qué hay un `divisor` por columna
Cada módulo tiene diferente puntaje máximo. "QR SPC" = 4 pts, los demás = 5 pts.
El divisor convierte la puntuación bruta a porcentaje: `pct = (valor / divisor) * 100`.

### Cómo funciona el histórico
Cada vez que el admin presiona "Guardar y publicar", `data-save.js` además de
guardar el blob principal crea un **snapshot** con los promedios por sucursal.
Ese snapshot se agrega al array `historico.cortes` con fecha y `mesKey`.

---

## Formato del informe de Ranking (buildRankingText)

```
📊 BATEADOR DE OBJECIONES
🏆 TOP 3 POR PAÍS
Guatemala
1°🥇 Sucursal X 91.2%
2°🥈 Sucursal Y 87.4%
3°🥉 Sucursal Z 81.0%
Honduras
1°🥇 Sucursal A 78.5%
...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ SUCURSALES CRÍTICAS (bajo 80%)
Guatemala
    🔴 Críticas: Sucursal Z 45.0%
    🟡 En riesgo: Sucursal W 72.0%
Honduras
    ✅ Todas sobre el 80%

📊 DESPLIEGUE 4x4
🏆 TOP 3 POR PAÍS
Guatemala / El Salvador / Honduras
...
```

- BDO: solo GT y HN (SV no tiene BDO)
- 4×4: GT, SV y HN
- Thresholds: ✅ ≥80% | 🟡 50–79% | 🔴 <50%

---

## Tareas pendientes / Ideas futuras

- [ ] Subir archivos de logo reales (PNG) al repo en `public/img/`
      (actualmente el logo es tipográfico CSS con Cormorant Garamond)
- [ ] Datos reales de colaboradores HN y SV (actualmente placeholders)
- [ ] Agregar filtro de año al histórico (actualmente solo filtra por mes del año actual)
- [ ] Modo oscuro (variables CSS ya preparadas en tokens.css con `.dark`)

---

## Cómo iniciar una nueva sesión de trabajo

1. Leer este archivo y CLAUDE.md
2. Revisar el PR abierto más reciente en GitHub para ver qué está pendiente de merge
3. Verificar en qué rama estamos: `git branch`
4. La rama de desarrollo es: `claude/dashboard-gt-hn-sv-adjustments-3vQX7`
5. Si hay cambios sin merge, crearlos como PR nuevo

---

## Credenciales y configuración (NO commitear valores reales)

- Admin password: guardado en Netlify env var `ADMIN_PASSWORD`
- Netlify site ID y token: en variables de entorno de Netlify, NO en código
- El `data-init.js` tiene datos semilla de HN y SV hardcodeados (aceptable,
  son datos de entrenamiento no sensibles)
