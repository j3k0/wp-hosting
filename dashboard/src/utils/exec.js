const util = require('util');
const { exec } = require('child_process');
const { logger } = require('./logger');

// Promisify exec
const execAsync = util.promisify(exec);

// Wrapper around execAsync that adds logging
async function execWithLogging(command, options = {}) {
    try {
        logger.debug('Executing command', {
            command,
            options: {
                ...options,
                // Don't log potentially sensitive env vars
                env: options.env ? Object.keys(options.env) : undefined
            }
        });

        const result = await execAsync(command, options);

        logger.debug('Command executed successfully', {
            command,
            stdout: result.stdout.substring(0, 1000), // Limit log size
            stderr: result.stderr.substring(0, 1000),
            code: result.code
        });

        return result;
    } catch (error) {
        logger.error('Command execution failed', {
            command,
            error: {
                message: error.message,
                code: error.code,
                signal: error.signal,
                stdout: error.stdout?.substring(0, 1000),
                stderr: error.stderr?.substring(0, 1000)
            }
        });
        throw error;
    }
}

module.exports = {
    execAsync: execWithLogging
}; 