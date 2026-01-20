/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.addColumns('user_settings', {
        llm_model: {
            type: 'text',
            default: null
        }
    });
};

exports.down = pgm => {
    pgm.dropColumns('user_settings', ['llm_model']);
};
