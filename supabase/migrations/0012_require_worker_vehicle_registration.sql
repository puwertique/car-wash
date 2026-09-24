alter table workers
  alter column work_vehicle_plate_number set not null;

alter table workers
  alter column vehicle_photo_path set not null;

alter table workers
  alter column carte_grise_photo_path set not null;
