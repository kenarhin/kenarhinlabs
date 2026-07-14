-- Cover the admin-reply actor foreign key identified by the database advisor.
begin;

create index email_messages_created_by_idx
  on comms.email_messages (created_by)
  where created_by is not null;

commit;
