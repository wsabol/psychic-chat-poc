import { spawn } from 'child_process';
import path from 'path';

export async function calculateBirthChart(birthData) {
    return new Promise((resolve, reject) => {
        const python = spawn('/bin/sh', ['-c', 'python3 ./astrology.py'], {
            cwd: path.join(process.cwd(), 'worker')
        });
        let outputData = '';
        let errorData = '';
        
        python.stdout.on('data', (data) => { outputData += data.toString(); });
        python.stderr.on('data', (data) => { errorData += data.toString(); });
        
        python.on('close', (code) => {
            if (code !== 0) {
                console.error(`[ASTROLOGY] Python script exited with code ${code}`);
                if (errorData) console.error(`[ASTROLOGY] Python stderr:`, errorData);
                reject(new Error(`Python script failed: ${errorData}`));
                return;
            }
            try {
                const result = JSON.parse(outputData);
                resolve(result);
            } catch (e) {
                console.error(`[ASTROLOGY] Failed to parse result:`, outputData);
                reject(new Error(`Invalid JSON: ${e.message}`));
            }
        });
        
        python.on('error', (err) => {
            console.error(`[ASTROLOGY] Failed to spawn Python:`, err);
            reject(err);
        });
        
        python.stdin.write(JSON.stringify(birthData));
        python.stdin.end();
    });
}

export async function getCurrentTransits(birthData) {
    return new Promise((resolve, reject) => {
        const python = spawn('/bin/sh', ['-c', 'python3 ./astrology.py'], {
            cwd: path.join(process.cwd(), 'worker')
        });
        let outputData = '';
        let errorData = '';
        
        python.stdout.on('data', (data) => { outputData += data.toString(); });
        python.stderr.on('data', (data) => { errorData += data.toString(); });
        
        python.on('close', (code) => {
            if (code !== 0) {
                reject(new Error(`Transits calculation failed: ${errorData}`));
                return;
            }
            try {
                resolve(JSON.parse(outputData));
            } catch (e) {
                reject(new Error(`Invalid JSON: ${e.message}`));
            }
        });
        
        python.on('error', reject);
        python.stdin.write(JSON.stringify({ type: 'transits', ...birthData }));
        python.stdin.end();
    });
}

export async function getCurrentMoonPhase() {
    return new Promise((resolve, reject) => {
        const python = spawn('/bin/sh', ['-c', 'python3 ./astrology.py'], {
            cwd: path.join(process.cwd(), 'worker')
        });
        let outputData = '';
        let errorData = '';
        
        python.stdout.on('data', (data) => { outputData += data.toString(); });
        python.stderr.on('data', (data) => { errorData += data.toString(); });
        
        python.on('close', (code) => {
            if (code !== 0) {
                console.error(`[ASTROLOGY] Moon phase script exited with code ${code}`);
                if (errorData) console.error(`[ASTROLOGY] Python stderr:`, errorData);
                reject(new Error(`Python script failed: ${errorData}`));
                return;
            }
            try {
                resolve(JSON.parse(outputData));
            } catch (e) {
                console.error(`[ASTROLOGY] Failed to parse moon phase:`, outputData);
                reject(new Error(`Invalid JSON: ${e.message}`));
            }
        });
        
        python.on('error', reject);
        python.stdin.write(JSON.stringify({ type: 'moon_phase' }));
        python.stdin.end();
    });
}

export async function getCurrentPlanets() {
    return new Promise((resolve, reject) => {
        const python = spawn('/bin/sh', ['-c', 'python3 ./astrology.py'], {
            cwd: path.join(process.cwd(), 'worker')
        });
        let outputData = '';
        let errorData = '';
        
        python.stdout.on('data', (data) => { outputData += data.toString(); });
        python.stderr.on('data', (data) => { errorData += data.toString(); });
        
        python.on('close', (code) => {
            if (code !== 0) {
                console.error(`[ASTROLOGY] Current planets script exited with code ${code}`);
                if (errorData) console.error(`[ASTROLOGY] Python stderr:`, errorData);
                reject(new Error(`Current planets failed: ${errorData}`));
                return;
            }
            try {
                resolve(JSON.parse(outputData));
            } catch (e) {
                console.error(`[ASTROLOGY] Failed to parse planets:`, outputData);
                reject(new Error(`Invalid JSON: ${e.message}`));
            }
        });
        
        python.on('error', reject);
        python.stdin.write(JSON.stringify({ type: 'current_planets' }));
        python.stdin.end();
    });
}

