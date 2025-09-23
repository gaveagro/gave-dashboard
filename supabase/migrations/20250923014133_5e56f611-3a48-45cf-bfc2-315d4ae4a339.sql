-- Create simulated AOI for La Sierra plot
DO $$
DECLARE
    la_sierra_plot_id UUID;
    aoi_id UUID := gen_random_uuid();
    data_request_id UUID := gen_random_uuid();
    transformation_id UUID := gen_random_uuid();
    alert_id UUID := gen_random_uuid();
    current_date DATE := CURRENT_DATE;
    i INTEGER;
    year INTEGER;
    month INTEGER;
    day INTEGER;
    ndvi_value NUMERIC;
    evi_value NUMERIC;
    savi_value NUMERIC;
    ndwi_value NUMERIC;
    temp NUMERIC;
    humidity NUMERIC;
    precip NUMERIC;
    wind NUMERIC;
    forecast_date DATE;
BEGIN
    -- Get La Sierra plot ID
    SELECT id INTO la_sierra_plot_id FROM plots WHERE name = 'La Sierra' LIMIT 1;
    
    IF la_sierra_plot_id IS NULL THEN
        RAISE EXCEPTION 'Plot La Sierra not found';
    END IF;

    -- 1. Create AOI for La Sierra
    INSERT INTO cecil_aois (
        id,
        plot_id,
        external_ref,
        name,
        status,
        created_by,
        hectares,
        geometry,
        cecil_aoi_id
    ) VALUES (
        aoi_id,
        la_sierra_plot_id,
        'aoi_la_sierra_001',
        'La Sierra - Monitoreo Satelital',
        'active',
        (SELECT user_id FROM profiles WHERE role = 'admin' LIMIT 1),
        50.5,
        jsonb_build_object(
            'type', 'Polygon',
            'coordinates', jsonb_build_array(
                jsonb_build_array(
                    jsonb_build_array(-99.13166666666666, 21.734166666666667),
                    jsonb_build_array(-99.13111111111111, 21.734722222222224),
                    jsonb_build_array(-99.12972222222221, 21.732499999999998),
                    jsonb_build_array(-99.12972222222221, 21.73222222222222),
                    jsonb_build_array(-99.13166666666666, 21.734166666666667)
                )
            )
        ),
        gen_random_uuid()
    );

    -- 2. Create data request
    INSERT INTO cecil_data_requests (
        id,
        cecil_aoi_id,
        dataset_name,
        dataset_id,
        external_ref,
        status,
        created_by,
        cecil_request_id
    ) VALUES (
        data_request_id,
        aoi_id,
        'KANOP',
        'kanop_vegetation_indices',
        'req_la_sierra_001',
        'completed',
        (SELECT user_id FROM profiles WHERE role = 'admin' LIMIT 1),
        gen_random_uuid()
    );

    -- 3. Create transformation
    INSERT INTO cecil_transformations (
        id,
        data_request_id,
        status,
        created_by,
        crs,
        spatial_resolution,
        cecil_transformation_id
    ) VALUES (
        transformation_id,
        data_request_id,
        'completed',
        (SELECT user_id FROM profiles WHERE role = 'admin' LIMIT 1),
        'EPSG:4326',
        0.00025,
        gen_random_uuid()
    );

    -- 4. Generate 3 years of historical satellite data (2022-2025)
    FOR year IN 2022..2025 LOOP
        FOR month IN 1..12 LOOP
            -- Stop at current month for current year
            IF year = 2025 AND month > 9 THEN
                EXIT;
            END IF;
            
            -- Calculate day (15th of each month)
            day := 15;
            
            -- Generate seasonal variation for vegetation indices
            -- Higher values in spring/summer (Apr-Sep), lower in winter
            IF month BETWEEN 4 AND 9 THEN
                -- Growing season
                ndvi_value := 0.45 + (random() * 0.35) + (sin(month * PI() / 6) * 0.15);
                evi_value := 0.25 + (random() * 0.25) + (sin(month * PI() / 6) * 0.1);
                savi_value := 0.20 + (random() * 0.20) + (sin(month * PI() / 6) * 0.08);
                ndwi_value := -0.1 + (random() * 0.3) + (sin(month * PI() / 6) * 0.1);
            ELSE
                -- Dormant season
                ndvi_value := 0.25 + (random() * 0.25);
                evi_value := 0.15 + (random() * 0.15);
                savi_value := 0.12 + (random() * 0.12);
                ndwi_value := -0.2 + (random() * 0.2);
            END IF;
            
            INSERT INTO cecil_satellite_data (
                cecil_aoi_id,
                transformation_id,
                measurement_date,
                year,
                month,
                day,
                x,
                y,
                ndvi,
                evi,
                savi,
                ndwi,
                dataset_name,
                cloud_coverage,
                data_quality,
                biomass,
                canopy_cover,
                carbon_capture
            ) VALUES (
                aoi_id,
                transformation_id,
                make_date(year, month, day),
                year,
                month,
                day,
                -99.1304,
                21.7334,
                ROUND(ndvi_value::numeric, 3),
                ROUND(evi_value::numeric, 3),
                ROUND(savi_value::numeric, 3),
                ROUND(ndwi_value::numeric, 3),
                'KANOP',
                ROUND((random() * 30)::numeric, 1), -- 0-30% cloud coverage
                CASE WHEN random() > 0.1 THEN 'good' ELSE 'fair' END,
                ROUND((ndvi_value * 150 + random() * 50)::numeric, 2), -- Biomass estimation
                ROUND((ndvi_value * 80 + random() * 20)::numeric, 1), -- Canopy cover %
                ROUND((ndvi_value * 25 + random() * 10)::numeric, 2) -- Carbon capture kg/ha
            );
        END LOOP;
    END LOOP;

    -- 5. Create current weather data
    temp := 28 + (random() * 8); -- 28-36°C
    humidity := 45 + (random() * 25); -- 45-70%
    precip := random() * 5; -- 0-5mm
    wind := 8 + (random() * 12); -- 8-20 km/h
    
    INSERT INTO cecil_weather_data (
        cecil_aoi_id,
        measurement_timestamp,
        temperature_celsius,
        humidity_percent,
        precipitation_mm,
        wind_speed_kmh,
        wind_direction_degrees,
        pressure_hpa,
        solar_radiation_wm2,
        soil_temperature_celsius,
        soil_moisture_percent,
        data_source,
        forecast_hours
    ) VALUES (
        aoi_id,
        NOW(),
        ROUND(temp::numeric, 1),
        ROUND(humidity::numeric, 1),
        ROUND(precip::numeric, 1),
        ROUND(wind::numeric, 1),
        ROUND((random() * 360)::numeric, 0),
        ROUND((1013 + (random() * 20 - 10))::numeric, 1),
        ROUND((800 + random() * 400)::numeric, 0),
        ROUND((temp - 2 + random() * 4)::numeric, 1),
        ROUND((30 + random() * 40)::numeric, 1),
        'OpenWeatherMap',
        NULL
    );

    -- 6. Generate 7-day weather forecast
    FOR i IN 1..7 LOOP
        forecast_date := current_date + i;
        temp := 26 + (random() * 10); -- 26-36°C
        humidity := 40 + (random() * 35); -- 40-75%
        precip := random() * 8; -- 0-8mm
        wind := 5 + (random() * 15); -- 5-20 km/h
        
        INSERT INTO cecil_weather_data (
            cecil_aoi_id,
            measurement_timestamp,
            temperature_celsius,
            humidity_percent,
            precipitation_mm,
            wind_speed_kmh,
            wind_direction_degrees,
            pressure_hpa,
            solar_radiation_wm2,
            soil_temperature_celsius,
            soil_moisture_percent,
            data_source,
            forecast_hours
        ) VALUES (
            aoi_id,
            forecast_date::timestamp,
            ROUND(temp::numeric, 1),
            ROUND(humidity::numeric, 1),
            ROUND(precip::numeric, 1),
            ROUND(wind::numeric, 1),
            ROUND((random() * 360)::numeric, 0),
            ROUND((1010 + (random() * 15 - 5))::numeric, 1),
            ROUND((750 + random() * 500)::numeric, 0),
            ROUND((temp - 1 + random() * 3)::numeric, 1),
            ROUND((25 + random() * 50)::numeric, 1),
            'OpenWeatherMap',
            i * 24
        );
    END LOOP;

    -- 7. Create sample alerts
    INSERT INTO cecil_alerts (
        id,
        cecil_aoi_id,
        alert_type,
        title,
        description,
        severity,
        status,
        threshold_value,
        current_value,
        recommendation
    ) VALUES 
    (
        gen_random_uuid(),
        aoi_id,
        'drought_risk',
        'Riesgo de Sequía Moderado',
        'Los niveles de humedad del suelo han estado por debajo del umbral recomendado durante los últimos 5 días.',
        'medium',
        'active',
        35.0,
        28.5,
        'Considere implementar riego suplementario y monitorear de cerca las condiciones del suelo.'
    ),
    (
        gen_random_uuid(),
        aoi_id,
        'high_temperature',
        'Temperaturas Elevadas',
        'Se han registrado temperaturas superiores a 35°C por tres días consecutivos.',
        'medium',
        'active',
        35.0,
        36.2,
        'Proteja los cultivos del estrés térmico aumentando la frecuencia de riego durante las horas más calurosas.'
    ),
    (
        gen_random_uuid(),
        aoi_id,
        'vegetation_decline',
        'Ligera Disminución en NDVI',
        'Se ha observado una pequeña disminución en el índice de vegetación NDVI en la zona sureste.',
        'low',
        'acknowledged',
        0.65,
        0.62,
        'Inspeccione la zona afectada para identificar posibles causas como plagas o deficiencias nutricionales.'
    );

    RAISE NOTICE 'Successfully created simulated satellite monitoring data for La Sierra plot';
END $$;