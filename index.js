//required params

const AWS = require("aws-sdk");
AWS.config.update({region: "us-east-1"});
const dynamodb = new AWS.DynamoDB.DocumentClient();

//create two tables, one for each of our objects 
const dynamodbGiftTableName = "GiftCardTable";
const dynamodbPromoTableName = "PromoCodeTable";

//paths that use the gift card table
//GET (all gift cards)
const giftCardsPath = "/promotions/gift_cards";
//POST, PATCH, DELETE
const giftCardPath = "/promotions/gift_card";
//GET
const giftCardParamPath = "/promotions/gift_card/{id}";

//paths that use the promo code table
//GET (all promo codes)
const promoCodesPath = "/promotions/promo_codes";
//POST, PATCH, DELETE
const promoCodePath = "/promotions/promo_code";
//GET
const promoCodeParamPath = "/promotions/promo_code/{id}";

//Stores JSON request body for PATCH requests
let requestBody;

//handles methods
exports.handler = async function(event) {
  console.log("Request event method: ", event.httpMethod);
  console.log("EVENT\n" + JSON.stringify(event, null, 2));
  let response;
  //switch statement handles each method
  switch(true) {
      // GET involving ID path and CardParam path
    case event.httpMethod === "GET" && event.requestContext.resourcePath === giftCardParamPath:
      response = await getGiftCard(event.pathParameters.id);
      break;
      
      // GET for all Cards
    case event.httpMethod === "GET" && event.requestContext.resourcePath === giftCardsPath:
      response = await getGiftCards();
      break;
      
      // POST involving Card path
    case event.httpMethod === "POST" && event.requestContext.resourcePath === giftCardPath:
      response = await saveGiftCard(JSON.parse(event.body));
      break;
      
      // PATCH involving Card path
    case event.httpMethod === "PATCH" && event.requestContext.resourcePath === giftCardPath:
      requestBody = JSON.parse(event.body);
      response = await modifyGiftCard(requestBody.id, requestBody.updateKey,
      requestBody.updateValue);
      break;
      
      // DELETE involving ID query
    case event.httpMethod === "DELETE" && event.requestContext.resourcePath === giftCardPath:
      response = await deleteGiftCard(event.queryStringParameters.id);
      break;

      // GET involving ID path and promoCodeParam path
    case event.httpMethod === "GET" && event.requestContext.resourcePath === promoCodeParamPath:
      response = await getPromoCode(event.pathParameters.id);
      break;
      
      // GET for all Promo codes
    case event.httpMethod === "GET" && event.requestContext.resourcePath === promoCodesPath:
      response = await getPromoCodes();
      break;
      
      // POST involving Card path
    case event.httpMethod === "POST" && event.requestContext.resourcePath === promoCodePath:
      response = await savePromoCode(JSON.parse(event.body));
      break;
      
      // PATCH involving Card path
    case event.httpMethod === "PATCH" && event.requestContext.resourcePath === promoCodePath:
      requestBody = JSON.parse(event.body);
      response = await modifyPromoCode(requestBody.id, requestBody.updateKey,
      requestBody.updateValue);
      break;
      
      // DELETE involving ID query
    case event.httpMethod === "DELETE" && event.requestContext.resourcePath === promoCodePath:
      response = await deletePromoCode(event.queryStringParameters.id);
      break;
      // Request resulted in error
    default:
      response = buildResponse(404, event.requestContext.resourcePath);
  }
  return response;
}

// Gets gift card id from the referenced table
async function getGiftCard(GiftCardId) {
  const params = {
    TableName: dynamodbGiftTableName,
    Key: {
    "id": GiftCardId
    }
  }
  // Check which response code to return
  return await dynamodb.get(params).promise().then((response) => {
    return buildResponse(200, response.Item); // return success code
  }, (error) => {
    console.error("AN ERROR HAS OCCURRED; LOGGING: ", error); // return error code
  });
}

// Get all gift cards from the gift card table
async function getGiftCards() {
  const params = {
    TableName: dynamodbGiftTableName
  }
  // find all cards with given params
  const allGiftCards = await scanDynamoRecords(params, []);
  const body = {
    giftCards: allGiftCards
  }
  // return successful response code
  return buildResponse(200, body);
}
// Scan the dynamo database for an item based on the provided parameters
async function scanDynamoRecords(scanParams, itemArray) {
  try {
    const dynamoData = await dynamodb.scan(scanParams).promise();
    itemArray = itemArray.concat(dynamoData.Items); // add new item to array
    if (dynamoData.LastEvaluatedKey) {
      scanParams.ExclusiveStartkey = dynamoData.LastEvaluatedKey; 
      return await scanDynamoRecords(scanParams, itemArray);
    }
    return itemArray; // return all items found
  } catch(error) {
    console.error('AN ERROR HAS OCCURRED; LOGGING:: ', error); // return error code
  }
}

// Save a new gift card to the dynamoDB table
async function saveGiftCard(requestBody) {
  //request body is the information of our newly created gift card
  const params = {
    TableName: dynamodbGiftTableName,
    Item: requestBody
  }
  // successful request
  return await dynamodb.put(params).promise().then(() => {
    const body = {
      Operation: "SAVE",
      Message: "SUCCESS",
      Item: requestBody
    }
    return buildResponse(200, body);
  }, (error) => {
    console.error("AN ERROR HAS OCCURRED; LOGGING:: ", error); // return error code
  })
}

// Delete a gift card with the corresponding id from the database
async function deleteGiftCard(GiftCardId) {
  const params = {
    TableName: dynamodbGiftTableName,
    Key: {
      "id": GiftCardId
    },
    ReturnValues: "ALL_OLD"
  }
  // successful request
  return await dynamodb.delete(params).promise().then((response) => {
    const body = {
      Operation: "DELETE",
      Message: "SUCCESS",
      Item: response
    }
    return buildResponse(200, body);
  }, (error) => {
    console.error("AN ERROR HAS OCCURRED; LOGGING:: ", error); // error during request
  })
}

/* Update a particular gift card in the database with new data
   the GiftCardId of the card to update must be provided
   updateKey is the JSON property to update
   updateValue is the new update
   All arguments are parsed from the JSON body provided in the PATCH request
*/
async function modifyGiftCard(GiftCardId, updateKey, updateValue) {
  const params = {
    TableName: dynamodbGiftTableName,
    Key: {
      "id": GiftCardId
    },
    UpdateExpression: `set ${updateKey} = :value`,
    ExpressionAttributeValues: {
      ":value": updateValue
    },
    ReturnValues: "UPDATED_NEW"
  }
  // successful
  return await dynamodb.update(params).promise().then((response) => {
    const body = {
      Operation: "UPDATE",
      Message: "SUCCESS",
      UpdatedAttributes: response
    }
    return buildResponse(200, body);
  }, (error) => {
    console.error("AN ERROR HAS OCCURRED; LOGGING:: ", error); // unsuccessful
  })
}

// Gets promo code matching a provided PromoCodeId from the referenced table
async function getPromoCode(PromoCodeId) {
  const params = {
    // Access the Promo Code DB
    TableName: dynamodbPromoTableName,
    Key: {
    "id": PromoCodeId // get the proper promo code by matching the id
    }
  }
  // Check which response code to return
  return await dynamodb.get(params).promise().then((response) => {
    return buildResponse(200, response.Item); // return success code
  }, (error) => {
    console.error("AN ERROR HAS OCCURRED; LOGGING: ", error); // return error code
  });
}

// Get all promo codes from the promo code table
async function getPromoCodes() {
  const params = {
    // Access the Promo Code DB
    TableName: dynamodbPromoTableName
  }
  // find all cards
  const allPromoCodes = await scanDynamoRecords(params, []); // scan the entire table for all codes
  const body = {
    promoCodes: allPromoCodes
  }
  // return successful response code
  return buildResponse(200, body);
}

// Save a new promo code to the dynamoDB table
async function savePromoCode(requestBody) {
  const params = {
    // Access the Promo Code DB
    TableName: dynamodbPromoTableName,
    Item: requestBody // assign body
  }
  // successful request
  return await dynamodb.put(params).promise().then(() => {
    const body = {
      Operation: "SAVE",
      Message: "SUCCESS",
      Item: requestBody // display what was added
    }
    return buildResponse(200, body);
  }, (error) => {
    console.error("AN ERROR HAS OCCURRED; LOGGING:: ", error); // return error code
  })
}

// Delete a promo code with the corresponding PromoCodeId from the database
async function deletePromoCode(PromoCodeId) {
  const params = {
    // Access the Promo Code DB
    TableName: dynamodbPromoTableName,
    Key: {
      "id": PromoCodeId // match sent id with DB id
    },
    ReturnValues: "ALL_OLD"
  }
  // successful request
  return await dynamodb.delete(params).promise().then((response) => {
    const body = {
      Operation: "DELETE",
      Message: "SUCCESS",
      Item: response // display what was deleted
    }
    return buildResponse(200, body);
  }, (error) => {
    console.error("AN ERROR HAS OCCURRED; LOGGING:: ", error); // error during request
  })
}

/* Update a particular promo code in the database with new data
   the PromoCodeId of the promo code to update must be provided
   updateKey is the JSON property to update
   updateValue is the new update
   All arguments are parsed from the JSON body provided in the PATCH request
*/
async function modifyPromoCode(PromoCodeId, updateKey, updateValue) {
  const params = {
    // Access the Promo Code DB
    TableName: dynamodbPromoTableName,
    Key: {
      "id": PromoCodeId // match id in DB with requested id
    },
    UpdateExpression: `set ${updateKey} = :value`,
    ExpressionAttributeValues: {
      ":value": updateValue // update the value
    },
    ReturnValues: "UPDATED_NEW"
  }
  // successful
  return await dynamodb.update(params).promise().then((response) => {
    const body = {
      Operation: "UPDATE",
      Message: "SUCCESS",
      UpdatedAttributes: response
    }
    return buildResponse(200, body);
  }, (error) => {
    console.error("AN ERROR HAS OCCURRED; LOGGING:: ", error); // unsuccessful
  })
}

// Create a response with an HTTP status code and a provided JSON body
function buildResponse(statusCode, body) {
  return {
    statusCode: statusCode,
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  }
}
