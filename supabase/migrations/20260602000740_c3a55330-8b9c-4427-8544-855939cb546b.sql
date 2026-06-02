
ALTER TABLE public.goal_contributions
ADD COLUMN contributed_on DATE NOT NULL DEFAULT CURRENT_DATE;
