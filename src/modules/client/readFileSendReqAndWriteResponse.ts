/* eslint-disable prefer-template */
// for requiring in .js files
/* eslint-disable import/no-unresolved */

// for vscode module being dumb
/* eslint-disable no-unused-vars */

/**
 * @module : readFileSendReqAndWriteResponse.ts
 * @author : Austin Ruby
 * @function : parse string for instances of 'graphQuill' and extract content
 * within parens immediately following each instance
 * @changelog : Ed Greenberg, November 5th, 2019, copy out boilerplate function invocation
 * to query file if not present
 * @changelog : Alex Chao, November 5th, 2019, merge conflict handling and server additions
 * @changelog : Alex Chao, November 6th, 2019, dynamic port number for fetching, coming from
 * the extension.ts file
 * @changelog : Austin Ruby, November 22nd, 2019, added url parameter to hold external server's
 * url or be undefined. if undefined, use localhost string with port from config file
 * * */

// eslint-disable-next-line import/no-unresolved
import * as vscode from 'vscode';

const fetch = require('node-fetch');
const fs = require('fs');

const extractQueries = require('./extractQueries');

function readFileSendReqAndWriteResponse(
  filePath: string,
  channel: vscode.OutputChannel,
  portNumber: number,
  rootPath: string, // passing the root path in to control the function def. injection
  url: (undefined|string),
) {
  // parse the contents of the entire filePath file to a string
  const copy = fs.readFileSync(filePath).toString();
  // if url is not undefined, user is querying external server
  // and url will be the correct url
  // otherwise use localhost with port number specified in config file
  const validatedURL: string = url || `http://localhost:${portNumber}/graphql`;
  // check if the file is within the root directory, otherwise we don't want to inject the
  // function defintion
  if (filePath.includes(rootPath) && !copy.includes('function graphQuill')) {
    const newFile = `function graphQuill() {}\n\n${copy}`;
    fs.writeFileSync(filePath, newFile);
    // }
  }

  // read user's file to parse
  // eslint-disable-next-line consistent-return
  fs.readFile(filePath, (err: Error, data: Buffer) => {
    if (err) {
      // console.log(err);
      return null;
    }
    // if no error, convert data to string and pass into gQParser to pull out query/ies
    const result: (string | Error)[] = extractQueries(data.toString());

    // send post request to API/graphql

    setTimeout(async () => {
      // handle multiple queries in file...
      // the additional quotes need to be parsed off
      // queries without quotes will be an array of either falses or objects
      // objects will have a query property that will either be a string or an instance of Error
      // and a response property that will be a string
      const queriesWithoutQuotes:
        (false|{ query: (string|Error), response: Object })[] = result.filter(
          // callback to remove empty string queries (i.e. the function def of graphQuill)
          (e: string|Error) => (typeof e === 'string' && e.length),
        ).map(
          (query: string|Error) => (
            // remove extra quotes
            // create object with query and response properties to tie queries to their responses
            typeof query === 'string' && { query: query.slice(1, query.length - 1), response: '' }
          ),
        );

      // console.log('--JUST THE QUERIES', queriesWithoutQuotes);
      // wrapping queries in Promise.all to ensure all fetches resolve before appending to channel
      const finalReqResObj = await Promise.all(
        // using map to generate array of promises
        queriesWithoutQuotes.map((reqResObj, index) => {
          // confirm object exists
          if (reqResObj) {
            // copy reqResObj to avoid mutating argument object
            const newReqResObj = { ...reqResObj };
            // destructure query off of object
            const { query } = newReqResObj;
            // using return here to return promise into Promise.all
            return fetch(validatedURL, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ query }),
            })
              .then((response: Response) => response.json())
            // adding parsed API response to newReqResObject
              .then((parsedResponse: {data: Object, errors: Object}) => {
                newReqResObj.response = parsedResponse.data || parsedResponse.errors;
                return newReqResObj;
              })
              .catch((error: Error) => {
                // console.log('fetch catch error', error, typeof error, error.constructor.name);
                // print any errors to the output channel
                channel.append(`ERROR!!!\n${JSON.stringify(error, null, 2)}`);
              });
          }
          return reqResObj;
        }),
      );

      channel.clear();
      channel.append('GraphQuill results:');
      channel.show(true);
      // iterate over array of req/res objects and append each pair to the channel
      finalReqResObj.forEach((pair) => {
        channel.append(`\nQuery:${pair.query}\nResponse:\n${JSON.stringify(pair.response, null, 2)}\n`);
      });
    }, 1);
    // append to channel to announce results (appears in channel first because of async)
  });
}

module.exports = readFileSendReqAndWriteResponse;
