

# Plan: Insertar Datos Reales del CSV en la Tabla de Rentas

## Situacion Actual

La tabla `land_leases` tiene 20 registros de la zona de Ameca/Jalisco, pero el CSV compartido contiene **21 registros adicionales** de otras regiones (San Luis Potosi) que no fueron insertados.

## Registros a Insertar

### Grupo 1: La Caldera, Aquismon (8 registros)

| Propietario | Ha | Costo/Ha | Renta Anual | Inicio | Fin | Saldo | Notas |
|---|---|---|---|---|---|---|---|
| Martin Melendrez | 1 | $6,000 | $6,000 | Oct 2021 | Oct 2027 | $6,000 | Renta vencida Oct 2025 |
| Maricela Anastacio | 1 | $6,000 | $6,000 | Oct 2021 | Oct 2027 | $6,000 | Renta vencida Oct 2025 |
| Roberto Lucas | 1 | $6,000 | $6,000 | Oct 2021 | Oct 2027 | $6,000 | Renta vencida Oct 2025 |
| Valentin Anastacio | 0.75 | $6,666.67 | $5,000 | Oct 2021 | Oct 2027 | $5,000 | Renta vencida Oct 2025 |
| Obispo Anastacio | 0.75 | $6,666.67 | $5,000 | Oct 2021 | Oct 2027 | $5,000 | Renta vencida Oct 2025 |
| Josefina Lucas | 4 | $6,000 | $24,000 | Sep 2023 | Sep 2030 | $24,000 | Renta vencida Oct 2025 |
| Santos Liborio | 1 | $12,500 | $12,500 | Oct 2021 | Oct 2027 | $12,500 | Renta vencida Oct 2025 |

### Grupo 1b: El Sabinal, Aquismon (1 registro)

| Propietario | Ha | Costo/Ha | Renta Anual | Inicio | Fin | Saldo |
|---|---|---|---|---|---|---|
| Benito Lucas | 0.7 | $7,857.14 | $5,500 | Abr 2023 | Abr 2029 | $5,500 |

### Grupo 2: Tanchachin, Aquismon (4 registros)

| Propietario | Ha | Costo/Ha | Renta Anual | Inicio | Fin | Frecuencia | Saldo |
|---|---|---|---|---|---|---|---|
| Melany Marquez Aguilar | 2 | $12,000 | $24,000 | 22-Sep-2022 | 22-Sep-2028 | Cada 6 meses | $0 |
| Martin Marquez Aguilar | 1 | $18,000 | $18,000 | Jun 2022 | Jun 2028 | Mensual | $0 |
| Martin Marquez Aguilar | 1.5 | $20,000 | $30,000 | Sep 2020 | Sep 2023 | Cada 6 meses | $0 |
| Martin Marquez Aguilar | 3.63 | $9,917.36 | $36,000 | Ago 2020 | Ago 2023 | Cada 6 meses | $0 |

Nota: Los dos ultimos contratos de Martin Marquez ya estan expirados (terminaron en 2023).

### Grupo 3: Santa Anita (2 registros)

| Propietario | Ha | Costo/Ha | Renta Anual | Inicio | Fin | Saldo | Notas |
|---|---|---|---|---|---|---|---|
| Pablo Simon | 4 | $5,500 | $22,000 | 30-Abr-2023 | 30-Abr-2029 | $60,000 | Pago parcial en 2023, faltan 2024 y 2025 |
| Miguel Guzman | 3 | $5,500 | $16,500 | 30-Abr-2023 | 30-Abr-2029 | $43,500 | Pago parcial en 2023, faltan 2024 y 2025 |

### Grupo 4: Ebano (4 registros)

| Propietario | Ha | Costo/Ha | Renta Anual | Inicio | Fin | Saldo | Notas |
|---|---|---|---|---|---|---|---|
| Miguel Avila Garcia | 4 | $1,800 | $7,200 | 10-Jul-2021 | 10-Jul-2027 | $11,000 | A partir de julio 2026 seran $18,200 |
| Carlos Milan Lopez | 5 | $2,000 | $10,000 | 1-Jun-2021 | 1-Jun-2027 | $7,000 | A partir de junio 2026 seran $17,000 |
| Francisco Jimenez Santillan | 2 | $1,800 | $3,600 | 10-Jul-2021 | 10-Jul-2027 | $13,200 | A partir de junio 2026 seran $26,400 |
| Ana Laura | 10 | $1,800 | $18,000 | 10-Jul-2021 | 10-Jul-2027 | $0 | Todo pagado hasta julio 2027 |

### Grupo 5: Predios sin renta (3 registros)

| Propietario | Ha | Ubicacion | Ano |
|---|---|---|---|
| Mauricio Olivares | 3 | Ojo Caliente, Tamasopo | 2023 |
| Arturo Segoviano | 8 | Pozo de Luna, Soledad de Graciano Sanchez | 2021 |
| Arturo Segoviano | 10 | El Carpintero, Tamasopo | 2023 |

Estos 3 tienen renta $0 y sin fechas de contrato. Se insertaran con status "active" y renta $0.

## Implementacion

**Paso unico**: Usar la herramienta de insercion de datos para ejecutar un INSERT de los 21 registros en `land_leases`, asignando correctamente:
- Los contratos expirados (Tanchachin 2020-2023) con status `expired`
- Ana Laura con saldo $0 y status `active`
- Los demas con sus saldos pendientes reales del CSV
- Notas completas del CSV preservadas

No se requieren cambios de esquema ni de codigo frontend.

