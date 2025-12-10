
  create table "public"."expense_participants" (
    "expense_id" uuid not null,
    "participant_id" uuid not null
      );


alter table "public"."expense_participants" enable row level security;


  create table "public"."expenses" (
    "id" uuid not null default gen_random_uuid(),
    "trip_id" uuid,
    "payer_id" uuid,
    "amount" integer not null,
    "description" text,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."expenses" enable row level security;


  create table "public"."participants" (
    "id" uuid not null default gen_random_uuid(),
    "trip_id" uuid,
    "name" text not null
      );


alter table "public"."participants" enable row level security;


  create table "public"."trips" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."trips" enable row level security;

CREATE UNIQUE INDEX expense_participants_pkey ON public.expense_participants USING btree (expense_id, participant_id);

CREATE UNIQUE INDEX expenses_pkey ON public.expenses USING btree (id);

CREATE UNIQUE INDEX participants_pkey ON public.participants USING btree (id);

CREATE UNIQUE INDEX trips_pkey ON public.trips USING btree (id);

alter table "public"."expense_participants" add constraint "expense_participants_pkey" PRIMARY KEY using index "expense_participants_pkey";

alter table "public"."expenses" add constraint "expenses_pkey" PRIMARY KEY using index "expenses_pkey";

alter table "public"."participants" add constraint "participants_pkey" PRIMARY KEY using index "participants_pkey";

alter table "public"."trips" add constraint "trips_pkey" PRIMARY KEY using index "trips_pkey";

alter table "public"."expense_participants" add constraint "expense_participants_expense_id_fkey" FOREIGN KEY (expense_id) REFERENCES public.expenses(id) ON DELETE CASCADE not valid;

alter table "public"."expense_participants" validate constraint "expense_participants_expense_id_fkey";

alter table "public"."expense_participants" add constraint "expense_participants_participant_id_fkey" FOREIGN KEY (participant_id) REFERENCES public.participants(id) ON DELETE CASCADE not valid;

alter table "public"."expense_participants" validate constraint "expense_participants_participant_id_fkey";

alter table "public"."expenses" add constraint "expenses_payer_id_fkey" FOREIGN KEY (payer_id) REFERENCES public.participants(id) not valid;

alter table "public"."expenses" validate constraint "expenses_payer_id_fkey";

alter table "public"."expenses" add constraint "expenses_trip_id_fkey" FOREIGN KEY (trip_id) REFERENCES public.trips(id) ON DELETE CASCADE not valid;

alter table "public"."expenses" validate constraint "expenses_trip_id_fkey";

alter table "public"."participants" add constraint "participants_trip_id_fkey" FOREIGN KEY (trip_id) REFERENCES public.trips(id) ON DELETE CASCADE not valid;

alter table "public"."participants" validate constraint "participants_trip_id_fkey";

grant delete on table "public"."expense_participants" to "anon";

grant insert on table "public"."expense_participants" to "anon";

grant references on table "public"."expense_participants" to "anon";

grant select on table "public"."expense_participants" to "anon";

grant trigger on table "public"."expense_participants" to "anon";

grant truncate on table "public"."expense_participants" to "anon";

grant update on table "public"."expense_participants" to "anon";

grant delete on table "public"."expense_participants" to "authenticated";

grant insert on table "public"."expense_participants" to "authenticated";

grant references on table "public"."expense_participants" to "authenticated";

grant select on table "public"."expense_participants" to "authenticated";

grant trigger on table "public"."expense_participants" to "authenticated";

grant truncate on table "public"."expense_participants" to "authenticated";

grant update on table "public"."expense_participants" to "authenticated";

grant delete on table "public"."expense_participants" to "service_role";

grant insert on table "public"."expense_participants" to "service_role";

grant references on table "public"."expense_participants" to "service_role";

grant select on table "public"."expense_participants" to "service_role";

grant trigger on table "public"."expense_participants" to "service_role";

grant truncate on table "public"."expense_participants" to "service_role";

grant update on table "public"."expense_participants" to "service_role";

grant delete on table "public"."expenses" to "anon";

grant insert on table "public"."expenses" to "anon";

grant references on table "public"."expenses" to "anon";

grant select on table "public"."expenses" to "anon";

grant trigger on table "public"."expenses" to "anon";

grant truncate on table "public"."expenses" to "anon";

grant update on table "public"."expenses" to "anon";

grant delete on table "public"."expenses" to "authenticated";

grant insert on table "public"."expenses" to "authenticated";

grant references on table "public"."expenses" to "authenticated";

grant select on table "public"."expenses" to "authenticated";

grant trigger on table "public"."expenses" to "authenticated";

grant truncate on table "public"."expenses" to "authenticated";

grant update on table "public"."expenses" to "authenticated";

grant delete on table "public"."expenses" to "service_role";

grant insert on table "public"."expenses" to "service_role";

grant references on table "public"."expenses" to "service_role";

grant select on table "public"."expenses" to "service_role";

grant trigger on table "public"."expenses" to "service_role";

grant truncate on table "public"."expenses" to "service_role";

grant update on table "public"."expenses" to "service_role";

grant delete on table "public"."participants" to "anon";

grant insert on table "public"."participants" to "anon";

grant references on table "public"."participants" to "anon";

grant select on table "public"."participants" to "anon";

grant trigger on table "public"."participants" to "anon";

grant truncate on table "public"."participants" to "anon";

grant update on table "public"."participants" to "anon";

grant delete on table "public"."participants" to "authenticated";

grant insert on table "public"."participants" to "authenticated";

grant references on table "public"."participants" to "authenticated";

grant select on table "public"."participants" to "authenticated";

grant trigger on table "public"."participants" to "authenticated";

grant truncate on table "public"."participants" to "authenticated";

grant update on table "public"."participants" to "authenticated";

grant delete on table "public"."participants" to "service_role";

grant insert on table "public"."participants" to "service_role";

grant references on table "public"."participants" to "service_role";

grant select on table "public"."participants" to "service_role";

grant trigger on table "public"."participants" to "service_role";

grant truncate on table "public"."participants" to "service_role";

grant update on table "public"."participants" to "service_role";

grant delete on table "public"."trips" to "anon";

grant insert on table "public"."trips" to "anon";

grant references on table "public"."trips" to "anon";

grant select on table "public"."trips" to "anon";

grant trigger on table "public"."trips" to "anon";

grant truncate on table "public"."trips" to "anon";

grant update on table "public"."trips" to "anon";

grant delete on table "public"."trips" to "authenticated";

grant insert on table "public"."trips" to "authenticated";

grant references on table "public"."trips" to "authenticated";

grant select on table "public"."trips" to "authenticated";

grant trigger on table "public"."trips" to "authenticated";

grant truncate on table "public"."trips" to "authenticated";

grant update on table "public"."trips" to "authenticated";

grant delete on table "public"."trips" to "service_role";

grant insert on table "public"."trips" to "service_role";

grant references on table "public"."trips" to "service_role";

grant select on table "public"."trips" to "service_role";

grant trigger on table "public"."trips" to "service_role";

grant truncate on table "public"."trips" to "service_role";

grant update on table "public"."trips" to "service_role";


