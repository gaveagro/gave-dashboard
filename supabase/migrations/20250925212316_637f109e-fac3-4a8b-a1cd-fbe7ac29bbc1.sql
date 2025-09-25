-- Add forest_change column to cecil_satellite_data table
ALTER TABLE cecil_satellite_data 
ADD COLUMN forest_change numeric DEFAULT NULL;

-- Add comment to explain the new column
COMMENT ON COLUMN cecil_satellite_data.forest_change IS 'Forest change detection data from Hansen Global Forest Change dataset';