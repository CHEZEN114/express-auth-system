/**
 * Swagger API 文档配置
 */
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Express 用户认证系统 API',
      version: '1.0.0',
      description: '用户认证系统的 RESTful API 文档',
      contact: {
        name: 'API 支持',
        email: 'support@example.com'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000/api/v1',
        description: '本地开发服务器'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    }
  },
  apis: ['./routes/api/*.js', './swagger/*.yaml'] // API 路由文件路径
};

const specs = swaggerJsdoc(options);

module.exports = {
  specs,
  swaggerUi
};
