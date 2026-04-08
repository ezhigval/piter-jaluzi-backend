const levels = { info: '✅', warn: '⚠️', error: '❌', debug: '🔍' };

export const log = (level, module, message, data = null) => {
    const time = new Date().toISOString().slice(11, 19);
    const prefix = `[${time}] ${levels[level] || '•'} [${module.toUpperCase()}]`;
    console.log(`${prefix} ${message}`);
    if (data) console.debug(`${prefix} Data:`, data);
};

export const error = (module, err, context = '') => {
    log('error', module, `${context} ${err.message}`);
    if (err.stack) console.debug(err.stack);
};