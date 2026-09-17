-- Enrollment boundaries are business calendar dates, not moments in time.
-- Corrected values already stored at midnight UTC retain their date. Older values stored as the
-- approval moment are converted from the studio's historical US Central calendar date once here;
-- application billing does not depend on a timezone after this conversion.
ALTER TABLE "Enrollment"
  ALTER COLUMN "startDate" DROP DEFAULT,
  ALTER COLUMN "startDate" TYPE DATE USING (
    CASE
      WHEN "startDate"::time = TIME '00:00:00' THEN "startDate"::date
      ELSE (("startDate" AT TIME ZONE 'UTC') AT TIME ZONE 'America/Chicago')::date
    END
  ),
  ALTER COLUMN "endDate" TYPE DATE USING (
    CASE
      WHEN "endDate" IS NULL THEN NULL
      WHEN "endDate"::time = TIME '00:00:00' THEN "endDate"::date
      ELSE (("endDate" AT TIME ZONE 'UTC') AT TIME ZONE 'America/Chicago')::date
    END
  );
