import io

f = io.open('prisma/migrations/20260927000000_init/migration.sql', 'r', encoding='utf-16le')
content = f.read()
f.close()

new_sql = """
-- Manual constraints
CREATE UNIQUE INDEX "one_owner_per_team" ON "TeamMember"("teamId") WHERE role = 'OWNER';
CREATE UNIQUE INDEX "one_thumbnail_per_project" ON "ProjectAsset"("projectId") WHERE kind = 'THUMBNAIL';
ALTER TABLE "Event" ADD CONSTRAINT "event_dates_check" CHECK ("submissionsCloseAt" > "submissionsOpenAt" AND ("endsAt" >= "startsAt" OR "endsAt" IS NULL OR "startsAt" IS NULL));
ALTER TABLE "Event" ADD CONSTRAINT "event_max_team_size_check" CHECK ("maxTeamSize" > 0);
ALTER TABLE "TeamInvite" ADD CONSTRAINT "invite_uses_check" CHECK ("uses" >= 0 AND "uses" <= "maxUses");
"""

out = io.open('prisma/migrations/20260927000000_init/migration.sql', 'w', encoding='utf-8')
out.write(content + new_sql)
out.close()
