# CLAUDE.md — Ferco Cerámica Portal de Formación

Este archivo da contexto automático a Claude Code en cualquier sesión nueva.
Léelo completo antes de tocar cualquier archivo.

---

## Qué es este proyecto

Portal web interno de **Ferco Cerámica** para seguimiento de programas de formación comercial en Guatemala (GT), Honduras (HN) y El Salvador (SV).

- **URL producción:** https://ferco-portal.netlify.app
- **Panel admin:** https://ferco-portal.netlify.app/admin
- **Repo:** giancaremma50-hue/ferco-portal
- **Plataforma:** Netlify (hosting + functions + blob storage)
- **Stack:** HTML + CSS + JavaScript vanilla (sin frameworks), Netlify Functions (Node.js)

---

## Estructura de archivos

```
ferco-portal/
├── public/
│   ├── index.html          # Portal público (dashboard por país)
│   ├── admin.html          # Panel de administración
│   ├── css/
│   │   ├── tokens.css      # Variables CSS globales (paleta, fuentes, sombras)
│   │   ├── dashboard.css   # Estilos del portal público
│   │   └── admin.css       # Estilos del panel admin
│   └── js/
│       ├── api.js          # Funciones fetch: loadCountryData(), saveCountryData()
│       ├── dashboard.js    # Lógica del portal (KPIs, tabla, histórico, sparklines)
│       └── admin.js        # Lógica del admin (grid editable, guardar, ranking)
├── netlify/
│   └── functions/
│       ├── _shared/        # Helpers compartidos entre functions
│       ├── data-get.js     # GET /api/data-get?pais=GT  → devuelve blob
│       ├── data-save.js    # POST /api/data-save         → guarda blob + snapshot
│       └── data-init.js    # POST /api/data-init?pais=HN → inicializa datos semilla
├── scripts/
│   └── seed.js             # Script one-shot de migración inicial (no usar)
├── netlify.toml
└── package.json
```

---

## Flujo de datos

```
Admin edita grid  →  saveData()  →  POST /api/data-save
                                         ↓
                               Netlify Blob Storage
                               Keys: ferco-GT, ferco-HN, ferco-SV
                                         ↓
Portal público  ←  loadCountryData()  ←  GET /api/data-get?pais=GT
```

---

## Esquema del blob (por país)

```json
{
  "pais": "GT",
  "config": {
    "solo4x4": false,
    "tieneCanal": true,
    "tieneRegion": true,
    "tieneZona": true,
    "tieneResumen": true,
    "bdoCols": {
      "qr":    ["QR Griferia", "QR Losa", "QR SPC", "QR Cerámica"],
      "video": ["Video Griferia", "Video de Losa", "Video de SPC", "Video Cerámica"]
    },
    "sesCols": ["Sesión 1", "Sesión 2", "Sesión 3"],
    "divisors": { "QR Griferia": 5, "QR Losa": 5, "QR SPC": 4, "QR Cerámica": 5 },
    "sucursales": [{ "nombre": "Mixco", "region": "Central", "zona": "Zona 1" }]
  },
  "bdo": [
    {
      "canal": "Distribuidores", "region": "Central", "zona": "Zona 1",
      "sucursal": "Mixco", "nombre": "Juan Pérez",
      "valores": { "QR Griferia": 80, "Video Griferia": 60 },
      "nota": ""
    }
  ],
  "x4x": [ /* misma estructura, valores = % de sesiones */ ],
  "historico": {
    "pais": "GT",
    "cortes": [
      {
        "fecha": "2026-05-22",
        "mesKey": "2026-05",
        "sucursales": {
          "Mixco": { "bdo_qr": 75, "bdo_video": 68, "4x4_s1": 80, "4x4_s2": 70, "4x4_s3": 85 }
        }
      }
    ]
  },
  "updatedAt": "2026-05-22T10:00:00.000Z"
}
```

**Importante:** `valores` almacena porcentajes (0–100). El admin muestra la puntuación
bruta (ej. 4/5) pero internamente convierte a % antes de guardar.

---

## Programas de formación

| Código | Nombre | Países |
|--------|--------|--------|
| `bdo`  | Bateador de Objeciones | GT, HN |
| `4x4`  | Despliegue 4×4 | GT, HN, SV |

- **SV** solo tiene programa 4×4 (`solo4x4 = true`)
- **HN** tiene ambos programas con 4 módulos QR + 4 módulos Video
- **GT** tiene ambos programas con jerarquía Canal → Región → Zona → Sucursal

---

## Configuración correcta por país (CRITICAL)

Si `config.bdoCols` llega vacío, el admin lo detecta y muestra un banner
amarillo con botón **"Restaurar columnas"** que llama a `repairConfig()`.

```javascript
// En admin.js — CORRECT_CONFIG
HN: {
  bdoCols: { qr: ['QR Griferia','QR Losa','QR SPC','QR Cerámica'],
             video: ['Video Griferia','Video de Losa','Video de SPC','Video Cerámica'] },
  sesCols: ['Sesión 1','Sesión 2','Sesión 3'],
  divisors: { 'QR Griferia':5,'QR Losa':5,'QR SPC':4,'QR Cerámica':5,
              'Sesión 1':7,'Sesión 2':7,'Sesión 3':7 }
}
SV: {
  bdoCols: { qr: [], video: [] },
  sesCols: ['Sesión 1','Sesión 2','Sesión 3'],
  divisors: { 'Sesión 1':7,'Sesión 2':7,'Sesión 3':7 }
}
```

---

## Fórmulas de cálculo

**Colores de valor:**
- `cg` (verde) ≥ 80%
- `cm` (ámbar) 61–79%
- `cb` (rojo) 1–60%
- `c0` (gris) = 0%

**Ranking BDO por sucursal:**
```
score_persona = (avg(cols_QR) + avg(cols_Video)) / 2
score_sucursal = avg(score_persona de cada colaborador)
```

**Ranking 4×4 por sucursal:**
```
score_persona = avg(cols_Sesión)
score_sucursal = avg(score_persona de cada colaborador)
```

---

## Diseño visual (tokens.css)

- **Primario:** `#f59e0b` (ámbar Ferco)
- **Fondo:** `#f3f4f6`
- **Tarjetas:** `#ffffff` con borde superior ámbar 3px
- **Fuente sans:** Inter (Google Fonts)
- **Fuente logo:** Cormorant Garamond (Google Fonts)
- **Variables clave:** `--primary`, `--focus-border`, `--shadow-sm`, `--shadow-md`

---

## Workflow de desarrollo

La rama activa es: `claude/dashboard-gt-hn-sv-adjustments-3vQX7`

```bash
# Siempre desarrollar en esa rama
git checkout claude/dashboard-gt-hn-sv-adjustments-3vQX7

# Push
git push -u origin claude/dashboard-gt-hn-sv-adjustments-3vQX7

# Para publicar: crear PR en GitHub y hacer merge
# Netlify despliega automáticamente al hacer merge a main (~1 min)
```

**Credenciales admin (solo para pruebas locales, no commitear):**
- URL: https://ferco-portal.netlify.app/admin
- Password guardado en sessionStorage como `ferco-admin-pass`

---

## Funciones clave en dashboard.js

| Función | Qué hace |
|---------|----------|
| `makeSpark(vals, colorCls)` | SVG sparkline con gradiente de área y curva bezier |
| `renderKPIs()` | Tarjetas de métricas superiores |
| `renderDetalle()` | Panel de sucursales + tabla de colaboradores |
| `renderResumen()` | Tabla resumen por región/zona/sucursal |
| `renderHistorico()` | Tarjetas + tabla del histórico (respeta `selMeses`) |
| `fdRows()` | Filas filtradas por canal/región/zona/sucursal/búsqueda |

## Funciones clave en admin.js

| Función | Qué hace |
|---------|----------|
| `buildAdminGrid()` | Construye la grilla editable de datos |
| `saveData()` | Guarda el blob completo vía POST /api/data-save |
| `repairConfig()` | Restaura bdoCols/sesCols/divisors sin borrar datos |
| `addRow()` | Modal para agregar colaborador (sucursal como select) |
| `openAddSucModal()` | Sub-modal para agregar nueva sucursal con jerarquía |
| `generarRanking()` | Lee GT/HN/SV, calcula scores y muestra informe para copiar |
