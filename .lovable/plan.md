
# Plan: Columnas ordenables en la tabla de Rentas

## Resumen

Agregar la funcionalidad de ordenamiento (sort) a todas las columnas de la tabla del Calendario de Rentas. Al hacer clic en el encabezado de una columna, los datos se ordenaran de forma ascendente; al hacer clic de nuevo, de forma descendente. Se mostrara un icono de flecha indicando la direccion del orden activo.

## Cambios

### Archivo: `src/components/admin/LeaseManager.tsx`

**1. Nuevo estado para controlar el ordenamiento**

Agregar dos estados:
- `sortColumn`: indica que columna esta activa (por defecto `null` para mantener el orden actual por cosecha)
- `sortDirection`: `'asc'` o `'desc'`

**2. Funcion de ordenamiento**

Crear una funcion `sortLeases` que reciba la lista filtrada y la ordene segun la columna seleccionada:

| Columna | Tipo de orden |
|---------|---------------|
| Propietario | Alfabetico (A-Z / Z-A) |
| Ubicacion | Alfabetico |
| Ano Plantacion | Numerico |
| Cosecha Est. | Por fecha de cosecha calculada |
| Hectareas | Numerico |
| Renta Anual | Numerico |
| Frecuencia | Alfabetico |
| Prox. Renta | Por fecha calculada |
| Vencimiento | Por fecha (end_date) |
| Saldo | Numerico |
| Estado | Por prioridad (overdue > expiring_soon > active > paid_up) |

**3. Encabezados clickeables**

Reemplazar los `<TableHead>` estaticos por elementos clickeables que:
- Cambien el `sortColumn` al hacer clic
- Alternen la direccion si ya es la columna activa
- Muestren un icono `ArrowUpDown` (neutro), `ArrowUp` (asc) o `ArrowDown` (desc) de lucide-react junto al texto

**4. Comportamiento**

- Si no hay columna seleccionada, se mantiene el orden actual (por prioridad de cosecha)
- Al hacer clic en una columna por primera vez: orden ascendente
- Segundo clic: orden descendente
- Tercer clic: vuelve al orden por defecto (cosecha)
- La columna "Acciones" no sera ordenable

### Detalle tecnico

Se reemplazara la linea `.sort((a, b) => getMonthsToHarvest(a) - getMonthsToHarvest(b))` en `filteredLeases` por una funcion que primero revise si hay un `sortColumn` activo, y si lo hay, ordene por esa columna; si no, use el orden por defecto de cosecha.

Se importara `ArrowUpDown`, `ArrowUp` y `ArrowDown` de lucide-react.

No se requieren cambios en la base de datos ni en otros archivos.
