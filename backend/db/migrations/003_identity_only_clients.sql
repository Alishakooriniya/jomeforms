alter table clients
  add column residence_address text;

alter table clients
  drop column email,
  drop column party_role,
  drop column party2_name,
  drop column party2_role,
  drop column party2_national_id,
  drop column party2_mobile,
  drop column deal_kind,
  drop column province,
  drop column city,
  drop column address,
  drop column property_kind,
  drop column area,
  drop column region,
  drop column plate,
  drop column unit,
  drop column floor,
  drop column build_year,
  drop column price,
  drop column deposit,
  drop column rent,
  drop column commission_percent,
  drop column agent_name,
  drop column source,
  drop column tags,
  drop column notes,
  drop column extra;

drop type party_role;
drop type property_kind;
drop type deal_kind;
