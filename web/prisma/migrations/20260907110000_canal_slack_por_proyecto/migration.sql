-- Canal de Slack por proyecto. Lo rellena el GO si hay SLACK_BOT_TOKEN.
-- Solo añade dos columnas opcionales: no rompe nada de lo que ya hay.

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "slackChannelId" TEXT,
ADD COLUMN     "slackChannelName" TEXT;

