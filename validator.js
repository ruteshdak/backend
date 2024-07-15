const {check} = require('express-validator')

module.exports={
    validatePrice:check('price').isInt().withMessage('Price must be an integer')
}