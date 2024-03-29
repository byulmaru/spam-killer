import { createRestAPIClient, createStreamingAPIClient, mastodon } from 'masto';
import dayjs from 'dayjs';

const rest = createRestAPIClient({
  url: process.env.MASTODON_URL,
  accessToken: process.env.MASTODON_ACCESS_TOKEN,
});

const streaming = createStreamingAPIClient({
  streamingApiUrl: `${process.env.MASTODON_URL}/api/v1/streaming`,
  accessToken: process.env.MASTODON_ACCESS_TOKEN,
});

function checkIsSpam(status: mastodon.v1.Status) {
  return status.inReplyToId === null &&
  status.account.acct.includes('@') &&
  (status.account.username === status.account.displayName || status.account.displayName.length === 0) &&
  status.mentions.length >= 1 &&
  dayjs(status.account.createdAt).isAfter(dayjs('2024-02-16'), 'day') &&
  /^[a-z0-9]{10}$/.test(status.account.username);
}

setInterval(async () => {
  const reports = await rest.v1.admin.reports.list({});
  for(const report of reports) {
    if(report.category === 'spam' && report.statuses.some((status) => checkIsSpam(status))) {
      console.log(`Reported ${report.targetAccount.acct} is a bot`);
      rest.v1.admin.accounts.$select(report.targetAccount.id).action.create({
        type: 'suspend',
        text: 'Mention Bot (Auto)',
        reportId: report.id,
      })
    }
  }
}, 60_000);

for await(const event of streaming.public.subscribe()) {
  if(event.event === 'update' && checkIsSpam(event.payload)) {
    console.log(`${event.payload.account.acct} is a bot`);
    rest.v1.admin.accounts.$select(event.payload.account.id).action.create({
      type: 'suspend',
      text: 'Mention Bot (Auto)'
    })
  }
}
