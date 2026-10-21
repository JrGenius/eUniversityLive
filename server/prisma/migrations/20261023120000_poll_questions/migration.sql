-- Sondages : une question sans bonne réponse (correctIndex NULL) ne donne
-- aucun point et n'affiche que la répartition des votes.
ALTER TABLE "QuizQuestion" ALTER COLUMN "correctIndex" DROP NOT NULL;
ALTER TABLE "SessionQuestion" ALTER COLUMN "correctIndex" DROP NOT NULL;
