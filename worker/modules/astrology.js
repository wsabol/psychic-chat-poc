import { spawn } from 'child_process';

/**
 * Calculate birth chart using Python astrology script
 */
export async function calculateBirthChart(birthData) {
    return new Promise((resolve, reject) => {
        const python = spawn('/opt/venv/bin/python3', ['./astrology.py']);
        let outputData = '';
        let errorData = '';
        
        python.stdout.on('data', (data) => {
            outputData += data.toString();
        });
        
        python.stderr.on('data', (data) => {
            errorData += data.toString();
        });
        
        python.on('close', (code) => {
            if (code !== 0) {
                console.error(`[ASTROLOGY] Python script exited with code ${code}`);
                if (errorData) console.error(`[ASTROLOGY] Python stderr:`, errorData);
                reject(new Error(`Python script failed: ${errorData}`));
                return;
            }
            
            try {
                const result = JSON.parse(outputData);
                if (result.error) {
                    console.warn(`[ASTROLOGY] Calculation warning: ${result.error}`);
                }
                resolve(result);
            } catch (e) {
                console.error(`[ASTROLOGY] Failed to parse result:`, outputData);
                reject(new Error(`Invalid JSON from astrology script: ${e.message}`));
            }
        });
        
        python.on('error', (err) => {
            console.error(`[ASTROLOGY] Failed to spawn Python process:`, err);
            reject(err);
        });
        
        python.stdin.write(JSON.stringify(birthData));
        python.stdin.end();
    });
}

/**
 * Get current moon phase
 */
export async function getCurrentMoonPhase() {
    return new Promise((resolve, reject) => {
        const python = spawn('/opt/venv/bin/python3', ['./astrology.py']);
        let outputData = '';
        let errorData = '';
        
        python.stdout.on('data', (data) => {
            outputData += data.toString();
        });
        
        python.stderr.on('data', (data) => {
            errorData += data.toString();
        });
        
        python.on('close', (code) => {
            if (code !== 0) {
                console.error(`[ASTROLOGY] Moon phase script exited with code ${code}`);
                if (errorData) console.error(`[ASTROLOGY] Python stderr:`, errorData);
                reject(new Error(`Python script failed: ${errorData}`));
                return;
            }
            
            try {
                const result = JSON.parse(outputData);
                resolve(result);
            } catch (e) {
                console.error(`[ASTROLOGY] Failed to parse moon phase result:`, outputData);
                reject(new Error(`Invalid JSON from astrology script: ${e.message}`));
            }
        });
        
        python.on('error', (err) => {
            console.error(`[ASTROLOGY] Failed to spawn Python process:`, err);
            reject(err);
        });
        
        python.stdin.write(JSON.stringify({ type: 'moon_phase' }));
        python.stdin.end();
    });
}
