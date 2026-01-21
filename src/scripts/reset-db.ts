
import { Pool } from 'pg';
import dotenv from 'dotenv';
import { Redis } from 'ioredis';

dotenv.config();

async function reset() {
    console.log('Resetting databases...');

    // 1. Postgres
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL
    });

    try {
        // Fetch all table names
        const res = await pool.query(`
            SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename != 'pg_migrations';
        `);

        if (res.rows.length === 0) {
            console.log('No tables to truncate.');
        } else {
            const tables = res.rows.map(r => r.tablename).join(', ');
            console.log(`Truncating: ${tables}`);
            await pool.query(`TRUNCATE ${tables} CASCADE;`);
            console.log('✅ Postgres tables truncated.');
        }
    } catch (e) {
        console.error('❌ Postgres reset failed:', e);
    } finally {
        await pool.end();
    }

    // 2. Redis
    const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    try {
        await redis.flushall();
        console.log('✅ Redis flushed.');
    } catch (e) {
        console.error('❌ Redis reset failed:', e);
    } finally {
        redis.disconnect();
    }
}

reset();
