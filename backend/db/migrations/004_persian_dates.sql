update clients
set birth_date = null
where birth_date = '';

alter table clients
  add constraint clients_birth_date_jalali_format
  check (
    birth_date is null
    or birth_date ~ '^[0-9]{4}/(0[1-9]|1[0-2])/(0[1-9]|[12][0-9]|3[01])$'
  );
