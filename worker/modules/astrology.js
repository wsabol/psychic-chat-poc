import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { logErrorFromCatch } from '../../shared/errorLogger.js';

// Get the directory of this file
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Determine Python path based on OS
const getPythonPath = () => {
  if (process.platform === 'win32') {
    // Windows: use python.exe from system PATH
    return 'python.exe';
  } else {
    // Linux/Mac: use venv python
    return '/opt/venv/bin/python3';
  }
};

const PYTHON_PATH = getPythonPath();
const ASTROLOGY_SCRIPT = path.join(__dirname, '..', 'astrology.py');

export async function calculateBirthChart(birthData) {
    return new Promise((resolve, reject) => {
        const python = spawn(PYTHON_PATH, [ASTROLOGY_SCRIPT]);
        let outputData = '';
        let errorData = '';
        
        python.stdout.on('data', (data) => { outputData += data.toString(); });
        python.stderr.on('data', (data) => { errorData += data.toString(); });
        
                python.on('close', (code) => {
                        if (code !== 0) {
                reject(new Error(`Python script failed: ${errorData || outputData}`));
                return;
            }
            try {
                const result = JSON.parse(outputData);
                resolve(result);
            } catch (e) {
                logErrorFromCatch(`[ASTROLOGY] Failed to parse result:`, outputData);
                reject(new Error(`Invalid JSON: ${e.message}`));
            }
        });
        
        python.on('error', (err) => {
            logErrorFromCatch(`[ASTROLOGY] Failed to spawn Python:`, err);
            reject(err);
        });
        
        python.stdin.write(JSON.stringify(birthData));
        python.stdin.end();
    });
}

export async function getCurrentTransits(birthData) {
    return new Promise((resolve, reject) => {
        const python = spawn(PYTHON_PATH, [ASTROLOGY_SCRIPT]);
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
        const python = spawn(PYTHON_PATH, [ASTROLOGY_SCRIPT]);
        let outputData = '';
        let errorData = '';
        
        python.stdout.on('data', (data) => { outputData += data.toString(); });
        python.stderr.on('data', (data) => { errorData += data.toString(); });
        
        python.on('close', (code) => {
            if (code !== 0) {
                logErrorFromCatch(`[ASTROLOGY] Moon phase script exited with code ${code}`);
                if (errorData) logErrorFromCatch(`[ASTROLOGY] Python stderr:`, errorData);
                reject(new Error(`Python script failed: ${errorData}`));
                return;
            }
            try {
                resolve(JSON.parse(outputData));
            } catch (e) {
                logErrorFromCatch(`[ASTROLOGY] Failed to parse moon phase:`, outputData);
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
        const python = spawn(PYTHON_PATH, [ASTROLOGY_SCRIPT]);
        let outputData = '';
        let errorData = '';
        
        python.stdout.on('data', (data) => { outputData += data.toString(); });
        python.stderr.on('data', (data) => { errorData += data.toString(); });
        
        python.on('close', (code) => {
            if (code !== 0) {
                logErrorFromCatch(`[ASTROLOGY] Current planets script exited with code ${code}`);
                if (errorData) logErrorFromCatch(`[ASTROLOGY] Python stderr:`, errorData);
                reject(new Error(`Current planets failed: ${errorData}`));
                return;
            }
            try {
                resolve(JSON.parse(outputData));
            } catch (e) {
                logErrorFromCatch(`[ASTROLOGY] Failed to parse planets:`, outputData);
                reject(new Error(`Invalid JSON: ${e.message}`));
            }
        });
        
        python.on('error', reject);
        python.stdin.write(JSON.stringify({ type: 'current_planets' }));
        python.stdin.end();
    });
}

