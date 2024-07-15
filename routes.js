const express = require('express');
const router = express.Router();
const elastic = require('elasticsearch');
const Ajv = require("ajv");
const addFormat = require('ajv-formats');
const addKeyword = require('ajv-keywords');

const ajv = new Ajv({ allErrors: true, coerceAndCheckDataType: true })
addKeyword(ajv, "transform")
addFormat(ajv, { formats: ["date", "url"], keywords: true });
const winston = require('winston');
// const { coerceAndCheckDataType } = require('ajv/dist/compile/validate/dataType');
// const { default: formatsPlugin } = require('ajv-formats');
// const { formatNames } = require('ajv-formats/dist/formats');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.Console(),
  ],
});

const schema = {
  type: "object",
  properties: {
    title: { type: "string", nullable: false, minLength: 1 },
    code: { type: "string", nullable: false, minLength: 1 },
    description: { type: "string", nullable: false, minLength: 1 },
    reviewScore: { type: "integer", nullable: false, "minimum": 1, "maximum": 5 },
    price: { type: "integer", nullable: false },
    imageUrl: { type: "string", nullable: false, "format": "url" },
    tags: { type: "array", items: { type: "string", minLength: 1 }, nullable: false },
    specifications: {
      type: "object",
      properties: {
        brand: { type: "string", nullable: false, minLength: 1 },
        model: { type: "string", nullable: false, minLength: 1 },
        camera: { type: "string", nullable: false, minLength: 1 },
        battery: { type: "string", nullable: false, minLength: 1 },
        storage: { type: "string", nullable: false, minLength: 1 },
        colour: { type: "string", nullable: false, minLength: 1 },
        modelYear: { type: "string", "format": "date", nullable: false }
      },
      required: ["brand", "model", "camera", "battery", "storage", "colour", "modelYear"],

    },

  },
  required: ["title", "reviewScore", "code", "description", "imageUrl", "tags"],
  additionalProperties: true,
}


//null values should not be accepted
//format of values should be same
// if different then give error

const ajvValidate = ajv.compile(schema)
const bodyParser = require('body-parser').json();
const elasticClient = elastic.Client({
  host: 'localhost:9200',
});

// Route handler to handle POST request to '/products'
router.post('/products/validate',
  bodyParser,
  async (req, res) => {
    const product = req.body;
    logger.info(product);
    const valid = ajvValidate(product)
    logger.info("validation outcome" + valid);
    if (!valid) {
      logger.info(ajvValidate.errors)
      res.status(400).json(ajvValidate.errors)
    } else {
      res.json(product)
    }
  });



//GET method
router.get('/products/:id', async (req, res) => {
  const productId = req.params.id;
  try {
    logger.info(`Fetching product with index: ${productId}`);
    const response = await elasticClient.get({
      index: 'products',
      id: productId
    });
    if (!response.found) {
      logger.info(`Product with ID: ${productId} not found.`);
      return res.status(404).json({ error: 'Product not found' });
    }
    const product = response._source;
    logger.info(`Product retrieved: ${JSON.stringify(product)}`);
    res.json(product);
  } catch (error) {
    logger.error(`Error retrieving product with ID: ${productId}`, error);

    if (error.meta && error.meta.body) {
      const { statusCode, body } = error.meta;
      return res.status(statusCode).json({ error: body.error });
    }
    res.status(500).json({ error: 'Failed to retrieve product' });
  }
});

router.get('/nextpage', async (req, res) => {
  logger.info("fetching next page");
  const scrollId = req.query.scrollId;
  logger.info(scrollId);
  const response = await elasticClient.scroll({
    scroll_id: scrollId,
    scroll: '15m',
  });
  logger.info(response);
  res.json(response);
});


// GET all products
router.get('/products', async (req, res) => {
  try {
    logger.info('Fetching all products');
    const response = await elasticClient.search({
      index: 'products',
      scroll: "15m",
      body: {
        query: {
          match_all: {

          },
          
        },
        size:50,
        sort: [{ 'code.keyword': 'asc' }]
      },
    });
    const products = response.hits.hits.map(hit => hit._source);
    logger.info(`Products retrieved: ${products.length} items`);
    const resp = {
      total: response.hits.total.value,
      scrollId: response._scroll_id,
      page: products
    };
    logger.info(typeof resp);
    res.json(resp);
    //context.setAttribute(resp);
  } catch (error) {
    logger.error('Error retrieving all products', error);

    if (error.meta && error.meta.body) {
      const { statusCode, body } = error.meta;
      return res.status(statusCode).json({ error: body.error });
    }
    res.status(500).json({ error: 'Failed to retrieve products' });
  }
});

// GET all products containing apple
router.get('/product/search', async (req, res) => {
  const txt = req.query.txt;
  logger.info(`typeof : ${typeof txt}`)
  if (typeof txt !== 'string') {

    return res.status(400).json({ error: 'txt parameter cannot be empty' })
  }
  logger.info(req.query.txt);
  const response = await elasticClient.search({
    index: 'products',
    body: {
      query: {
        multi_match: {
          query: req.query.txt,
          fields: ["title", "brand", "tags"],
          fuzziness: "auto"
        },
      },
    }
  });

  logger.info(response);

  if (!response.error) {
    res.json(response.hits.hits.map(hit => hit._source));
  }
  else {
    res.json(`errors:${response.error}`)
  }
});

// Add a single product
router.post('/products', bodyParser, async (req, res) => {
  const product = req.body;
  const response = await elasticClient.index({
    index: 'products',
    body: product
  });
  logger.info(response);
  res.json(response)
});


// Add bulk products
router.post('/products/bulk', bodyParser, async (req, res) => {
  try {
    const product = req.body;
    const body = product.flatMap(doc => [{ index: { _index: 'products' } }, doc])
    logger.info(body);
    const bulkResponse = await elasticClient.bulk({ body })
    if (bulkResponse.errors) {
      const erroredDocuments = [];
      bulkResponse.items.forEach((action, i) => {
        const operation = object.keys(action)[0];
        if (action[operation].error) {
          erroredDocuments.push({
            status: action[operation].status,
            error: action[operation].error,
            operation: body[i * 2],
            document: body[i * 2 + 1],
          });
        }
      });
      return res.status(500).json({
        error: erroredDocuments
      });
    }
    logger.info(bulkResponse);
    res.status(200).json({
      message: 'Bulk indexing successful',
      data: bulkResponse.actions,
    });
  } catch (error) {
    logger.error('Bulk indexing failed:', error);
    res.status(500).json({ error: 'Bulk indexing failed' });
  }
});




const updateSchema = {
  type: "object",
  properties: {
    title: { type: "string", nullable: false, minLength: 1 },
    code: { type: "string", nullable: false, minLength: 1 },
    description: { type: "string", nullable: false, minLength: 1 },
    reviewScore: { type: "integer", nullable: false, "minimum": 1, "maximum": 5 },
    price: { type: "integer", nullable: false },
    imageUrl: { type: "string", nullable: false, "format": "url" },
    tags: { type: "array", items: { type: "string", minLength: 1 }, nullable: false },
    specifications: {
      type: "object",
      properties: {
        brand: { type: "string", nullable: false, minLength: 1 },
        model: { type: "string", nullable: false, minLength: 1 },
        camera: { type: "string", nullable: false, minLength: 1 },
        battery: { type: "string", nullable: false, minLength: 1 },
        storage: { type: "string", nullable: false, minLength: 1 },
        colour: { type: "string", nullable: false, minLength: 1 },
        modelYear: { type: "string", "format": "date", nullable: false }
      },
      //required: ["brand", "model", "camera", "battery", "storage", "colour", "modelYear"],

    },

  },
  //required: ["title", "reviewScore", "code", "description", "imageUrl", "tags"],
  additionalProperties: true,
}
const Validate = ajv.compile(updateSchema);

// PUT method
router.put('/products/:id', bodyParser, async (req, res) => {
  logger.info(`request body = ${req.body}`)
  const productId = req.params.id;
  const document = req.body;
  const valid = Validate(document);
  if (!valid) {
    res.status(400).json(Validate.errors)

  }
  logger.info(`productId=${productId} newName= ${req.body.name}`)
  const response = await elasticClient.update({
    index: 'products',
    id: productId,
    body: {
      doc: document
    }
  });
  logger.info(`Product with ID ${productId} updated successfully: ${response}`);
  res.json(response.body);
});




//DELETE method
router.delete('/products/:id', async (req, res) => {
  const productId = req.params.id;
  const response = await elasticClient.delete({
    index: 'products',
    id: productId
  });
  logger.info(response);
  res.json(response);
});

module.exports = router;

// - search // validation & thorough testing (fuzziness, synonyms, stemming)
// - update // validation
// - add // validation
// - write all test scenario for each api // do this in excel for thorough testing
// - pagination // only for search api
