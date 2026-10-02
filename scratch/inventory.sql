\echo 'Table Counts'
SELECT (SELECT COUNT(*) FROM "EventRole") as "EventRole",
       (SELECT COUNT(*) FROM "EventJudgeAccess") as "EventJudgeAccess",
       (SELECT COUNT(*) FROM "JudgingStage") as "JudgingStage",
       (SELECT COUNT(*) FROM "AssignmentRun") as "AssignmentRun",
       (SELECT COUNT(*) FROM "StageReview") as "StageReview",
       (SELECT COUNT(*) FROM "StageCriterionScore") as "StageCriterionScore",
       (SELECT COUNT(*) FROM "CalculationRun") as "CalculationRun",
       (SELECT COUNT(*) FROM "FinalizationSnapshot") as "FinalizationSnapshot";

\echo 'RubricAssignment statuses'
SELECT status, count(*) FROM "RubricAssignment" GROUP BY status;

\echo 'Mock/Manual Artifact Candidates (evt_01)'
SELECT id, name, state FROM "JudgingStage" WHERE "eventId" = 'evt_01';
SELECT id, method, "inputHash" FROM "CalculationRun" WHERE "inputHash" = 'migrated';
