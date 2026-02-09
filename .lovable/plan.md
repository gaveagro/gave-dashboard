

# Plan: Calendario de Rentas (Admin Only)

## Resumen

Crear una nueva seccion "Rentas" en el panel de administracion para gestionar contratos de renta de terrenos, con control de pagos, vencimientos, prioridades de pago y relacion con anos de plantacion.

## Datos del CSV

Se importaran 20 registros de rentas con campos como: ano de plantacion, superficie (ha), costo por ha/ano, renta anual, propietario, ubicacion, fecha inicio/terminacion, frecuencia de pago, saldo pendiente y notas/comentarios.

---

## Paso 1: Crear tabla `land_leases` en Supabase

Nueva tabla con las siguientes columnas:

| Columna | Tipo | Descripcion |
|---------|------|-------------|
| id | UUID (PK) | Identificador |
| plantation_year | INTEGER | Ano de plantacion |
| area_hectares | NUMERIC(10,2) | Superficie en hectareas |
| cost_per_hectare_year | NUMERIC(12,2) | Costo por ha/ano |
| annual_rent | NUMERIC(12,2) | Renta anual total |
| owner_name | TEXT | Nombre del propietario |
| location | TEXT | Ubicacion del predio |
| start_date | DATE | Fecha de inicio del contrato |
| end_date | DATE | Fecha de terminacion |
| payment_frequency | TEXT | Frecuencia de pago (Anual, Mensual, Cada 6 meses) |
| outstanding_balance | NUMERIC(12,2) | Saldo pendiente actual |
| notes | TEXT | Comentarios y notas |
| species_name | TEXT | Especie de agave cultivada (para futuro uso) |
| status | TEXT | Estado: active, expired, paid_up |
| created_at | TIMESTAMPTZ | Fecha creacion |
| updated_at | TIMESTAMPTZ | Fecha actualizacion |

- RLS habilitado, con politica solo para admins usando `has_role(auth.uid(), 'admin')`

## Paso 2: Crear tabla `lease_payments` para registro de pagos

| Columna | Tipo | Descripcion |
|---------|------|-------------|
| id | UUID (PK) | Identificador |
| lease_id | UUID (FK -> land_leases) | Referencia a la renta |
| amount | NUMERIC(12,2) | Monto pagado |
| payment_date | DATE | Fecha del pago |
| period_covered | TEXT | Periodo que cubre (ej: "Oct 2024 - Oct 2025") |
| notes | TEXT | Notas del pago |
| created_at | TIMESTAMPTZ | Fecha creacion |

- RLS habilitado, solo admins

## Paso 3: Insertar los datos del CSV

Insertar los 20 registros del CSV en la tabla `land_leases` con los datos parseados (convirtiendo formatos de moneda y fechas).

## Paso 4: Crear componente `LeaseManager.tsx`

Nuevo componente en `src/components/admin/LeaseManager.tsx` que incluira:

**Vista principal (tabla):**
- Tabla con todas las rentas, ordenadas por prioridad
- Columnas: Propietario, Ubicacion, Ano Plantacion, Superficie, Renta Anual, Frecuencia, Fecha Vencimiento, Saldo Pendiente, Estado
- Indicadores visuales con colores:
  - Rojo: renta vencida con saldo pendiente
  - Amarillo: renta proxima a vencer (dentro de 3 meses)
  - Verde: pagada al corriente
  - Gris: contrato expirado sin deuda

**Panel de resumen (cards superiores):**
- Total de rentas activas
- Total de saldo pendiente
- Rentas vencidas (cantidad)
- Proximos vencimientos (cantidad en los proximos 3 meses)

**Prioridades:**
- Ordenar automaticamente por proximidad a cosecha (usando el ano de plantacion + 5.5 anos de maduracion) para identificar que predios son prioritarios de pago

**Funcionalidades CRUD:**
- Crear nueva renta
- Editar renta existente
- Registrar pago (reduce saldo pendiente)
- Eliminar renta
- Filtrar por ubicacion, estado, ano de plantacion

## Paso 5: Integrar en Admin.tsx

- Agregar nueva tab "Rentas" al TabsList (pasar de grid-cols-7 a grid-cols-8)
- Importar y renderizar `LeaseManager` en el nuevo TabsContent

---

## Archivos a crear/modificar

| Archivo | Accion |
|---------|--------|
| Nueva migracion SQL | Crear tablas `land_leases` y `lease_payments` + RLS + datos iniciales |
| `src/integrations/supabase/types.ts` | Se actualiza automaticamente |
| `src/components/admin/LeaseManager.tsx` | **Crear** - Componente principal de gestion de rentas |
| `src/pages/Admin.tsx` | Agregar tab "Rentas" e importar LeaseManager |

