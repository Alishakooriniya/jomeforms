alter table form_templates
  add column print_layout text check (print_layout is null or print_layout = 'document-request-a4');

alter table form_template_versions
  add column print_layout text check (print_layout is null or print_layout = 'document-request-a4');
