import axios from 'axios';
import admin from 'firebase-admin';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import process from 'process';
import { Buffer } from 'buffer';

// Use this file as a standalone script
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

// Initialize Firebase Admin (requires FIREBASE_SERVICE_ACCOUNT JSON string in env, or local default args)
if (!admin.apps.length) {
    try {
        if (process.env.FIREBASE_SERVICE_ACCOUNT_RECRUITERAID) {
            const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_RECRUITERAID);
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
        } else {
            // Local fallback (assumes GOOGLE_APPLICATION_CREDENTIALS or local firebase login network)
            admin.initializeApp();
        }
    } catch (e) {
        console.warn('Could not initialize Firebase Admin via process.env.FIREBASE_SERVICE_ACCOUNT_RECRUITERAID. Fallback to application default credentials.');
        admin.initializeApp();
    }
}

const db = admin.firestore();

const ADZUNA_APP_ID = process.env.ADZUNA_APP_ID;
const ADZUNA_APP_KEY = process.env.ADZUNA_APP_KEY;

const BASE_URL = 'https://api.adzuna.com/v1/api/jobs/gb/search';

function getTagFrequencies(jobs) {
    const frequencies = {};
    const ignoreWords = new Set(['and', 'the', 'to', 'for', 'a', 'in', 'of', 'with', 'is', 'on', 'this', 'you', 'are', 'we', 'will', 'be', 'an', 'as', 'our', 'or', 'your', 'have', 'from', 'that', 'can', 'not', 'but', 'all', 'any']);

    jobs.forEach(job => {
        const text = `${job.title} ${job.description}`.toLowerCase();
        // Extract words longer than 3 characters
        const words = text.match(/\b[a-z]{4,20}\b/g) || [];
        words.forEach(w => {
            if (!ignoreWords.has(w)) {
                frequencies[w] = (frequencies[w] || 0) + 1;
            }
        });
    });

    return Object.entries(frequencies)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 30) // top 30 keywords
        .map(([text, value]) => ({ text, value }));
}

function getTopPlatforms(jobs) {
    const platforms = {};
    jobs.forEach(job => {
        const cname = job.company?.display_name || 'Direct Employer';
        platforms[cname] = (platforms[cname] || 0) + 1;
    });

    return Object.entries(platforms)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([name, count]) => ({ name, count }));
}

async function runScraper() {
    console.log('Starting daily metric scrape...');

    if (!ADZUNA_APP_ID || !ADZUNA_APP_KEY) {
        console.error('Missing ADZUNA_APP_ID or ADZUNA_APP_KEY in environment');
        // Let pipeline complete cleanly if not configured yet
        process.exit(0);
    }

    const todayStr = new Date().toISOString().split('T')[0];

    try {
        // 1. Get total active jobs
        const totalRes = await axios.get(`${BASE_URL}/1?app_id=${ADZUNA_APP_ID}&app_key=${ADZUNA_APP_KEY}&results_per_page=0`);
        const totalOpenRoles = totalRes.data.count;

        // 2. Get permanent jobs count
        const permRes = await axios.get(`${BASE_URL}/1?app_id=${ADZUNA_APP_ID}&app_key=${ADZUNA_APP_KEY}&results_per_page=0&full_time=1&permanent=1`);
        const totalPermanent = permRes.data.count;

        // 3. Get contract jobs count
        const contractRes = await axios.get(`${BASE_URL}/1?app_id=${ADZUNA_APP_ID}&app_key=${ADZUNA_APP_KEY}&results_per_page=0&contract=1`);
        const totalContract = contractRes.data.count;

        // 4. Fetch the first 250 jobs to calculate tags and top platforms 
        let sampleJobs = [];
        for (let i = 1; i <= 5; i++) {
            const sampleRes = await axios.get(`${BASE_URL}/${i}?app_id=${ADZUNA_APP_ID}&app_key=${ADZUNA_APP_KEY}&results_per_page=50`);
            sampleJobs = sampleJobs.concat(sampleRes.data.results);
            await new Promise(r => setTimeout(r, 1000)); // be nice to the API
        }

        const tags = getTagFrequencies(sampleJobs);
        const topPlatforms = getTopPlatforms(sampleJobs);

        const metricsData = {
            date: todayStr,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            totalOpenRoles,
            split: {
                permanent: totalPermanent,
                contract: totalContract
            },
            topPlatforms,
            trendingTags: tags
        };

        // Write to Firestore using the date as the document ID
        await db.collection('daily_metrics').doc(todayStr).set(metricsData, { merge: true });

        console.log(`Successfully scraped and saved metrics for ${todayStr}`);
        console.log(metricsData);

    } catch (e) {
        console.error('Failed to scrape Adzuna data:', e.message);
        if (e.response) {
            console.error(e.response.data);
        }
        process.exit(1);
    }
}

runScraper();
