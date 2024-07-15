curl -XPOST http://localhost:9200/products/bulk  -H 'Content-Type: application/json' -d '[{
  "title":"Apple Iphone X (64gb)",
  "code": "0001",
  "description": "iPhone X features a 5.8-inch Super Retina display with HDR and True Tone and 64gb RAM. iPhone X Charges wirelessly. Resists water and dust.",
  "specifications":{
    "brand": "apple",
    "model":"X",
    "camera":"16mp rear camera",
    "battery": "3400 mah",
    "storage": "64gb",
    "colour": "black",
   "modelYear": 2019
  },
  "author": "author",
  "categories": ["electronics","mobile"],
  "tags":["mobile","apple","iphone"],
  "reviewScore" : 4,
  "imageUrl": "https://images-na.ssl-images-amazon.com/images/I/51R4ZvEJUPL._SY679_.jpg",
  "price": 89000
},
{
  "title":"Apple Iphone X (128gb)",
  "code": "0002",
  "description": "iPhone X features a 5.8-inch Super Retina display with 128gb RAM, HDR and True Tone. iPhone X Charges wirelessly. Resists water and dust.",
  "specifications":{
    "brand": "apple",
    "model":"X",
    "camera":"16mp rear camera",
    "battery": "4000 mah",
    "storage": "128gb",
    "colour": "black",
   "modelYear": 2019
  },
  "author": "author",
  "categories": ["electronics","mobile"],
  "tags":["mobile","apple","iphone"],
  "reviewScore" : 1,
  "imageUrl": "https://images-na.ssl-images-amazon.com/images/I/51R4ZvEJUPL._SY679_.jpg",
  "price": 90000
}
]'
