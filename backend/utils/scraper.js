import axios from 'axios';
import * as cheerio from 'cheerio';
import {setTimeout} from 'timers/promises';

const DEFAULT_DELAY = parseInt(process.env.SCRAPE_DELAY_MS) || 2000;
const MAX_RETRIES = parseInt(process.env.MAX_RETRIES) || 3;
const USER_AGENT = process.env.USER_AGENT || 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36';

export async function fetchHTML(url, retries = MAX_RETRIES) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await axios.get(url, {
        headers: {'User-Agent': USER_AGENT},
        timeout: 15000
      });
      return response.data;
    } catch (error) {
      console.log(`Attempt ${attempt}/${retries} failed for ${url}: ${error.message}`);
      if (attempt === retries) throw error;
      await setTimeout(DEFAULT_DELAY * attempt);
    }
  }
}

export function loadHTML(html) {
  return cheerio.load(html);
}

export async function delay(ms = DEFAULT_DELAY) {
  await setTimeout(ms);
}

export function cleanText(text) {
  return text?.trim().replace(/\s+/g, ' ') || '';
}

export function parsePrice(priceString) {
  const match = priceString?.match(/\$?(\d+\.?\d*)/);
  return match ? parseFloat(match[1]) : null;
}

export function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️';
  console.log(`[${timestamp}] ${prefix} ${message}`);
}
