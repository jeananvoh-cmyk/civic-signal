
ALTER TABLE public.reports 
  ADD CONSTRAINT impacted_people_range CHECK (impacted_people >= 1 AND impacted_people <= 10000),
  ADD CONSTRAINT babies_range CHECK (babies >= 0 AND babies <= impacted_people),
  ADD CONSTRAINT pregnant_range CHECK (pregnant >= 0 AND pregnant <= impacted_people),
  ADD CONSTRAINT elderly_range CHECK (elderly >= 0 AND elderly <= impacted_people),
  ADD CONSTRAINT vulnerable_sum_check CHECK (babies + pregnant + elderly <= impacted_people);
