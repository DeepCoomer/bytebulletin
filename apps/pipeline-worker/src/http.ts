import axios from 'axios';
import axiosRetry from 'axios-retry';
import { FETCH_TIMEOUT_MS } from '@bytebulletin/shared';

export const http = axios.create({
  timeout: FETCH_TIMEOUT_MS,
  headers: {
    'User-Agent': 'ByteBulletinBot/0.1 (+https://bytebulletin.deepcoomer.dev)',
    Accept: 'text/html,application/xhtml+xml,application/xml,application/json;q=0.9,*/*;q=0.8',
  },
  maxContentLength: 5 * 1024 * 1024,
});

axiosRetry(http, {
  retries: 2,
  retryDelay: (retryCount, error) =>
    axiosRetry.exponentialDelay(retryCount, error, 250),
});
