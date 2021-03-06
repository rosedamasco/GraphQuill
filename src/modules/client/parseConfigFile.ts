/* eslint-disable no-unused-vars */
// these rules are disabled for the weird require that is inside of the function
/* eslint-disable global-require */
/* eslint-disable import/no-dynamic-require */

/**
 * @author : Alex Chao
 * @function : return an object with the entryPoint and the allowServerTimeoutConfigSetting
 * @param : none
 * @returns : an array with the root directory AND the entryPoint strings
 * @changelog : Austin Ruby, Nov. 22nd, 2019: added logic to not append rootpath to
 * entrypoint if entrypoint is external url
 * * */

// eslint-disable-next-line import/no-unresolved
import * as vscode from 'vscode';

// const path = require('path');
const fs = require('fs');
const path = require('path');

function parseConfigFile(rootPath: string) {
  // find config file in root directory
  const gqConfigFilePath = `${rootPath}/graphquill.config.js`;

  // ! a cached version of this file will be stored here, so future invocations that are trying
  // to get results of an updated config file, will appear to not have been changed
  delete require.cache[gqConfigFilePath];

  let entryPoint : string;
  let allowServerTimeoutConfigSetting : number|undefined;
  let portNumber: number;

  if (fs.existsSync(gqConfigFilePath)) {
    // if the config file exists, require it in (will come in as an object)
    const configObject = require(`${gqConfigFilePath}`);
    // console.log('config object in parseconfigfile.ts', configObject);

    // if the entrypoint is an external url, set entryPoint to that url
    // otherwise set the entry point to the absolute path (root + relative entry path)
    entryPoint = configObject.entry.slice(0, 4) === 'http'
      ? configObject.entry
      : path.resolve(rootPath, configObject.entry);

    // set the portnumber
    portNumber = configObject.portNumber;

    // set the servertimeout config setting
    allowServerTimeoutConfigSetting = configObject.serverStartupTimeAllowed;
  } else {
    // if config file is not found, return an empty string,
    // error handle on the other side
    entryPoint = '';
    portNumber = 0;

    // the error handling if no config file is found will be done in the outer extension.ts file
    // based on if the entryPoint value is falsey (empty string)
  }

  // return an object with the results, to be destrucutred when the function is invoked
  return { entryPoint, portNumber, allowServerTimeoutConfigSetting };
}

module.exports = parseConfigFile;
