-- =============================================================================
-- Seed data for local / staging testing.
--
-- USAGE:
--   1. Sign in to the app at least once so your auth.users row exists.
--   2. Find your user id:  select id, email from auth.users;
--   3. Replace the :user_id below (psql) OR set it in the DO block, then run
--      this file in the Supabase SQL Editor.
--
-- This inserts ~6 weeks of plausible shifts, fuel logs and one maintenance
-- record for a Bezza 1.3L starting around the 31,000 km mark. Safe to re-run:
-- it clears any rows it previously created for the same user first.
-- =============================================================================

do $$
declare
  v_user uuid;
  d date;
  odo numeric := 31000;          -- starting odometer for the seed window
  trip numeric;
  i int := 0;
  start_ts timestamptz;
  end_ts timestamptz;
  grab numeric;
  bolt numeric;
  indrive numeric;
  gross numeric;
begin
  -- Use the most recently created user. For a specific account, hard-code:
  --   v_user := '00000000-0000-0000-0000-000000000000';
  select id into v_user from auth.users order by created_at desc limit 1;
  if v_user is null then
    raise notice 'No auth.users row found — sign in to the app first.';
    return;
  end if;

  -- Clean previous seed rows for this user so re-runs stay idempotent.
  delete from public.shifts          where user_id = v_user;
  delete from public.fuel_logs       where user_id = v_user;
  delete from public.maintenance_logs where user_id = v_user;

  -- One maintenance baseline: tyres fitted near the start of the window.
  insert into public.maintenance_logs (user_id, date, part_name, replaced_at_odometer, cost)
  values (v_user, (now() - interval '40 days'), 'Tyres', 30800, 650);

  -- Generate 42 days of shifts (skip ~1 in 7 as rest days).
  for i in 0..41 loop
    d := (current_date - (41 - i));
    -- rest day roughly every 7th day
    if (i % 7) = 6 then
      continue;
    end if;

    trip := 120 + floor(random() * 110);   -- 120–230 km per shift
    -- vary the start hour across morning / afternoon / night blocks
    start_ts := (d::timestamptz) + (make_interval(hours => (6 + (i % 14))::int));
    end_ts := start_ts + make_interval(hours => 7, mins => (floor(random() * 60))::int);

    grab := round((trip * (0.95 + random() * 0.25))::numeric, 2);
    bolt := round((random() * 40)::numeric, 2);
    indrive := round((random() * 25)::numeric, 2);
    gross := grab + bolt + indrive;

    insert into public.shifts
      (user_id, shift_start, shift_end, start_mileage, end_mileage, earnings, expenses)
    values (
      v_user,
      start_ts,
      end_ts,
      odo,
      odo + trip,
      jsonb_build_object(
        'platforms', jsonb_build_object('Grab', grab, 'Bolt', bolt, 'inDrive', indrive),
        'cash_vs_wallet', jsonb_build_object(
          'cash', round((gross * 0.35)::numeric, 2),
          'wallet', round((gross * 0.65)::numeric, 2)
        )
      ),
      jsonb_build_object(
        'tolls', round((random() * 8)::numeric, 2),
        'parking', round((random() * 4)::numeric, 2)
      )
    );

    odo := odo + trip;

    -- Refuel roughly every ~400 km of accumulated distance.
    if (i % 3) = 0 then
      insert into public.fuel_logs (user_id, date, odometer, liters_pumped, total_cost)
      values (
        v_user,
        end_ts,
        odo,
        round((30 + random() * 10)::numeric, 2),                       -- 30–40 L
        round(((30 + random() * 10) * 1.99)::numeric, 2)               -- at BUDI95 rate
      );
    end if;
  end loop;

  raise notice 'Seed complete for user %, final odometer %', v_user, odo;
end $$;
