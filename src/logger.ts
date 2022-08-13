import winston from 'winston';

const nodeEnvs = ['development', 'production'] as const;
type NodeEnv = typeof nodeEnvs[number];

//optional
export const NODE_ENV = process.env.NODE_ENV as NodeEnv;
if (NODE_ENV && !nodeEnvs.includes(NODE_ENV))
  throw new Error(
    `invalid NODE_ENV value ${NODE_ENV} (must be one of ${nodeEnvs})`,
  );

const alignColorsAndTime = winston.format.combine(
  winston.format.colorize({
    all: true,
  }),
  winston.format.label({
    label: '[LOGGER]',
  }),
  winston.format.timestamp({
    format: 'YY-MM-DD HH:mm:ss',
  }),
  winston.format.printf(
    (info) =>
      ` ${info.label}  ${info.timestamp}  ${info.level} : ${info.message}`,
  ),
);

export const logger = winston.createLogger({
  level: 'info',
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        alignColorsAndTime,
      ),
    }),
  ],
});

if (NODE_ENV === 'development') logger.transports[0].level = 'debug';
