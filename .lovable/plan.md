
# Plan: Actualizar Tiempo de Maduración y Precios del Espadín

## Resumen de Cambios Solicitados

**Maduración:**
- Cambiar de 5 años a 5.5 años
- Calcular desde abril de cada año de establecimiento

**Precios por año de establecimiento:**
| Año | Precio |
|-----|--------|
| 2026 | $250 |
| 2025 | $300 |
| 2024 | $350 |
| 2023 | $400 |
| 2022 | $450 |
| 2021 | $500 |

---

## Paso 1: Migración de Base de Datos

Crear una migración SQL que:

1. **Cambiar tipo de columna** `maturation_years` de `INTEGER` a `NUMERIC(3,1)` para soportar 5.5
2. **Actualizar el Espadín** a 5.5 años de maduración
3. **Actualizar precios existentes:**
   - 2025: $250 -> $300
   - 2024: $300 -> $350
   - 2023: $350 -> $400
   - 2022: $400 -> $450
   - 2021: $450 -> $500
4. **Insertar nuevo precio** para 2026: $250

---

## Paso 2: Actualizar Lógica del Simulador

**Archivo:** `src/components/simulator/InvestmentSimulator.tsx`

Cambios en el cálculo de fechas (líneas 150-156):
```text
// ANTES (cálculo simple por años)
const yearsGrown = currentYear - establishmentYear;
const yearsToHarvest = Math.max(0, maturation_years - yearsGrown);

// DESPUÉS (cálculo preciso desde abril)
const plantingDate = new Date(establishmentYear, 3, 1); // Abril
const now = new Date();
const monthsGrown = (now.getFullYear() - plantingDate.getFullYear()) * 12 
                  + (now.getMonth() - plantingDate.getMonth());
const yearsGrown = monthsGrown / 12;
const maturationMonths = maturation_years * 12; // 5.5 * 12 = 66 meses
const harvestDate = new Date(plantingDate.getTime() + maturationMonths * 30.44 * 24 * 60 * 60 * 1000);
```

Actualizar cálculo de fecha de cosecha (línea 179):
```text
// Calcular fecha exacta: abril + 5.5 años = octubre
const harvestDate = new Date(establishmentYear, 3 + Math.floor(maturation_years * 12), 1);
```

---

## Paso 3: Actualizar Dashboard

**Archivo:** `src/pages/Dashboard.tsx`

Cambios en el cálculo de progreso (líneas 202-207):
```text
// ANTES
const yearsGrown = currentYear - inv.plantation_year;
const progress = Math.min((yearsGrown / maturationYears) * 100, 100);

// DESPUÉS (cálculo mensual desde abril)
const plantingDate = new Date(inv.plantation_year, 3, 1); // Abril
const now = new Date();
const monthsGrown = Math.max(0, (now.getFullYear() - plantingDate.getFullYear()) * 12 
                           + (now.getMonth() - plantingDate.getMonth()));
const maturationMonths = maturationYears * 12;
const progress = Math.min((monthsGrown / maturationMonths) * 100, 100);
```

Actualizar también las líneas 373-377 donde se muestra el progreso por inversión.

---

## Paso 4: Actualizar Página de Inversiones

**Archivo:** `src/pages/Investments.tsx`

Cambios en el cálculo de progreso (líneas 344-349):
```text
// Usar la misma lógica de cálculo mensual desde abril
// para el progress bar de maduración
```

---

## Paso 5: Actualizar Datos Demo

**Archivo:** `src/contexts/DemoContext.tsx`

1. Cambiar `maturation_years: 8` a `maturation_years: 5.5` en las inversiones demo del Espadín (líneas 82-84, 99-101)
2. Actualizar `expected_harvest_year` para reflejar los 5.5 años desde abril
3. Ajustar `price_per_plant` según la nueva escala de precios

---

## Paso 6: Actualizar Componente Admin (SpeciesManager)

**Archivo:** `src/components/admin/SpeciesManager.tsx`

Cambiar `parseInt` a `parseFloat` en el input de años de maduración para permitir valores decimales como 5.5.

---

## Detalle Técnico: Cálculo de Fecha de Cosecha

Para un establecimiento en **abril 2024** con **5.5 años** de maduración:
- Abril 2024 + 5.5 años = Octubre 2029
- Meses: 4 (abril) + 66 meses = 70 meses desde enero 2024
- Año: 2024 + 5 = 2029, Mes: 4 + 6 = 10 (octubre)

| Año Plantación | Mes Plantación | + 5.5 años | Cosecha |
|----------------|----------------|------------|---------|
| 2021 | Abril | 66 meses | Octubre 2026 |
| 2022 | Abril | 66 meses | Octubre 2027 |
| 2023 | Abril | 66 meses | Octubre 2028 |
| 2024 | Abril | 66 meses | Octubre 2029 |
| 2025 | Abril | 66 meses | Octubre 2030 |
| 2026 | Abril | 66 meses | Octubre 2031 |

---

## Archivos a Modificar

| Archivo | Cambio |
|---------|--------|
| Nueva migración SQL | Tipo de columna + datos |
| `src/components/simulator/InvestmentSimulator.tsx` | Lógica de fechas |
| `src/pages/Dashboard.tsx` | Cálculo de progreso |
| `src/pages/Investments.tsx` | Progress bar |
| `src/contexts/DemoContext.tsx` | Datos demo |
| `src/components/admin/SpeciesManager.tsx` | Input decimal |
