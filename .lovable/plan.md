
# Plan: Mejoras al Calendario de Rentas

## Resumen

Agregar cuatro mejoras al componente LeaseManager: (1) calculo automatico de la proxima fecha de vencimiento de renta segun frecuencia de pago, (2) campo editable de mes/ano estimado de cosecha, (3) mejora en el dialogo de pago para aceptar abonos parciales con periodo asociado, y (4) seccion de comentarios/historial por contrato.

---

## Cambio 1: Columna "Proxima Renta" con calculo automatico

**Logica**: A partir de la fecha de inicio del contrato (`start_date`) y la frecuencia de pago (`payment_frequency`), calcular cual es la proxima fecha en que vence la renta:

- **Anual**: sumar anos completos desde `start_date` hasta encontrar la proxima fecha futura
- **Cada 6 meses**: sumar periodos de 6 meses
- **Mensual**: sumar meses

Se agregara una nueva columna "Proxima Renta" en la tabla que muestre esta fecha calculada, con indicador visual si ya vencio (rojo) o esta proxima (amarillo).

**Archivo**: `src/components/admin/LeaseManager.tsx`

## Cambio 2: Campo editable de mes/ano estimado de cosecha

**Actualmente**: La cosecha se calcula automaticamente con la formula `ano plantacion + 5.5 anos desde abril`. No se puede editar.

**Nuevo**: Agregar dos columnas opcionales a la base de datos (`estimated_harvest_month` y `estimated_harvest_year`) que permitan sobrescribir la estimacion automatica. Si estan vacios, se usa el calculo automatico como fallback.

Se agregaran campos de mes y ano de cosecha al formulario de edicion de renta.

**Archivos**:
- Nueva migracion SQL para agregar columnas `estimated_harvest_month` (INTEGER, 1-12) y `estimated_harvest_year` (INTEGER) a `land_leases`
- `src/components/admin/LeaseManager.tsx` - actualizar formulario y logica de cosecha

## Cambio 3: Mejora del dialogo de Registrar Pago

El dialogo ya permite montos parciales y tiene campo de periodo. Se mejorara para:

- Mostrar claramente que el monto puede ser un abono parcial (no necesariamente la renta completa)
- Agregar un selector de "Periodo de renta que corresponde" con opciones generadas automaticamente segun la frecuencia (ej: "Oct 2024 - Oct 2025", "Ene 2025 - Jun 2025")
- Mostrar el saldo actual y el saldo resultante despues del abono
- Agregar campo de notas para el pago

**Archivo**: `src/components/admin/LeaseManager.tsx`

## Cambio 4: Seccion de comentarios por contrato

Agregar una nueva tabla `lease_comments` para registrar un historial de comentarios asociados a cada contrato (negociaciones, pendientes de firma, etc.).

Al hacer clic en una renta, se abrira un panel o dialogo que muestre:
- Los comentarios existentes, ordenados del mas reciente al mas antiguo
- Un campo para agregar un nuevo comentario
- Fecha y hora automatica de cada comentario

**Archivos**:
- Nueva migracion SQL para crear tabla `lease_comments` con RLS admin-only
- `src/components/admin/LeaseManager.tsx` - agregar boton de comentarios y dialogo

---

## Detalle tecnico

### Migracion SQL

```text
Tabla: lease_comments
- id: UUID (PK)
- lease_id: UUID (FK -> land_leases.id)
- comment: TEXT (NOT NULL)
- created_at: TIMESTAMPTZ (default now())

Columnas nuevas en land_leases:
- estimated_harvest_month: INTEGER (nullable, 1-12)
- estimated_harvest_year: INTEGER (nullable)

RLS: Solo admins (has_role(auth.uid(), 'admin'))
```

### Funcion de calculo de proxima renta

```text
getNextRentDueDate(startDate, frequency):
  1. Parsear startDate
  2. Segun frequency:
     - "Anual": incrementar anio desde startDate hasta > hoy
     - "Cada 6 meses": incrementar 6 meses
     - "Mensual": incrementar 1 mes
  3. Retornar la proxima fecha futura
  4. Si el contrato ya expiro (endDate < hoy), retornar null
```

### Cambios en la tabla visual

Se agregara la columna "Proxima Renta" entre "Frecuencia" y "Saldo", mostrando la fecha calculada con formato corto (ej: "Oct 2026").

### Cambios en el formulario de edicion

Se agregaran dos campos nuevos:
- "Mes estimado de cosecha" (select 1-12 o vacio para auto)
- "Ano estimado de cosecha" (input numerico o vacio para auto)

### Boton de comentarios en tabla

Se agregara un icono de "chat/comentario" en las acciones de cada fila que abrira un dialogo con el historial de comentarios y un campo para agregar nuevos.

---

## Archivos a crear/modificar

| Archivo | Accion |
|---------|--------|
| Nueva migracion SQL | Crear tabla `lease_comments` + columnas harvest en `land_leases` |
| `src/components/admin/LeaseManager.tsx` | Agregar columna proxima renta, campos cosecha editables, mejorar pago, agregar comentarios |
| `src/integrations/supabase/types.ts` | Se actualiza automaticamente |
