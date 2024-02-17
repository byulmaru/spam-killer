import { createRestAPIClient, createStreamingAPIClient } from 'masto';
import dayjs from 'dayjs';

const rest = createRestAPIClient({
  url: process.env.MASTODON_URL,
  accessToken: process.env.MASTODON_ACCESS_TOKEN,
});

const streaming = createStreamingAPIClient({
  streamingApiUrl: `${process.env.MASTODON_URL}/api/v1/streaming`,
  accessToken: process.env.MASTODON_ACCESS_TOKEN,
});

for await(const event of streaming.public.subscribe()) {
  if(event.event === 'update' && !event.payload.inReplyToId) {
    if(event.payload.account.acct.includes('@') && event.payload.account.username === event.payload.account.displayName) {
      if(event.payload.mentions.length >= 2 && dayjs(event.payload.account.createdAt).isSame(dayjs(), 'day')) {
        if(/^[a-z0-9]{10}$/.test(event.payload.account.username)) {
          console.log(`${event.payload.account.acct} is a bot`);
          rest.v1.admin.accounts.$select(event.payload.account.id).action.create({
            type: 'suspend',
            text: 'Mention Bot (Auto)'
          })
        }
      }
    }
  }
}